# Supabase setup

The React app talks to the project defined here. Phases 1-3 stood up the
schema, RLS, and the data layer; Phase 4 added the atomic event-creation
RPC in `migrations/0003_create_event_atomic.sql`.

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
- `migrations/0003_create_event_atomic.sql` – `create_event_with_code`
  RPC. Single-transaction insert of `events` + `event_join_codes` +
  `event_state` so a failed second/third write doesn't leave an orphan.
  SECURITY DEFINER; explicit pro/head_pro check inside the function.
- `seed.sql` – bootstrap one club + your head_pro role.
