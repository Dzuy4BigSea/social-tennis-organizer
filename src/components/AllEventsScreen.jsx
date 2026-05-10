import React, { useMemo, useState } from 'react'
import Brand from './Brand.jsx'
import OrnamentalRule from './OrnamentalRule.jsx'
import { formatDateRange } from '../utils/format.js'

/**
 * Dedicated "all events" screen reachable from the Home page.
 *
 * Two view modes:
 *   - List — grouped In progress / Upcoming / Past, mirrors the
 *     bucketing the home Recent area uses but without a 5-row cap.
 *   - Calendar — month grid with each event placed on its start
 *     date. Useful when a coach wants to eyeball coverage across a
 *     few weeks ("are we double-booked?") rather than flip rows.
 *
 * Events come from the same recent-rooms list the home page uses;
 * this screen never makes a network call. Joining a room hands
 * back through the same `onJoin(code)` callback the home page
 * already wires.
 */
export default function AllEventsScreen({ recents, onJoin, onRemove, onBack }) {
  const [mode, setMode] = useState('list')

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <header className="mb-6">
        <button
          onClick={onBack}
          className="text-sm text-vinoy-green hover:text-vinoy-greenDark font-semibold mb-3"
        >
          ← Back
        </button>
        <div className="flex items-baseline justify-between flex-wrap gap-2">
          <h1 className="font-display text-3xl font-bold text-vinoy-green">
            All events
          </h1>
          <span className="text-sm text-vinoy-ink/60">
            {recents.length} on this device
          </span>
        </div>
        <OrnamentalRule className="mt-4" />
      </header>

      <div className="flex justify-center mb-5">
        <div
          role="tablist"
          className="inline-flex bg-white border border-vinoy-border rounded-xl overflow-hidden shadow-sm"
        >
          <ToggleTab
            active={mode === 'list'}
            onClick={() => setMode('list')}
            label="List"
          />
          <ToggleTab
            active={mode === 'calendar'}
            onClick={() => setMode('calendar')}
            label="Calendar"
          />
        </div>
      </div>

      {recents.length === 0 ? (
        <EmptyState />
      ) : mode === 'list' ? (
        <ListView
          recents={recents}
          onJoin={onJoin}
          onRemove={onRemove}
        />
      ) : (
        <CalendarView
          recents={recents}
          onJoin={onJoin}
        />
      )}
    </div>
  )
}

function ToggleTab({ active, onClick, label }) {
  return (
    <button
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={[
        'px-5 py-2 text-sm font-semibold transition',
        active
          ? 'bg-vinoy-green text-white'
          : 'bg-white text-vinoy-ink/70 hover:bg-vinoy-cream',
      ].join(' ')}
    >
      {label}
    </button>
  )
}

function EmptyState() {
  return (
    <div className="bg-white border-2 border-dashed border-vinoy-border rounded-2xl p-8 text-center text-vinoy-ink/60">
      No events visited yet on this device. Start one or join by
      code from the home page.
    </div>
  )
}

// ============================================================
// LIST VIEW — buckets by status, mirrors the home Recent area
// without the 5-row cap.
// ============================================================

function ListView({ recents, onJoin, onRemove }) {
  const groups = useMemo(() => groupEvents(recents), [recents])
  const labels = {
    inProgress: 'In progress',
    upcoming: 'Upcoming',
    past: 'Past',
  }
  const order = ['inProgress', 'upcoming', 'past']
  const visible = order.filter(k => groups[k].length > 0)
  return (
    <section className="bg-white rounded-2xl border border-vinoy-border shadow-sm p-4 space-y-5">
      {visible.map(key => (
        <div key={key}>
          <div className="text-xs uppercase tracking-wider font-semibold text-vinoy-ink/60 mb-2">
            {labels[key]} · {groups[key].length}
          </div>
          <ul className="space-y-2">
            {groups[key].map(r => (
              <EventRow
                key={r.code}
                room={r}
                onJoin={() => onJoin(r.code)}
                onRemove={() => onRemove(r.code)}
              />
            ))}
          </ul>
        </div>
      ))}
    </section>
  )
}

function EventRow({ room, onJoin, onRemove }) {
  const dateLabel = formatDateRange(room)
  const div =
    typeof room.divisionCount === 'number' && room.divisionCount > 0
      ? `${room.divisionCount} ${room.divisionCount === 1 ? 'division' : 'divisions'}`
      : null
  return (
    <li className="flex items-center gap-2 bg-vinoy-cream rounded-xl px-3 py-2">
      <button
        onClick={onJoin}
        className="flex-1 min-w-0 text-left"
      >
        <div className="font-semibold text-vinoy-ink truncate">
          {room.name || 'Untitled event'}
        </div>
        <div className="text-xs text-vinoy-ink/60 mt-0.5 flex items-center gap-1.5 flex-wrap">
          <span className="font-mono">{room.code}</span>
          {dateLabel && <span>· {dateLabel}</span>}
          {div && <span>· {div}</span>}
        </div>
      </button>
      <button
        onClick={onRemove}
        className="text-vinoy-ink/40 hover:text-red-600 px-1"
        title="Remove from this device"
      >
        ✕
      </button>
    </li>
  )
}

// ============================================================
// CALENDAR VIEW — single-month grid with prev/next nav.
// ============================================================

function CalendarView({ recents, onJoin }) {
  // Default to the month containing the soonest upcoming event,
  // or the current month if nothing's upcoming.
  const [cursor, setCursor] = useState(() => initialMonth(recents))

  const days = useMemo(() => buildMonthGrid(cursor), [cursor])
  const eventsByDay = useMemo(() => bucketByDate(recents, cursor), [recents, cursor])
  const monthLabel = cursor.toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  })
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  function shift(months) {
    setCursor(c => {
      const next = new Date(c)
      next.setMonth(next.getMonth() + months)
      return next
    })
  }

  return (
    <section className="bg-white rounded-2xl border border-vinoy-border shadow-sm p-4">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => shift(-1)}
          className="px-3 py-1.5 rounded-lg border border-vinoy-border hover:border-vinoy-green text-vinoy-ink/70 hover:text-vinoy-green text-sm"
          aria-label="Previous month"
        >
          ←
        </button>
        <h2 className="font-display text-lg font-bold text-vinoy-green">
          {monthLabel}
        </h2>
        <button
          onClick={() => shift(1)}
          className="px-3 py-1.5 rounded-lg border border-vinoy-border hover:border-vinoy-green text-vinoy-ink/70 hover:text-vinoy-green text-sm"
          aria-label="Next month"
        >
          →
        </button>
      </div>

      <div className="grid grid-cols-7 gap-px bg-vinoy-border rounded-lg overflow-hidden text-xs">
        {WEEKDAYS.map(d => (
          <div
            key={d}
            className="bg-vinoy-cream py-1.5 text-center font-semibold uppercase tracking-wider text-vinoy-ink/60"
          >
            {d}
          </div>
        ))}
        {days.map(day => {
          const key = isoDate(day.date)
          const inMonth = day.date.getMonth() === cursor.getMonth()
          const isToday = isoDate(today) === key
          const events = eventsByDay.get(key) || []
          return (
            <div
              key={key + (inMonth ? '' : '-out')}
              className={[
                'min-h-[5rem] p-1 flex flex-col gap-0.5',
                inMonth ? 'bg-white' : 'bg-vinoy-cream/40',
              ].join(' ')}
            >
              <div
                className={[
                  'text-[11px] font-semibold leading-none px-1 pt-0.5',
                  isToday
                    ? 'text-vinoy-green'
                    : inMonth
                      ? 'text-vinoy-ink/70'
                      : 'text-vinoy-ink/30',
                ].join(' ')}
              >
                {day.date.getDate()}
                {isToday && (
                  <span className="ml-1 inline-block w-1.5 h-1.5 rounded-full bg-vinoy-green align-middle" />
                )}
              </div>
              <div className="flex-1 flex flex-col gap-0.5 overflow-hidden">
                {events.map(e => (
                  <button
                    key={e.code}
                    onClick={() => onJoin(e.code)}
                    title={`${e.name || 'Event'} · ${e.code}`}
                    className="text-left truncate text-[10px] leading-tight px-1 py-0.5 rounded bg-vinoy-green text-white hover:bg-vinoy-greenDark"
                  >
                    {e.name || e.code}
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      <p className="text-xs text-vinoy-ink/55 mt-3 text-center">
        Tap an event chip to open it. Events show on their start date.
      </p>
    </section>
  )
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

/** Build a Sunday-anchored 6-week grid covering the cursor's month. */
function buildMonthGrid(cursor) {
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1)
  const start = new Date(first)
  start.setDate(1 - first.getDay()) // back up to the Sunday
  const out = []
  for (let i = 0; i < 42; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    out.push({ date: d })
  }
  return out
}

function bucketByDate(recents, cursor) {
  const map = new Map()
  for (const r of recents) {
    if (!r.startDate) continue
    const start = parseIsoDate(r.startDate)
    const end = r.endDate ? parseIsoDate(r.endDate) : start
    if (!start) continue
    // For multi-day events, attach to every day in the range so a
    // long event surfaces in the grid even if its start day is in a
    // different month than the one being viewed.
    const cur = new Date(start)
    while (cur <= end) {
      if (cur.getMonth() === cursor.getMonth() && cur.getFullYear() === cursor.getFullYear()) {
        const key = isoDate(cur)
        const list = map.get(key) || []
        list.push(r)
        map.set(key, list)
      }
      cur.setDate(cur.getDate() + 1)
    }
  }
  return map
}

function isoDate(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function parseIsoDate(s) {
  if (!s || typeof s !== 'string') return null
  const [y, m, d] = s.split('-').map(Number)
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d)
}

function initialMonth(recents) {
  const todayMonth = new Date()
  todayMonth.setDate(1)
  todayMonth.setHours(0, 0, 0, 0)
  const todayIso = isoDate(new Date())
  const upcoming = recents
    .map(r => r.startDate)
    .filter(Boolean)
    .filter(s => s >= todayIso)
    .sort()
  if (upcoming.length === 0) return todayMonth
  const target = parseIsoDate(upcoming[0])
  return new Date(target.getFullYear(), target.getMonth(), 1)
}

// Keep buckets close to the home version so display order stays
// consistent between the two screens.
function groupEvents(recents) {
  const today = isoDate(new Date())
  const inProgress = []
  const upcoming = []
  const past = []
  for (const r of recents) {
    if (r.ongoing || !r.startDate) {
      inProgress.push(r)
      continue
    }
    const end = r.endDate || r.startDate
    if (today < r.startDate) upcoming.push(r)
    else if (today > end) past.push(r)
    else inProgress.push(r)
  }
  upcoming.sort((a, b) => (a.startDate || '').localeCompare(b.startDate || ''))
  inProgress.sort((a, b) => (b.lastVisited || 0) - (a.lastVisited || 0))
  past.sort((a, b) =>
    (b.endDate || b.startDate || '').localeCompare(a.endDate || a.startDate || '')
  )
  return { inProgress, upcoming, past }
}
