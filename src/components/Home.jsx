import React, { useState } from 'react'
import Brand from './Brand.jsx'
import { getRecentRooms, removeRecentRoom } from '../utils/share.js'

/**
 * Landing screen for /feedin/. Three jobs in priority order:
 *
 *   1. Big "Start a new tournament" CTA — the most common action a
 *      pro takes when they walk on court for a new event.
 *   2. "Continue draft" — surfaced only if the device has unsynced
 *      setup work without a room code. Without this we'd silently
 *      lose work that was started before any sharing happened.
 *   3. "Recent tournaments" + "Join by code" — reach an existing
 *      event on this device, or one a colleague is running on theirs.
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

  async function handleJoin(target) {
    const c = (target || code).trim().toUpperCase()
    if (!c) return
    setJoining(true)
    setJoinErr('')
    const ok = await onJoinRoom(c)
    setJoining(false)
    if (!ok) setJoinErr(`No tournament found with code ${c}`)
  }

  function handleRemoveRecent(c) {
    removeRecentRoom(c)
    setRecents(getRecentRooms())
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <header className="text-center mb-8">
        <div className="inline-flex flex-col items-center">
          <Brand subtitle="Feed-In Tournament" />
        </div>
        <div className="vinoy-rule mt-4 max-w-sm mx-auto" />
      </header>

      <section className="bg-white rounded-2xl border border-vinoy-border shadow-sm p-6 mb-4 text-center">
        <h2 className="font-display text-2xl font-bold text-vinoy-green mb-2">
          Start a new tournament
        </h2>
        <p className="text-sm text-vinoy-ink/70 mb-4 max-w-md mx-auto">
          Set up divisions, enter pairs, and choose how many rounds to play.
          Every tournament gets a shareable room code for the iPads at courtside.
        </p>
        <button
          onClick={onStartNew}
          className="px-8 py-3 rounded-xl bg-vinoy-green hover:bg-vinoy-greenDark text-white font-semibold text-base shadow-sm"
        >
          New Tournament
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
          Recent tournaments
        </h3>
        {recents.length === 0 ? (
          <p className="text-sm text-vinoy-ink/60">
            No tournaments visited yet on this device. They'll appear here
            once you start or join one.
          </p>
        ) : (
          <ul className="space-y-2">
            {recents.map((r) => (
              <li
                key={r.code}
                className="flex items-stretch rounded-xl bg-vinoy-cream hover:bg-vinoy-parchment overflow-hidden"
              >
                <button
                  onClick={() => handleJoin(r.code)}
                  className="flex-1 min-w-0 text-left px-3 py-2.5 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="font-semibold text-vinoy-ink truncate">
                      {r.name || 'Untitled tournament'}
                    </div>
                    <div className="text-xs text-vinoy-ink/60 font-mono mt-0.5">
                      Room {r.code}
                      {r.date && ` · ${r.date}`}
                      {r.lastVisited && ` · ${formatRelative(r.lastVisited)}`}
                    </div>
                  </div>
                  <span className="text-vinoy-green text-lg shrink-0" aria-hidden>
                    →
                  </span>
                </button>
                <button
                  onClick={() => handleRemoveRecent(r.code)}
                  className="px-2 text-vinoy-ink/40 hover:text-red-600 hover:bg-vinoy-parchment"
                  title="Remove from list"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="bg-white rounded-2xl border border-vinoy-border shadow-sm p-4">
        <h3 className="font-display text-lg font-bold text-vinoy-green mb-1">
          Join by code
        </h3>
        <p className="text-xs text-vinoy-ink/70 mb-3">
          Enter the 6-character room code for an existing tournament.
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
        {joinErr && (
          <p className="text-red-600 text-sm mt-2">{joinErr}</p>
        )}
      </section>
    </div>
  )
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
