import React from 'react'

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
    const next = list.map((p, i) =>
      i === idx ? { ...p, winningScore: Math.max(1, parseInt(ws) || 1) } : p
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
          <li
            key={idx}
            className="flex items-center gap-3 bg-vinoy-cream rounded-xl px-3 py-2"
          >
            <span className="w-8 h-8 rounded-full bg-vinoy-green text-white flex items-center justify-center font-bold text-sm">
              {idx + 1}
            </span>
            <span className="text-sm text-vinoy-ink/80 flex-1">First to</span>
            <input
              type="number"
              min="1"
              max="21"
              value={p.winningScore}
              disabled={locked}
              onChange={(e) => update(idx, e.target.value)}
              className="w-20 text-center text-lg font-bold border-2 border-vinoy-border rounded-lg px-2 py-1 focus:border-vinoy-green focus:outline-none disabled:bg-gray-100"
            />
            <span className="text-sm text-vinoy-ink/60">games</span>
            {!locked && list.length > 1 && (
              <button
                type="button"
                onClick={() => remove(idx)}
                className="text-vinoy-ink/40 hover:text-red-600 px-1"
                title="Remove round"
              >
                ✕
              </button>
            )}
          </li>
        ))}
      </ol>
    </div>
  )
}
