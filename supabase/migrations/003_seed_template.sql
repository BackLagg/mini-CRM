-- Run manually in SQL Editor AFTER creating auth users and profiles.
-- Replace UUIDs and emails with your test accounts.

/*
-- Example: set planner role
UPDATE public.profiles SET role = 'planner', full_name = 'Постановщик'
WHERE email = 'planner@example.com';

-- Example sites
INSERT INTO public.sites (title, address) VALUES
  ('ЖК Северный', 'ул. Строителей, 1'),
  ('Бизнес-центр Омега', 'пр. Центральный, 45'),
  ('Склад №3', 'ш. Объездное, 12');

-- Example tasks (use real profile ids)
INSERT INTO public.tasks (title, description, site_id, assignee_id, author_id, status)
SELECT
  'Подготовка фундамента',
  'Проверить грунт и разметку',
  s.id,
  executor1.id,
  planner.id,
  'new'::public.task_status
FROM public.sites s
CROSS JOIN (SELECT id FROM public.profiles WHERE email = 'executor1@example.com') executor1
CROSS JOIN (SELECT id FROM public.profiles WHERE email = 'planner@example.com') planner
WHERE s.title = 'ЖК Северный'
LIMIT 1;
*/
