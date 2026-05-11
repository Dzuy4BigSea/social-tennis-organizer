# Vinoy Tennis — project context for Claude Code

Read this before doing anything else in this repo. If anything in here
contradicts something you find in the code, the code wins and this
file is stale — flag it.

## What this is

The "Feed-in" tournament organizer for Vinoy Tennis. Vite + React 18,
Tailwind via CDN, dnd-kit for drag-and-drop. Deployed as a Docker
image to Hostinger via GitHub Actions + GHCR.

Originally a single-file PHP backend persisted state per "room code".
Mid-2026 we started moving it to Supabase for auth + storage; that
migration is structurally complete (Phases 1-3) — the PHP files are
still in the image but the React app no longer talks to them.

## Stack and key files

- `src/store/useTournament.js` — the reducer and the
  load/save/poll/beacon hook. The entire app's mutable state lives
  here. Touch with care.
- `src/utils/share.js` — room-code helpers (`generateRoomCode`,
  URL hash, localStorage recent-rooms list). The three I/O functions
  (`loadFromRoom`, `saveToRoom`, `saveToRoomBeacon`) now delegate to
  `src/lib/events.js` — they're the only Supabase-touching code paths
  in the runtime state machine.
- `src/lib/supabase.js` — singleton Supabase client. URL + anon key
  are baked in with `VITE_SUPABASE_*` env overrides; they're
  publishable values, intentionally in source.
- `src/lib/events.js` — Supabase event CRUD. Maps the 6-char room
  code identity onto `events` / `event_join_codes` / `event_state`.
  First-time save does three sequential inserts; later saves are an
  upsert.
- `src/components/Auth.jsx` — sign-in screen. App shows it when there
  is no Supabase session.
- `src/components/SiteFooter.jsx` — fixed-position Vinoy Park Hotel
  sketch watermark (`mix-blend-multiply`, opacity 0.75, `-z-10`) plus
  the "Purpose Built by Big Sea" attribution.
- `supabase/migrations/0001_init.sql`, `0002_rls.sql` — schema and
  RLS. Applied to the live project; do not edit in place — write a
  new `0003_*.sql` if the schema needs to change.
- `supabase/seed.sql` — one-off bootstrap that creates a club and
  grants the named user `head_pro`. Already run for `dzuy@bigsea.co`.
- `tennis-save.php` (built into the image via `Dockerfile`) — legacy
  PHP backend. **Not called** by the React app anymore. Safe to
  delete once we're confident nothing references it.

## Supabase

- Project ref: `qesqaddkqwveyxnlxrgr`
- Schema: `clubs`, `profiles`, `roles` (`head_pro` / `pro` /
  `member`), `people` (CSV + inline both feed one table), `events`,
  `event_participants`, `event_collaborators`, `event_state`
  (single-row jsonb mirror of `useTournament` state), and
  `event_join_codes` (maps room code → event uuid).
- RLS enforces club membership via `has_club_role` /
  `is_event_editor` SECURITY DEFINER helpers (so they can read
  `roles` without recursing through that table's own policies).
- Bootstrap: head pro is `dzuy@bigsea.co` in club "My Club".

## Deployment

The image is published to `ghcr.io/dzuy4bigsea/social-tennis-organizer:latest`
by `.github/workflows/deploy.yml` on every push to `main` (PRs don't
trigger a build — the squash-merge is what produces `:latest`).

On the Hostinger VPS, the compose file lives at
`/root/feedin/docker-compose.yml`. Redeploy:

```
cd /root/feedin && docker compose pull && docker compose up -d
```

There is **no auto-deploy yet** — the VPS only pulls when someone
SSHes in and runs the command. See the follow-ups section.

The Vite bundle is content-hashed (`app-[hash].js`) so browsers can't
serve a stale `app.js` after a deploy. Older versions of this repo
hard-coded `app.js`, which led to a memorable afternoon of "the new
code is on the server but the browser disagrees."

## Branches and PR flow

- Each Claude session works on its own branch
  `claude/<descriptive>-<suffix>`. The branch for the session that
  built Supabase phases 1-3 was `claude/tennis-tournament-app-AhvWF`;
  pick a new name for new work.
- PRs always squash-merge. After a squash-merge the source branch's
  pre-squash commits look like conflicts on the next PR — they're
  the same content under different SHAs.
- The dance to recover from that: rebase the feature branch onto
  `origin/main` and force-push.
  ```
  git fetch origin main
  git reset --hard origin/main
  git cherry-pick <new commits>
  git push --force-with-lease origin <branch>
  ```
  Only do this on a feature branch — never on `main`.

## Local checks

- `npm run build` — full Vite production build. Use this as a
  syntax/typing canary; there is no test suite or linter yet.
- There's no local dev story yet on mobile-only setups; iteration is
  edit → commit → merge → pull on the VPS.

## Status of the Supabase migration

- ✅ **Phase 1** — schema + RLS in Supabase, seeded with the head pro.
- ✅ **Phase 2** — auth gate. App shows `<Auth />` when there's no
  session; otherwise the existing screens.
- ✅ **Phase 3** — data layer. `useTournament` is unchanged; the
  three I/O functions in `share.js` now go through `events.js`.
- ⏭ **Phase 4 (not started)** — see follow-ups.

## Known follow-ups

- **Supabase Site URL is still `localhost:3000`.** Password-recovery
  emails point at it and don't load. Fix in
  Supabase → Authentication → URL Configuration. Set both Site URL
  and the Redirect URLs allowlist to the actual public URL.
- **Auto-deploy.** `deploy.yml` only builds + pushes the image. Two
  reasonable options:
  - Append an `appleboy/ssh-action` step that SSHes into the VPS
    and runs `docker compose pull && docker compose up -d`. Needs
    `VPS_HOST` / `VPS_USER` / `VPS_SSH_KEY` repo secrets and a
    deploy-only user on the VPS.
  - Add Watchtower as a sidecar in `docker-compose.yml`. It polls
    GHCR for new digests and restarts the `feedin` container when
    one appears. No GitHub-side credentials required.
- **PIN UI cleanup.** `PinGate`, `getStoredPin`, etc. in
  `src/components/PinGate.jsx`, `Setup.jsx`, `LiveBoard.jsx` are
  inert at the network layer but still appear in the UI. Tear them
  out and let the Supabase auth gate be the only access check.
- **`public/vinoy-hotel-sketch.png` is 637 KB.** Run it through
  `pngquant`/`optipng`/`oxipng` — probably gets to ~150-200 KB
  without visible quality loss.
- **Atomic event creation.** `saveEventByCode` does three sequential
  inserts on first save (events, event_join_codes, event_state). If
  the second or third fails we'd leave an orphan row. Fold them into
  a single Postgres RPC.
- **The PHP backend is still in the Docker image.** Drop the PHP
  install + `tennis-save.php` from the `Dockerfile` once we're
  confident no one's hitting it. Apache becomes nginx/static at that
  point and the container shrinks.

## Things to know that aren't obvious from the code

- The `roomCode` is the user-facing identity throughout. Internally
  it maps to an event uuid via `event_join_codes`. The reducer
  doesn't know events exist.
- `localStorage` is the source of truth on a device until the
  debounced save (1.2 s) lands. If a user creates an event and
  closes the tab before the save fires, the `pagehide` beacon flush
  in `useTournament` is the last line of defense.
- The 5-second poll in `useTournament` re-fetches event state and
  re-dispatches `LOAD_STATE` when remote differs. It explicitly
  skips when there are unsaved local edits (`dirtyRef.current`),
  otherwise a 403 save would silently lose typing.
- The Vinoy Hotel sketch is `position: fixed` at viewport bottom
  with `-z-10`; this only stays behind content because nothing above
  it in the React tree creates a negative-z-piercing stacking context.
  If you wrap the app in `isolation: isolate` or similar, the
  watermark stops being a watermark.

## Anti-patterns to avoid

- Don't edit applied migrations (`0001_init.sql`, `0002_rls.sql`) —
  add a new one.
- Don't force-push `main`. The PR flow handles main; only feature
  branches get the rebase-and-force dance.
- Don't introduce a service worker or aggressive HTTP caching headers
  without coordinating with the content-hash bundle naming, or we'll
  reproduce the cache problem we just solved.
- Don't ship code that calls `tennis-save.php`. The endpoint exists
  in the image but is unmanaged — use `src/lib/events.js` instead.
