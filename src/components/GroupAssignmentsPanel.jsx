import React from 'react'

/**
 * Setup-side view of a multi-group division's group assignments.
 * Visible only after lock — the lock step is what populates groups[].
 * Each pair shows a "Move to" dropdown so pros can reshape groups
 * after the auto-distribution if a different layout makes sense
 * (e.g. seeding the strongest court into Group A instead of snake).
 *
 * Moving a pair regenerates that group's matches in the reducer; a
 * clear note up top warns the pro that group reshape clears any
 * scores already entered for the affected groups.
 */
export default function GroupAssignmentsPanel({ division, dispatch, ifAuthed }) {
  if (!Array.isArray(division.groups) || division.groups.length < 2) return null

  function move(pairIndex, targetGroupIndex) {
    ifAuthed(() =>
      dispatch({
        type: 'MOVE_PAIR_TO_GROUP',
        payload: {
          divisionId: division.id,
          pairIndex,
          targetGroupIndex,
        },
      })
    )
  }

  return (
    <div className="border-t border-vinoy-border pt-3 mt-3">
      <div className="mb-2">
        <div className="text-sm font-semibold text-vinoy-ink/80">
          Group assignments
        </div>
        <div className="text-xs text-vinoy-ink/60">
          Move pairs between groups. Reshaping a group clears its
          existing match scores.
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {division.groups.map(group => (
          <div
            key={group.id}
            className="bg-vinoy-cream rounded-xl p-3 border border-vinoy-border"
          >
            <div className="text-xs uppercase tracking-wider font-semibold text-vinoy-ink/70 mb-2">
              {group.name}
              <span className="ml-2 font-normal text-vinoy-ink/50">
                {group.memberIndices.length} pairs
              </span>
            </div>
            <ul className="space-y-1.5">
              {group.memberIndices.map(pairIdx => {
                const pair = division.pairs[pairIdx]
                if (!pair) return null
                return (
                  <li
                    key={pair.id}
                    className="flex items-center gap-2 bg-white rounded-lg px-2 py-1.5"
                  >
                    <span className="flex-1 min-w-0 text-sm truncate">
                      {pair.label || '(unnamed)'}
                    </span>
                    <select
                      value={group.index}
                      onChange={(e) => move(pairIdx, parseInt(e.target.value))}
                      className="text-xs border border-vinoy-border rounded px-1 py-0.5 bg-white"
                      title="Move to another group"
                    >
                      {division.groups.map(g => (
                        <option key={g.id} value={g.index}>
                          {g.name}
                        </option>
                      ))}
                    </select>
                  </li>
                )
              })}
              {group.memberIndices.length === 0 && (
                <li className="text-xs text-vinoy-ink/50 italic px-2 py-1.5">
                  Empty
                </li>
              )}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}
