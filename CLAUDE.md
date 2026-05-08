# Tennis Tournament Manager — Project Memory

Single-page React app for running social / charity tennis events
("Up and Down the River" rotation). Embedded into a WordPress site
via a shortcode and deployed to WP Engine.

## Stack

- React 18 + Vite 5, plain JS (no TS).
- State: a single `useReducer` in `src/store/useTournament.js`.
- Drag-and-drop: `@dnd-kit/core` + `@dnd-kit/sortable`.
- Styling: **Tailwind via CDN** (`cdn.tailwindcss.com` script tag in
  `index.html`). No PostCSS / no local Tailwind build.
- Persistence:
  - `localStorage` (`tennis-tournament-state`) on every state change.
  - Optional shareable "room" — 6-char code, server-side JSON file
    via `public/tennis-save.php`, loaded/saved by `src/utils/share.js`.
- No router, no tests, no linter, no CI checks (only the deploy job).

## Layout

```
src/
  main.jsx                   mounts <App/> into #tennis-app-root
  App.jsx                    phase switch: setup | roster | round
  store/useTournament.js     reducer + localStorage + room autosave
  components/
    Setup.jsx                tournament metadata + "join room" form
    Roster.jsx               add/check-in players, generate courts
    CourtBoard.jsx           live round: drag/drop, results, room UI
    PrintView.jsx            printable assignments + standings
  utils/
    shuffle.js               generateInitialCourts + shuffleCourts
    share.js                 room API, JSON import/export, URL hash
public/
  tennis-save.php            GET/POST JSON by ?code=XXXXXX
  tennis-data/.htaccess      Deny from all (data dir not browsable)
index.html                   loads Tailwind CDN + /src/main.jsx
wordpress-shortcode.php      WP-side: enqueues /tennis/app.js
.github/workflows/deploy.yml SFTP dist/* → /sites/dzuynguyen/tennis
```

## Commands

```bash
npm install
npm run dev        # vite dev server
npm run build      # outputs dist/ (entry: app.js, base: /tennis/)
npm run preview    # preview the built bundle locally
```

There is no test or lint script. Don't add scripts opportunistically —
ask first.

## Build & deploy

- `vite.config.js` sets `base: '/tennis/'` and forces a stable
  `app.js` entry filename so the WordPress shortcode can reference it.
- GitHub Actions (`.github/workflows/deploy.yml`) builds on push to
  `main` and SFTPs `dist/*` to `/sites/dzuynguyen/tennis` on WP Engine
  (`delete_remote_files: true`, so anything not in the new build is
  deleted from that directory).
- The PHP files (`tennis-save.php`, `wordpress-shortcode.php`) live in
  the repo for reference but are deployed/installed manually on the
  WordPress side — they are NOT part of the SFTP'd `dist/`.

## Tournament model

State shape (see `initialState` in `useTournament.js`):

```
{
  phase: 'setup' | 'roster' | 'round',
  tournament: { name, format, numCourts, genderMix, currentRound, roomCode },
  players:    [ { id, name, gender: 'M'|'F'|'X', skill: 1..5, checkedIn, wins, losses } ],
  courts:     [ { id, number, label?, teams: [[pid|null,...],[pid|null,...]], winnerId: 0|1|null } ],
  history:    [ { round, courts } ]   // snapshot taken at NEXT_ROUND
}
```

- Court 1 is the "best" court. Winners move toward court 1; losers move
  away. See `shuffleCourts` in `src/utils/shuffle.js`.
- `generateInitialCourts` does a snake-draft by skill across courts —
  it does NOT consider `tournament.genderMix`.
- Wins/losses are aggregated only when `NEXT_ROUND` fires.

## Rooms (shared sessions)

- Code: 6 chars from `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (ambiguous
  chars excluded — see `share.js`).
- Save endpoint: `POST ./tennis-save.php?code=XXXXXX` with JSON body.
  GET returns the JSON or 404. CORS is `*`. No auth, no rate limiting,
  no versioning. Last writer wins.
- Autosave debounced 1.5 s in `useTournament.js`; manual save button
  in the court-board header.
- URL hash form: `#room=XXXXXX`. On mount, if present, the app fetches
  the room and replaces local state (overrides any localStorage).

## Conventions / gotchas

- All UI uses Tailwind utility classes. Custom palette is defined
  inline in `index.html` (`tennis: { green, light, yellow, court }`).
- Player IDs come from a module-local counter + random suffix
  (`newId()` in `useTournament.js`). They are stable within a session;
  loaded states keep their existing IDs.
- `LOAD_STATE` uses `{ ...initialState, ...payload }` — be careful
  adding new top-level state keys (older saved JSON won't have them,
  which is fine, but room JSON from older deploys will be missing
  them too).
- `RESET` action exists in the reducer but is not wired to any UI.
- The PHP endpoint hardcodes a 512 KB payload limit and writes with
  `LOCK_EX`. There is no cleanup of old room files.
- `npm run dev` cannot exercise the room feature — the PHP endpoint
  is only reachable on the live WordPress install.
- Print view auto-fires `window.print()` 500 ms after mount.

## Things that often surprise people

- `genderMix` is collected in setup but currently has no effect on
  match generation.
- "Generate Courts" requires `checkedIn % playersPerCourt === 0`
  exactly — there's no bye/sit-out handling.
- There is no undo for `NEXT_ROUND`; history is captured but not
  surfaced in the UI.
- Two co-organizers editing the same room race each other; the last
  autosave wins silently.

## Working in this repo

- Prefer small, surgical edits. There is no test suite to catch
  regressions, so when changing the reducer or `shuffle.js`, exercise
  the affected flow in `npm run dev` before committing.
- Keep Tailwind classes inline; don't introduce a CSS pipeline
  without asking — the WP shortcode and deploy assume the CDN setup.
- Don't change `vite.config.js`'s `base` or output filenames without
  also updating `wordpress-shortcode.php`.
- Active development branch for the current task:
  `claude/review-backlog-notes-YdhvE`.
