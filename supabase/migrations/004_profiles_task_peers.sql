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
