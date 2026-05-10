import React, { useEffect, useState } from 'react'

/**
 * Per-division feed-in passes editor. Each pass is a full
 * round-robin with its own target score. Pros add passes to extend
 * the event and tweak per-pass winning scores (e.g. round 1 to 7,
 * round 2 to 5).
 *
 * Lives directly on the feed-in division card so the schedule is
 * scoped to the division it belongs to. Round Robin / Single Elim /
 * Double Elim divisions use ScoringEditor instead.
 */
export default function PassesEditor({ passes, locked, onChange }) {
  const list = passes && passes.length ? passes : [{ winningScore: 7 }]

  function update(idx, ws) {
    // Caller has already parsed/validated; this just persists.
    const next = list.map((p, i) =>
      i === idx ? { ...p, winningScore: ws } : p
    )
    onChange(next)
  }
  function add() {
    onChange([
      ...list,
      { winningScore: list[list.length - 1]?.winningScore || 7 },
    ])
  }
  function remove(idx) {
    if (list.length <= 1) return
    onChange(list.filter((_, i) => i !== idx))
  }

  return (
    <div className="border-t border-vinoy-border pt-3 mt-3">
      <div className="flex items-center justify-between mb-2">
        <div>
          <div className="text-sm font-semibold text-vinoy-ink/80">
            Rounds
          </div>
          <div className="text-xs text-vinoy-ink/60">
            Each round is a full round-robin. Set a target score per
            round (e.g. round 1 to 7, round 2 to 5).
          </div>
        </div>
        {!locked && (
          <button
            type="button"
            onClick={add}
            className="px-3 py-1.5 rounded-lg border border-vinoy-green text-vinoy-green text-sm font-semibold"
          >
            + Round
          </button>
        )}
      </div>
      {locked && (
        <p className="text-xs text-yellow-700 bg-yellow-50 rounded-lg px-3 py-2 mb-2">
          Schedule already generated. Unlock the division to change
          the round count.
        </p>
      )}
      <ol className="space-y-2">
        {list.map((p, idx) => (
          <PassRow
            key={idx}
            pass={p}
            idx={idx}
            locked={locked}
            removable={!locked && list.length > 1}
            onCommit={(ws) => update(idx, ws)}
            onRemove={() => remove(idx)}
          />
        ))}
      </ol>
    </div>
  )
}

/**
 * Single round row. Holds the input value as a *string* in local
 * state during typing so the field is allowed to be momentarily
 * empty — backspacing the last digit shouldn't snap back to "1".
 * Commit happens on every change when the parsed value is valid,
 * and on blur to enforce the min when the field was left empty.
 */
function PassRow({ pass, idx, locked, removable, onCommit, onRemove }) {
  const [draft, setDraft] = useState(String(pass.winningScore ?? ''))

  // Pull external updates (e.g. another tab editing the same
  // division) into the local draft. Skip if the user is mid-typing
  // an empty string — otherwise we'd race them.
  useEffect(() => {
    setDraft(prev => (prev === '' ? prev : String(pass.winningScore ?? '')))
  }, [pass.winningScore])

  function handleChange(value) {
    setDraft(value)
    if (value === '') return // allow empty during typing; commit clamps on blur
    const parsed = parseInt(value, 10)
    if (Number.isFinite(parsed) && parsed >= 1) {
      onCommit(parsed)
    }
  }

  function handleBlur() {
    if (draft === '' || !Number.isFinite(parseInt(draft, 10))) {
      const fallback = Math.max(1, pass.winningScore || 1)
      setDraft(String(fallback))
      onCommit(fallback)
    }
  }

  return (
    <li className="flex items-center gap-3 bg-vinoy-cream rounded-xl px-3 py-2">
      <span className="w-8 h-8 rounded-full bg-vinoy-green text-white flex items-center justify-center font-bold text-sm">
        {idx + 1}
      </span>
      <span className="text-sm text-vinoy-ink/80 flex-1">First to</span>
      <input
        type="number"
        min="1"
        max="21"
        value={draft}
        disabled={locked}
        onChange={(e) => handleChange(e.target.value)}
        onBlur={handleBlur}
        className="w-20 text-center text-lg font-bold border-2 border-vinoy-border rounded-lg px-2 py-1 focus:border-vinoy-green focus:outline-none disabled:bg-gray-100"
      />
      <span className="text-sm text-vinoy-ink/60">games</span>
      {removable && (
        <button
          type="button"
          onClick={onRemove}
          className="text-vinoy-ink/40 hover:text-red-600 px-1"
          title="Remove round"
        >
          ✕
        </button>
      )}
    </li>
  )
}
