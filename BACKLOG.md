# Backlog

Open work items, grouped by theme. Order within each section is rough
priority, top = most worth doing next.

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
