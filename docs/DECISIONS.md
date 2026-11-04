# Решения и допущения

## Архитектура

- **RTK Query** (`fakeBaseQuery` + `@supabase/supabase-js`) для всех запросов к Supabase.
- Смена статуса только через RPC **`transition_task`**; прямой `UPDATE status` блокируется триггером.
- История полей (**`task_field_history`**) — сверх минимума ТЗ, по запросу заказчика: правки постановщика видны в ленте задачи.

## Безопасность

- RLS на `profiles`, `sites`, `tasks`, `task_status_history`, `task_field_history`.
- INSERT в таблицы истории для роли `authenticated` отозван; пишут только триггеры/RPC с `SECURITY DEFINER`.
- Клиент использует только `VITE_*` ключи; `DB_PASS` не попадает во фронт.

## UI / UX

- Русский интерфейс; оценка «дизайна» не цель — аккуратный MUI.
- Постановщик редактирует задачу в любом статусе (поля), статус — только кнопками перехода.

## Supabase

- При создании пользователя в Auth автоматически создаётся профиль с ролью `executor`; постановщика назначают SQL/Dashboard.
- Publishable key из Dashboard используется как клиентский ключ; при проблемах можно заменить на classic anon key (см. `.env.example`).
- Demo-seed — шаблон в `003_seed_template.sql`, UUID пользователей подставляются вручную.
