import React, { useState } from 'react'
import Brand from './Brand.jsx'
import NewEventDialog from './NewEventDialog.jsx'
import OrnamentalRule from './OrnamentalRule.jsx'
import { getRecentRooms, removeRecentRoom } from '../utils/share.js'
import { getEventType, getVariant, getRatingLabel } from '../utils/eventTypes.js'

/**
 * Landing screen for /feedin/. Three jobs in priority order:
 *
 *   1. Big "New event" CTA — opens a two-step picker (type → metadata)
 *      so a coach at the desk can spin up a tournament, league, or
 *      social with the right shape from the start.
 *   2. "Continue draft" — surfaced only if the device has unsynced
 *      setup work without a room code. Without this we'd silently
 *      lose work that pre-dates the always-room-code change.
 *   3. "Recent events" + "Join by code" — reach an existing event on
 *      this device, or one a colleague is running on theirs.
 */
export default function Home({
  draft,
  onStartNew,
  onContinueDraft,
  onJoinRoom,
}) {
  const [recents, setRecents] = useState(() => getRecentRooms())
  const [code, setCode] = useState('')
  const [joining, setJoining] = useState(false)
  const [joinErr, setJoinErr] = useState('')
  const [showDialog, setShowDialog] = useState(false)

  async function handleJoin(target) {
    const c = (target || code).trim().toUpperCase()
    if (!c) return
    setJoining(true)
    setJoinErr('')
    const ok = await onJoinRoom(c)
    setJoining(false)
    if (!ok) setJoinErr(`No event found with code ${c}`)
  }

  function handleRemoveRecent(c) {
    removeRecentRoom(c)
    setRecents(getRecentRooms())
  }

  function handleCreate(meta) {
    setShowDialog(false)
    onStartNew(meta)
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <header className="text-center mb-8">
        <div className="inline-flex flex-col items-center">
          <Brand />
        </div>
        <OrnamentalRule className="mt-4 max-w-sm mx-auto" />
      </header>

      <section className="bg-white rounded-2xl border border-vinoy-border shadow-sm p-6 mb-4 text-center">
        <h2 className="font-display text-2xl font-bold text-vinoy-green mb-2">
          New event
        </h2>
        <p className="text-sm text-vinoy-ink/70 mb-4 max-w-md mx-auto">
          Create a tournament, round robin, league, or social. Every event
          gets a shareable code for the iPads at courtside.
        </p>
        <button
          onClick={() => setShowDialog(true)}
          className="px-8 py-3 rounded-xl bg-vinoy-green hover:bg-vinoy-greenDark text-white font-semibold text-base shadow-sm"
        >
          + New event
        </button>
      </section>

      {draft && (
        <section className="bg-vinoy-cream border border-vinoy-gold/40 rounded-2xl p-4 mb-4 flex items-center justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <h3 className="font-semibold text-vinoy-green text-sm">
              Continue draft
            </h3>
            <p className="text-xs text-vinoy-ink/70 mt-0.5">
              {draftSummary(draft)}. Picking back up will mint a room code so
              you can share or recover this from another device.
            </p>
          </div>
          <button
            onClick={onContinueDraft}
            className="shrink-0 px-4 py-2 rounded-xl border border-vinoy-green text-vinoy-green font-semibold text-sm bg-white hover:bg-vinoy-cream"
          >
            Continue setup →
          </button>
        </section>
      )}

      <section className="bg-white rounded-2xl border border-vinoy-border shadow-sm p-4 mb-4">
        <h3 className="font-display text-lg font-bold text-vinoy-green mb-3">
          Recent events
        </h3>
        {recents.length === 0 ? (
          <p className="text-sm text-vinoy-ink/60">
            No events visited yet on this device. They'll appear here once
            you start or join one.
          </p>
        ) : (
          <ul className="space-y-2">
            {/* Cap Recent at five — the long tail lives in the
                All-events archive below, grouped by date so it stays
                navigable. */}
            {recents.slice(0, 5).map((r) => (
              <RoomRow
                key={r.code}
                room={r}
                onJoin={() => handleJoin(r.code)}
                onRemove={() => handleRemoveRecent(r.code)}
              />
            ))}
          </ul>
        )}
      </section>

      <AllEventsSection
        recents={recents}
        onJoin={handleJoin}
        onRemove={handleRemoveRecent}
      />

      <section className="bg-white rounded-2xl border border-vinoy-border shadow-sm p-4">
        <h3 className="font-display text-lg font-bold text-vinoy-green mb-1">
          Join by code
        </h3>
        <p className="text-xs text-vinoy-ink/70 mb-3">
          Enter the 6-character room code for an existing event.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            handleJoin()
          }}
          className="flex flex-col sm:flex-row gap-2"
        >
          <input
            value={code}
            onChange={(e) => {
              setCode(e.target.value.toUpperCase())
              setJoinErr('')
            }}
            placeholder="ABC123"
            maxLength={6}
            autoCapitalize="characters"
            spellCheck={false}
            className="flex-1 min-w-0 border-2 border-vinoy-border rounded-xl px-3 py-2 font-mono uppercase tracking-widest text-center text-lg focus:border-vinoy-green focus:outline-none"
          />
          <button
            type="submit"
            disabled={joining || code.trim().length < 4}
            className="px-6 py-2 rounded-xl bg-vinoy-green text-white font-semibold disabled:opacity-50"
          >
            {joining ? 'Joining…' : 'Join'}
          </button>
        </form>
        {joinErr && <p className="text-red-600 text-sm mt-2">{joinErr}</p>}
      </section>

      {showDialog && (
        <NewEventDialog
          onCreate={handleCreate}
          onClose={() => setShowDialog(false)}
        />
      )}
    </div>
  )
}

/**
 * Single event row used by both the "Recent events" list (capped at
 * five) and each group inside the All-events archive. Keeping it
 * here means the visual treatment stays in lockstep across the two
 * places it appears.
 */
function RoomRow({ room, onJoin, onRemove }) {
  return (
    <li className="flex items-stretch rounded-xl bg-vinoy-cream hover:bg-vinoy-parchment overflow-hidden">
      <button
        onClick={onJoin}
        className="flex-1 min-w-0 text-left px-3 py-2.5"
      >
        <div className="font-semibold text-vinoy-ink truncate">
          {room.name || 'Untitled event'}
        </div>
        <div className="flex items-center flex-wrap gap-1.5 mt-1">
          <RecentBadges room={room} />
        </div>
        <div className="text-xs text-vinoy-ink/50 font-mono mt-1">
          Room {room.code}
          {room.lastVisited && ` · ${formatRelative(room.lastVisited)}`}
        </div>
      </button>
      <button
        onClick={onRemove}
        className="px-2 text-vinoy-ink/40 hover:text-red-600 hover:bg-vinoy-parchment"
        title="Remove from list"
      >
        ✕
      </button>
    </li>
  )
}

/**
 * Full archive of every event the device has touched, grouped into
 * Upcoming / In progress / Past based on the event's start/end dates
 * (or `ongoing` flag). Each group sorts by the most useful order:
 * upcoming = soonest first, past = most recent first.
 *
 * Hidden when the device has fewer than six events — at that size
 * everything fits in the Recent list above and a redundant archive
 * just adds noise.
 */
function AllEventsSection({ recents, onJoin, onRemove }) {
  if (recents.length <= 5) return null
  const groups = groupEvents(recents)
  const labels = {
    inProgress: 'In progress',
    upcoming: 'Upcoming',
    past: 'Past',
  }
  // Render order: in-progress first (most actionable), upcoming next,
  // past last. Empty groups skipped so the section doesn't look thin.
  const order = ['inProgress', 'upcoming', 'past']
  return (
    <section className="bg-white rounded-2xl border border-vinoy-border shadow-sm p-4 mb-4">
      <div className="flex items-baseline justify-between mb-3 flex-wrap gap-2">
        <h3 className="font-display text-lg font-bold text-vinoy-green">
          All events
        </h3>
        <span className="text-xs text-vinoy-ink/60">
          {recents.length} on this device
        </span>
      </div>
      <div className="space-y-4">
        {order
          .filter(key => groups[key].length > 0)
          .map(key => (
            <div key={key}>
              <div className="text-xs uppercase tracking-wider font-semibold text-vinoy-ink/60 mb-2">
                {labels[key]} · {groups[key].length}
              </div>
              <ul className="space-y-2">
                {groups[key].map(r => (
                  <RoomRow
                    key={r.code}
                    room={r}
                    onJoin={() => onJoin(r.code)}
                    onRemove={() => onRemove(r.code)}
                  />
                ))}
              </ul>
            </div>
          ))}
      </div>
    </section>
  )
}

/**
 * Bucket events by their relationship to today. Undated entries (no
 * startDate, no ongoing flag) end up in In progress — typically
 * unfinished drafts the pro is still building.
 */
function groupEvents(recents) {
  const today = todayIso()
  const inProgress = []
  const upcoming = []
  const past = []
  for (const r of recents) {
    if (r.ongoing) {
      inProgress.push(r)
      continue
    }
    if (!r.startDate) {
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

function todayIso() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * Compact horizontal badges that summarize an event entry: type,
 * variant, rating, and date range. Skips fields that aren't set so
 * older saves with no event metadata still render cleanly.
 */
function RecentBadges({ room }) {
  const typeLabel = room.typeId ? getEventType(room.typeId).label : null
  const variantLabel =
    room.variantId && room.variantId !== 'all'
      ? getVariant(room.variantId).label
      : null
  const ratingLabel = room.ratingId ? getRatingLabel(room.ratingId) : null
  const dateLabel = formatDateRange(room)
  const items = [typeLabel, variantLabel, ratingLabel, dateLabel].filter(Boolean)
  if (items.length === 0) return null
  return (
    <>
      {items.map((label, i) => (
        <span
          key={i}
          className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-white border border-vinoy-border text-vinoy-ink/70"
        >
          {label}
        </span>
      ))}
    </>
  )
}

function formatDateRange(room) {
  if (room.ongoing) return 'Ongoing'
  if (room.startDate && room.endDate) {
    return `${shortDate(room.startDate)}–${shortDate(room.endDate)}`
  }
  if (room.startDate) return shortDate(room.startDate)
  return null
}

function shortDate(iso) {
  if (!iso) return ''
  const d = new Date(iso + 'T00:00:00')
  if (isNaN(d)) return iso
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function draftSummary(state) {
  const t = state.tournament || {}
  const divCount = state.divisions?.length || 0
  const pairCount = (state.divisions || []).reduce(
    (n, d) => n + (d.pairs?.length || 0),
    0
  )
  const parts = []
  if (t.name) parts.push(`"${t.name}"`)
  if (divCount > 0) parts.push(`${divCount} division${divCount === 1 ? '' : 's'}`)
  if (pairCount > 0) parts.push(`${pairCount} pair${pairCount === 1 ? '' : 's'}`)
  return parts.length ? parts.join(' · ') : 'unsaved setup work'
}

function formatRelative(ts) {
  const diff = Date.now() - ts
  const m = Math.round(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m} min ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h} hr${h === 1 ? '' : 's'} ago`
  const d = Math.round(h / 24)
  if (d < 30) return `${d} day${d === 1 ? '' : 's'} ago`
  return new Date(ts).toLocaleDateString()
}
