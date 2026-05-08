# Backlog

Open work items, grouped by theme. The first section ("Platform
direction") is the active strategic effort. Sections below it are
tactical fixes for the current single-event app — still wanted, but
secondary until the platform reframe is scoped.

## Platform direction

Today's app is a single-session "Up and Down the River" tournament.
The goal is to reframe it as one *type* of event inside a broader
event-management platform.

### Event types we want to support

- **Tournament — Up and Down the River** (today's flow). One-day,
  single-session, on-court rotation.
- **Tournament — other formats.** Brackets, round-robin, pro-am, etc.
  Up and Down becomes one option in a "tournament format" picker.
- **Event.** A scheduled one-off with pre-event sign-ups (RSVPs),
  optional payment / charity collection, optional brackets. The
  current tournament flow becomes the on-the-day step of an event.
- **Social.** Recurring or drop-in casual play. Sub-variants worth
  carrying:
  - drop-in mixer with no permanent record;
  - recurring social where regulars check in and per-player stats
    persist across sessions;
  - RSVP social — organizer posts a date, players sign up, organizer
    confirms, then runs the session.
- **League.** Definition still open — see "Open questions" below.
  Likely one of: multi-week season w/ fixed schedule, ladder / ranked
  challenge, or aggregated round-robin across multiple sessions.

### What this implies

- **Domain reshape.** Introduce a top-level entity (working name
  `Event`) that owns the per-day session(s). Today's `tournament` /
  `players` / `courts` / `history` become a sub-document of one event.
- **Real backend.** `public/tennis-save.php` (single JSON blob per
  6-char code) won't carry leagues, RSVPs, multi-session standings,
  or persistent player identities. Need a proper service with a
  database, accounts, and auth.
- **Two UIs that don't exist yet.**
  - *Organizer / management UI* — dashboard listing events across
    types, their statuses, upcoming sessions, sign-up review,
    historical results.
  - *Player-facing UI* — discover events, RSVP, see schedule, view
    standings, look up own stats.
- **Migration path for today's flow.** The 6-char-room "guest" mode
  is genuinely useful (no account, fast setup). Decide whether it
  stays as an unauthenticated quick-start, or whether everything
  becomes account-bound.

### Open questions (need answers before design)

- **League shape.** Multi-week season, ladder, or session aggregator?
  Or all three as sub-types?
- **Backend hosting.** Stay on WP Engine (PHP + managed MySQL) so
  the deploy story stays one-click, or move to a dedicated service
  (e.g. Node/Postgres) hosted separately and embedded via the same
  shortcode?
- **Auth model.** Reuse WordPress accounts (single sign-on with the
  surrounding site), magic-link by email, or an independent user db?
- **Multi-tenant.** One app instance per club / organization, or one
  platform that serves many clubs (with per-club roles)?
- **Stats model.** Are wins/losses scoped per-event, per-season, or
  also rolled up to a per-player lifetime record? Affects the data
  model significantly.

### Phasing (proposed — not committed)

1. **Domain refactor in place.** Introduce an `Event` shell around the
   current state without changing UI; existing rooms still work.
2. **Backend bootstrap.** Stand up the chosen service with `Event`
   CRUD; migrate room save/load to it; keep PHP endpoint as a
   fallback during transition.
3. **First new event type.** Pick the smallest one that earns its
   keep — likely "Event with RSVPs" since it's the closest extension
   of today's tournament flow.
4. **Organizer dashboard.** List of events; create/edit metadata.
5. **Second event type** (Social or League, depending on demand).
6. **Player-facing UI** comes after at least two event types exist.

## Correctness & UX gaps

- **`genderMix` is wired but ignored.** Setup collects `open / mens /
  womens / mixed`, but neither `generateInitialCourts` nor
  `shuffleCourts` (`src/utils/shuffle.js`) reads it. At minimum,
  "Mixed" should try to put one M and one F on each doubles team;
  "Men's" / "Women's" should restrict the eligible pool.
- **No bye / sit-out handling.** `Roster.handleGenerate` requires
  `checkedIn % playersPerCourt === 0` exactly. Need a sit-out queue
  that rotates fairly across rounds, plus surfacing of the
  `byePlayers` array `shuffleCourts` already returns (always empty
  today).
- **Partner repetition.** "Up and Down the River" as implemented
  always produces the same `[a,c]` / `[b,d]` split — same partners
  recur. Add a partner-rotation rule (or simple shuffle within the
  pair) so people don't play with the same partner three rounds in a
  row.
- **No undo for `NEXT_ROUND`.** Snapshots are pushed into
  `state.history`, but nothing reads them. A misclicked W/L is
  permanent — wins/losses are baked in. Add an "undo last round"
  action and ideally a history viewer.
- **`RESET` action has no UI.** Reducer supports it; nothing
  dispatches it. Add a "Start over" button (with a confirm) somewhere
  sensible — probably the setup screen if a saved state is detected.
- **Check-in changes mid-round don't rebalance.** If a player checks
  out between rounds, `shuffleCourts` keeps their slot.

## Rooms / shared-session hardening

- **Concurrent edit races.** Two organizers on the same room silently
  overwrite each other (1.5 s debounced autosave, last writer wins).
  Add an `updatedAt` / version field, return it from PHP, refuse POST
  if stale; surface a "someone else updated this room — reload?"
  banner.
- **Open save endpoint.** `tennis-save.php` accepts any 6-char code
  with `Access-Control-Allow-Origin: *`, no auth, no rate limiting.
  At minimum: rate-limit by IP, add an optional write-key returned
  on room creation, and 404 GETs without a key for private rooms.
- **No room expiry / cleanup.** Files in `tennis-data/` accumulate
  forever. Add a TTL (e.g. delete files older than 30 days) — either
  a cron-style PHP sweep or piggyback on every POST.
- **Local dev can't exercise rooms.** `npm run dev` has no PHP
  endpoint, so room save/load silently fails. Add a tiny Vite dev
  middleware (or a `vite.config.js` proxy + a node mock) so rooms
  work locally.
- **Code collisions on create.** `generateRoomCode` doesn't check
  whether the code already exists before overwriting. Probability is
  low (~1 in a billion) but the failure mode is silent data loss.

## Build / runtime / deploy

- **Tailwind via CDN.** `cdn.tailwindcss.com` is officially "for
  development only" (per Tailwind's docs), ships its full runtime
  to every visitor, and is one outage away from a broken page.
  Move to a built CSS file: install `tailwindcss`, generate `app.css`
  alongside `app.js`, update `wordpress-shortcode.php` to enqueue it.
- **No README.** A human landing on the repo sees nothing — only
  `CLAUDE.md`. Even a short README with the WP install steps would
  help. (Don't duplicate `CLAUDE.md`; link to it.)

## Quality scaffolding

- **No tests.** The reducer (`useTournament.js`) and `shuffle.js` are
  pure functions and high-leverage to test. Add Vitest with a small
  suite covering: `ADD_PLAYER`, `MOVE_PLAYER`, `NEXT_ROUND` win/loss
  aggregation, `generateInitialCourts` snake-draft, `shuffleCourts`
  up/down movement.
- **No linter.** Add ESLint with the React config. Catches the kind
  of small mistakes a single reviewer misses.
- **No CI gating.** `.github/workflows/deploy.yml` only deploys; it
  doesn't run typecheck / lint / tests first. Add a `ci.yml` that
  runs on PRs and gates `deploy.yml` on its success.

## Smaller polish

- Print view auto-fires `window.print()` 500 ms after mount; on
  larger rosters the page may not be done laying out. Trigger after
  fonts/images are ready, or on user click only.
- Many icon-only buttons (🔗, 💾, ✎, ✓, ✗, ×) have no `aria-label`.
- `tournament.numCourts` clamps 1–14 in Setup but nothing else
  enforces it; loaded JSON could carry any value.
