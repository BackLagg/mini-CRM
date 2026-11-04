-- Mini-CRM: schema, helpers, RLS

CREATE TYPE public.user_role AS ENUM ('planner', 'executor');

CREATE TYPE public.task_status AS ENUM (
  'new',
  'in_progress',
  'in_review',
  'accepted',
  'rework'
);

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text,
  role public.user_role NOT NULL DEFAULT 'executor',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.sites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  address text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  site_id uuid NOT NULL REFERENCES public.sites (id) ON DELETE CASCADE,
  assignee_id uuid NOT NULL REFERENCES public.profiles (id),
  author_id uuid NOT NULL REFERENCES public.profiles (id),
  status public.task_status NOT NULL DEFAULT 'new',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.task_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks (id) ON DELETE CASCADE,
  actor_id uuid NOT NULL REFERENCES public.profiles (id),
  from_status public.task_status,
  to_status public.task_status NOT NULL,
  comment text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.task_field_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks (id) ON DELETE CASCADE,
  actor_id uuid NOT NULL REFERENCES public.profiles (id),
  field_name text NOT NULL,
  old_value text,
  new_value text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_tasks_site_id ON public.tasks (site_id);
CREATE INDEX idx_tasks_assignee_id ON public.tasks (assignee_id);
CREATE INDEX idx_task_status_history_task_id ON public.task_status_history (task_id);
CREATE INDEX idx_task_field_history_task_id ON public.task_field_history (task_id);

-- Helpers
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS public.user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_planner()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'planner'::public.user_role
  );
$$;

CREATE OR REPLACE FUNCTION public.can_view_task(p_task_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = p_task_id
      AND (
        public.is_planner()
        OR t.assignee_id = auth.uid()
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER sites_set_updated_at
  BEFORE UPDATE ON public.sites
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER tasks_set_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_field_history ENABLE ROW LEVEL SECURITY;

-- profiles
CREATE POLICY profiles_select_planner ON public.profiles
  FOR SELECT TO authenticated
  USING (public.is_planner());

CREATE POLICY profiles_select_self ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY profiles_update_self ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid() AND role = (SELECT role FROM public.profiles WHERE id = auth.uid()));

-- sites
CREATE POLICY sites_planner_all ON public.sites
  FOR ALL TO authenticated
  USING (public.is_planner())
  WITH CHECK (public.is_planner());

CREATE POLICY sites_executor_select ON public.sites
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.site_id = sites.id AND t.assignee_id = auth.uid()
    )
  );

-- tasks
CREATE POLICY tasks_planner_all ON public.tasks
  FOR ALL TO authenticated
  USING (public.is_planner())
  WITH CHECK (public.is_planner());

CREATE POLICY tasks_executor_select ON public.tasks
  FOR SELECT TO authenticated
  USING (assignee_id = auth.uid());

-- history: read only if task visible
CREATE POLICY task_status_history_select ON public.task_status_history
  FOR SELECT TO authenticated
  USING (public.can_view_task(task_id));

CREATE POLICY task_field_history_select ON public.task_field_history
  FOR SELECT TO authenticated
  USING (public.can_view_task(task_id));

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sites TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasks TO authenticated;
GRANT SELECT ON public.task_status_history TO authenticated;
GRANT SELECT ON public.task_field_history TO authenticated;

GRANT EXECUTE ON FUNCTION public.is_planner() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_view_task(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(COALESCE(NEW.email, 'user'), '@', 1)),
    'executor'::public.user_role
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
-- Status transitions (RPC), field history, immutable audit tables

CREATE OR REPLACE FUNCTION public.tasks_block_direct_status_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    IF current_setting('crm.allow_status_change', true) IS DISTINCT FROM '1' THEN
      RAISE EXCEPTION 'Status must be changed via transition_task()';
    END IF;
  END IF;

  IF public.is_planner() THEN
    RETURN NEW;
  END IF;

  IF OLD.status IS DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Executors cannot edit task fields directly';
END;
$$;

CREATE TRIGGER tasks_block_status_and_executor_edit
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.tasks_block_direct_status_change();

CREATE OR REPLACE FUNCTION public.tasks_log_field_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_planner() THEN
    RETURN NEW;
  END IF;

  IF OLD.title IS DISTINCT FROM NEW.title THEN
    INSERT INTO public.task_field_history (task_id, actor_id, field_name, old_value, new_value)
    VALUES (NEW.id, auth.uid(), 'title', OLD.title, NEW.title);
  END IF;

  IF OLD.description IS DISTINCT FROM NEW.description THEN
    INSERT INTO public.task_field_history (task_id, actor_id, field_name, old_value, new_value)
    VALUES (NEW.id, auth.uid(), 'description', OLD.description, NEW.description);
  END IF;

  IF OLD.assignee_id IS DISTINCT FROM NEW.assignee_id THEN
    INSERT INTO public.task_field_history (task_id, actor_id, field_name, old_value, new_value)
    VALUES (NEW.id, auth.uid(), 'assignee_id', OLD.assignee_id::text, NEW.assignee_id::text);
  END IF;

  IF OLD.site_id IS DISTINCT FROM NEW.site_id THEN
    INSERT INTO public.task_field_history (task_id, actor_id, field_name, old_value, new_value)
    VALUES (NEW.id, auth.uid(), 'site_id', OLD.site_id::text, NEW.site_id::text);
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER tasks_log_field_changes
  AFTER UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.tasks_log_field_changes();

CREATE OR REPLACE FUNCTION public.tasks_log_initial_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.task_status_history (task_id, actor_id, from_status, to_status, comment)
  VALUES (NEW.id, NEW.author_id, NULL, NEW.status, NULL);
  RETURN NEW;
END;
$$;

CREATE TRIGGER tasks_log_initial_status
  AFTER INSERT ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.tasks_log_initial_status();

CREATE OR REPLACE FUNCTION public.transition_task(
  p_task_id uuid,
  p_new_status public.task_status,
  p_comment text DEFAULT NULL
)
RETURNS public.tasks
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_task public.tasks;
  v_from public.task_status;
  v_uid uuid := auth.uid();
  v_role public.user_role;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  v_role := public.current_user_role();
  IF v_role IS NULL THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF NOT public.can_view_task(p_task_id) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT * INTO v_task FROM public.tasks WHERE id = p_task_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  v_from := v_task.status;

  IF v_from = p_new_status THEN
    RAISE EXCEPTION 'Status unchanged';
  END IF;

  IF v_from = 'new' AND p_new_status = 'in_progress' THEN
    IF v_role <> 'executor' OR v_task.assignee_id <> v_uid THEN
      RAISE EXCEPTION 'Not authorized';
    END IF;
  ELSIF v_from = 'in_progress' AND p_new_status = 'in_review' THEN
    IF v_role <> 'executor' OR v_task.assignee_id <> v_uid THEN
      RAISE EXCEPTION 'Not authorized';
    END IF;
  ELSIF v_from = 'in_review' AND p_new_status = 'accepted' THEN
    IF NOT public.is_planner() THEN
      RAISE EXCEPTION 'Not authorized';
    END IF;
  ELSIF v_from = 'in_review' AND p_new_status = 'rework' THEN
    IF NOT public.is_planner() THEN
      RAISE EXCEPTION 'Not authorized';
    END IF;
    IF p_comment IS NULL OR btrim(p_comment) = '' THEN
      RAISE EXCEPTION 'Comment required for rework';
    END IF;
  ELSIF v_from = 'rework' AND p_new_status = 'in_progress' THEN
    IF v_role <> 'executor' OR v_task.assignee_id <> v_uid THEN
      RAISE EXCEPTION 'Not authorized';
    END IF;
  ELSE
    RAISE EXCEPTION 'Not authorized';
  END IF;

  PERFORM set_config('crm.allow_status_change', '1', true);

  UPDATE public.tasks
  SET status = p_new_status, updated_at = now()
  WHERE id = p_task_id;

  INSERT INTO public.task_status_history (task_id, actor_id, from_status, to_status, comment)
  VALUES (p_task_id, v_uid, v_from, p_new_status, p_comment);

  SELECT * INTO v_task FROM public.tasks WHERE id = p_task_id;
  RETURN v_task;
END;
$$;

REVOKE ALL ON FUNCTION public.transition_task(uuid, public.task_status, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.transition_task(uuid, public.task_status, text) TO authenticated;

-- Block direct writes to history from clients (only SELECT policies exist; no INSERT for authenticated)
REVOKE INSERT, UPDATE, DELETE ON public.task_status_history FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.task_field_history FROM authenticated;
-- Allow reading profile names for co-participants on visible tasks
CREATE POLICY profiles_select_task_peers ON public.profiles
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE (
        t.assignee_id = auth.uid()
        OR public.is_planner()
      )
      AND (t.author_id = profiles.id OR t.assignee_id = profiles.id)
    )
  );
