import React, { useState } from 'react'

/**
 * Substitute someone in for an existing pair / entrant. Two paths:
 *
 *   1. Pick from the division's wait list (the bubble) — one tap and
 *      we swap their names in, removing them from the bubble.
 *   2. Type new names directly — useful when a sub walked in off the
 *      court and the pro hasn't bothered with the wait list.
 *
 * Either path preserves the slot's id, so the existing schedule
 * (matches, completed scores, standings) keeps pointing at the
 * same record. That's the whole reason this exists rather than
 * forcing the pro to unlock + re-seed.
 */
export default function SubstituteDialog({
  title,
  isDoubles,
  current,
  waitList,
  onSubmit,
  onClose,
}) {
  const [p1, setP1] = useState('')
  const [p2, setP2] = useState('')

  function pickFromWaitList(entry) {
    onSubmit({ p1: entry.p1, p2: entry.p2, fromWaitListId: entry.id })
  }

  function submitTyped(e) {
    e?.preventDefault?.()
    if (!p1.trim() && !p2.trim()) return
    onSubmit({ p1: p1.trim(), p2: p2.trim() })
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-white w-full sm:max-w-lg sm:rounded-2xl shadow-xl max-h-[95vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b border-vinoy-border px-5 py-3 flex items-center justify-between">
          <div>
            <h2 className="font-display text-xl font-bold text-vinoy-green">
              Substitute
            </h2>
            <p className="text-xs text-vinoy-ink/60 mt-0.5">
              Replacing {title || 'this slot'} — the schedule stays the same.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-vinoy-ink/40 hover:text-vinoy-ink text-2xl leading-none px-2"
            title="Close"
          >
            ×
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <div className="text-xs uppercase tracking-wider text-vinoy-ink/60 mb-1">
              Currently
            </div>
            <div className="bg-vinoy-cream rounded-xl px-3 py-2 text-sm">
              {current || <em className="text-vinoy-ink/50">(empty)</em>}
            </div>
          </div>

          {waitList && waitList.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-vinoy-ink/70 mb-1">
                Pull from wait list
              </div>
              <ul className="space-y-2">
                {waitList.map(entry => (
                  <li key={entry.id}>
                    <button
                      type="button"
                      onClick={() => pickFromWaitList(entry)}
                      className="w-full text-left flex items-center gap-2 rounded-xl bg-white border border-dashed border-vinoy-gold/60 hover:bg-vinoy-cream hover:border-vinoy-green px-3 py-2 transition"
                    >
                      <span className="text-vinoy-gold">↪</span>
                      <span className="flex-1 text-sm">
                        {entryLabel(entry, isDoubles)}
                      </span>
                      <span className="text-xs text-vinoy-ink/50">
                        Sub in
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <form onSubmit={submitTyped} className="space-y-2">
            <div className="text-xs font-semibold text-vinoy-ink/70">
              Or type new names
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <input
                type="text"
                value={p1}
                onChange={(e) => setP1(e.target.value)}
                placeholder={isDoubles ? 'Player 1' : 'Player'}
                autoFocus
                className="flex-1 min-w-0 bg-white border-2 border-vinoy-border rounded-lg px-3 py-2 text-sm focus:border-vinoy-green focus:outline-none"
              />
              {isDoubles && (
                <>
                  <span className="hidden sm:inline text-vinoy-ink/30 shrink-0">/</span>
                  <input
                    type="text"
                    value={p2}
                    onChange={(e) => setP2(e.target.value)}
                    placeholder="Player 2"
                    className="flex-1 min-w-0 bg-white border-2 border-vinoy-border rounded-lg px-3 py-2 text-sm focus:border-vinoy-green focus:outline-none"
                  />
                </>
              )}
            </div>
            <button
              type="submit"
              className="w-full px-4 py-2 rounded-xl bg-vinoy-green text-white font-semibold text-sm"
            >
              Substitute
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

function entryLabel(entry, isDoubles) {
  const a = (entry.p1 || '').trim()
  const b = (entry.p2 || '').trim()
  if (isDoubles && a && b) return `${a} / ${b}`
  if (a && b) return `${a} / ${b}`
  return a || b || '—'
}
