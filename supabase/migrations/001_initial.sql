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
