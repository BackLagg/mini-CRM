# Мини-CRM «Объекты и задачи»

React + TypeScript + Supabase. Тестовое задание: объекты (стройки), задачи, роли постановщик/исполнитель, RLS в Postgres.

## Быстрый старт

```bash
npm install
cp .env.example .env   # заполните ключи Supabase
npm run dev
```

Переменные окружения:

| Переменная | Описание |
|------------|----------|
| `VITE_SUPABASE_URL` | URL проекта Supabase |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Anon / publishable key (только фронт) |

`DB_PASS` — только для Supabase CLI локально, **не** добавляйте в Vercel и не коммитьте.

## База данных

SQL-миграции: [supabase/migrations/](supabase/migrations/) — применить по порядку в SQL Editor или через `supabase db push`.

Инструкция по пользователям и demo-данным: [supabase/README.md](supabase/README.md).

## Скрипты

| Команда | Назначение |
|---------|------------|
| `npm run dev` | Локальная разработка |
| `npm run build` | Production-сборка |
| `npm run preview` | Просмотр сборки |
| `npm run lint` | Oxlint |

## Деплой (Vercel)

1. Импортируйте репозиторий в Vercel.
2. Framework: Vite, build: `npm run build`, output: `dist`.
3. Environment: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`.
4. [vercel.json](vercel.json) настроен для SPA (rewrite на `index.html`).

## Маршруты

- `/login` — вход
- `/objects` — список объектов
- `/objects/:siteId` — объект и задачи
- `/tasks/:taskId` — карточка задачи и история
- `/my-tasks` — задачи исполнителя

## Документация для сдачи

- [docs/EXPLANATION.md](docs/EXPLANATION.md) — объяснение для руководителя
- [docs/DECISIONS.md](docs/DECISIONS.md) — решения и допущения

## Тестовые аккаунты

Создайте в Supabase (см. supabase/README). Логины и пароли передавайте проверяющим **вне** git.
