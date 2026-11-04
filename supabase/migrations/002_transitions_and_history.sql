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
