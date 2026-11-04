# Supabase Dashboard setup

Apply SQL migrations from `supabase/migrations/` in order via **SQL Editor** or `supabase db push`.

## Authentication

1. **Authentication → Providers → Email**: enable email/password.
2. **Authentication → Settings**: disable **Enable sign ups** (open registration off).

## Test users

Create three users (**Authentication → Users → Add user**):

| Email | Role in `profiles` |
|-------|---------------------|
| planner@example.com | `planner` |
| executor1@example.com | `executor` (default from trigger) |
| executor2@example.com | `executor` |

After creating users, set planner role:

```sql
UPDATE public.profiles
SET role = 'planner', full_name = 'Постановщик'
WHERE email = 'planner@example.com';

UPDATE public.profiles SET full_name = 'Исполнитель 1' WHERE email = 'executor1@example.com';
UPDATE public.profiles SET full_name = 'Исполнитель 2' WHERE email = 'executor2@example.com';
```

Use your own passwords; share credentials with reviewers outside git.

## Demo data (optional)

See commented examples in [supabase/migrations/003_seed_template.sql](migrations/003_seed_template.sql).
