# Supabase setup

Phase 1 of the migration off the PHP backend. The React app is unchanged for
now; this directory just stands up the database the app will eventually point
at.

## One-time setup

1. Install the CLI: `npm i -g supabase` (or `brew install supabase/tap/supabase`).
2. Link this folder to the project:
   ```
   supabase link --project-ref qesqaddkqwveyxnlxrgr
   ```
3. Apply migrations:
   ```
   supabase db push
   ```
4. Sign up once through the Supabase Auth UI (or the app, in Phase 3) so an
   `auth.users` row exists for you.
5. Edit `seed.sql`, replace `REPLACE_ME@example.com` with your email, then run:
   ```
   supabase db execute --file supabase/seed.sql
   ```
   That creates a club, links your profile to it, and grants you `head_pro`.

## What's in here

- `migrations/0001_init.sql` – schema (clubs, profiles, roles, people, events,
  participants, collaborators, state, join codes) plus the `auth.users` →
  `profiles` trigger.
- `migrations/0002_rls.sql` – row-level security policies and the
  `has_club_role` / `is_event_editor` helpers.
- `seed.sql` – bootstrap one club + your head_pro role.

## What's intentionally not here yet

No app code touches Supabase yet. Phase 3 will swap the in-memory store for
Supabase queries in a single pass; running both backends in parallel isn't
worth the complexity.
