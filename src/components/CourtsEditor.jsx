import React, { useState } from 'react'

/**
 * Event-wide courts + scheduling granularity. Defines the rows of
 * the Schedule grid (one per court) and the column width
 * (slotMinutes). Lives on the Setup page so the pro establishes
 * the playing surface before assigning matches to it.
 *
 * Reorder uses simple up / down arrows rather than drag-and-drop —
 * the courts list is short (typical clubs have 4-8) and arrows are
 * a simpler interaction on touch.
 */
export default function CourtsEditor({ tournament, dispatch, ifAuthed }) {
  const courts = tournament.courts || []
  const slotMinutes = tournament.slotMinutes || 30
  const [draft, setDraft] = useState('')

  function add() {
    const name = draft.trim()
    if (!name) return
    ifAuthed(() => {
      dispatch({ type: 'ADD_EVENT_COURT', payload: { name } })
      setDraft('')
    })
  }

  function rename(from, to) {
    ifAuthed(() =>
      dispatch({ type: 'RENAME_EVENT_COURT', payload: { from, to } })
    )
  }

  function remove(name) {
    ifAuthed(() =>
      dispatch({ type: 'REMOVE_EVENT_COURT', payload: { name } })
    )
  }

  function move(from, to) {
    if (to < 0 || to >= courts.length) return
    const next = [...courts]
    const [c] = next.splice(from, 1)
    next.splice(to, 0, c)
    ifAuthed(() =>
      dispatch({ type: 'REORDER_EVENT_COURTS', payload: { order: next } })
    )
  }

  function setSlot(minutes) {
    ifAuthed(() =>
      dispatch({ type: 'SET_SLOT_MINUTES', payload: { minutes } })
    )
  }

  return (
    <section className="bg-white rounded-2xl border border-vinoy-border p-4 mb-4 shadow-sm">
      <div className="flex items-baseline justify-between mb-3 flex-wrap gap-2">
        <h2 className="font-display text-xl font-bold text-vinoy-green">
          Courts & schedule
        </h2>
        <span className="text-xs text-vinoy-ink/60">
          Define the playing surface and grid granularity. The
          Schedule tab uses these as rows and column width.
        </span>
      </div>

      <div className="mb-4">
        <div className="text-sm font-semibold text-vinoy-ink/80 mb-2">
          Courts
        </div>
        <ul className="space-y-2 mb-2">
          {courts.map((name, idx) => (
            <CourtRow
              key={name}
              name={name}
              canRemove={courts.length > 1}
              canMoveUp={idx > 0}
              canMoveDown={idx < courts.length - 1}
              onRename={(next) => rename(name, next)}
              onRemove={() => remove(name)}
              onMoveUp={() => move(idx, idx - 1)}
              onMoveDown={() => move(idx, idx + 1)}
            />
          ))}
        </ul>
        <div className="flex gap-2">
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && add()}
            placeholder="e.g. Court 7 / Stadium / Bubble 1"
            className="flex-1 min-w-0 border-2 border-vinoy-border rounded-xl px-3 py-1.5 text-sm focus:border-vinoy-green focus:outline-none"
          />
          <button
            onClick={add}
            className="px-3 py-1.5 rounded-xl border border-vinoy-green text-vinoy-green text-sm font-semibold"
          >
            + Add court
          </button>
        </div>
      </div>

      <div>
        <div className="text-sm font-semibold text-vinoy-ink/80 mb-1">
          Time slot length
        </div>
        <div className="flex flex-wrap gap-1.5">
          {[15, 20, 30, 60].map(m => {
            const active = m === slotMinutes
            return (
              <button
                key={m}
                type="button"
                onClick={() => setSlot(m)}
                className={[
                  'rounded-full border-2 transition font-semibold px-3 py-1 text-xs',
                  active
                    ? 'bg-vinoy-green border-vinoy-green text-white'
                    : 'bg-white border-vinoy-border text-vinoy-ink/70 hover:border-vinoy-green hover:text-vinoy-green',
                ].join(' ')}
              >
                {m} min
              </button>
            )
          })}
        </div>
        <p className="text-xs text-vinoy-ink/55 mt-2">
          Sets the column width on the Schedule grid. Auto-fill
          places matches at this spacing.
        </p>
      </div>
    </section>
  )
}

function CourtRow({
  name,
  canRemove,
  canMoveUp,
  canMoveDown,
  onRename,
  onRemove,
  onMoveUp,
  onMoveDown,
}) {
  // Use local state so the input keeps the user's draft until they
  // commit on blur or Enter — otherwise renaming dispatches per
  // keystroke would also re-render every match assigned to the
  // court (cascade through the whole reducer's match.court remap).
  const [draft, setDraft] = useState(name)
  function commit() {
    const next = draft.trim()
    if (!next || next === name) {
      setDraft(name)
      return
    }
    onRename(next)
  }
  return (
    <li className="flex items-center gap-2 bg-vinoy-cream rounded-xl px-3 py-1.5">
      <span className="flex flex-col gap-0.5 shrink-0">
        <button
          onClick={onMoveUp}
          disabled={!canMoveUp}
          className="text-vinoy-ink/50 hover:text-vinoy-green disabled:opacity-30 leading-none"
          aria-label="Move up"
        >
          ▲
        </button>
        <button
          onClick={onMoveDown}
          disabled={!canMoveDown}
          className="text-vinoy-ink/50 hover:text-vinoy-green disabled:opacity-30 leading-none"
          aria-label="Move down"
        >
          ▼
        </button>
      </span>
      <input
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
        className="flex-1 min-w-0 bg-white border border-vinoy-border rounded-lg px-2 py-1 text-sm"
      />
      {canRemove && (
        <button
          onClick={onRemove}
          className="text-vinoy-ink/40 hover:text-red-600 px-1"
          title="Remove court (matches scheduled here are kept but unassigned)"
        >
          ✕
        </button>
      )}
    </li>
  )
}
