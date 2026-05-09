import React, { useState } from 'react'
import { generateSingleElimBracket } from '../utils/bracket.js'
import { getEventType } from '../utils/eventTypes.js'

/**
 * Setup screen for single-elimination events. The pro lists entrants
 * (singles get one name, doubles get a pair) in seed order, optional
 * tweaks via reorder, then "Generate draw" to lock in the bracket.
 *
 * The Live screen takes over once the bracket exists — coming back
 * to Setup unlocks the bracket so seeds can be edited.
 */
export default function SetupBracket({ state, dispatch, ifAuthed }) {
  const { tournament, bracket } = state
  const evt = getEventType(tournament.type)
  const isDoubles = evt.entrantKind === 'doubles'
  const entrants = bracket?.entrants || []
  const drawSize = bracket?.matches?.length
    ? Math.pow(2, computeRounds(bracket))
    : 0
  const [p1, setP1] = useState('')
  const [p2, setP2] = useState('')

  function add() {
    const a = p1.trim()
    const b = isDoubles ? p2.trim() : ''
    if (!a && !b) return
    ifAuthed(() => {
      if (!bracket) {
        dispatch({
          type: 'SET_BRACKET',
          payload: { type: 'singleElim', entrants: [], matches: [] },
        })
      }
      dispatch({
        type: 'ADD_BRACKET_ENTRANT',
        payload: { p1: a, p2: b },
      })
      setP1('')
      setP2('')
    })
  }

  function generate() {
    if (entrants.length < 2) return
    ifAuthed(() => {
      const { matches, rounds, size } = generateSingleElimBracket(entrants.length)
      dispatch({
        type: 'SET_BRACKET',
        payload: {
          type: 'singleElim',
          entrants,
          matches,
          rounds,
          size,
          locked: true,
        },
      })
    })
  }

  function unlock() {
    ifAuthed(() => {
      dispatch({
        type: 'SET_BRACKET',
        payload: { type: 'singleElim', entrants, matches: [], locked: false },
      })
    })
  }

  const locked = !!bracket?.locked
  const canLock = entrants.length >= 2

  return (
    <section className="bg-white rounded-2xl border border-vinoy-border p-4 mb-4 shadow-sm">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h2 className="font-display text-xl font-bold text-vinoy-green">
          Entrants
        </h2>
        {locked ? (
          <button
            onClick={unlock}
            className="px-3 py-2 rounded-xl border border-yellow-400 text-yellow-700 text-sm font-semibold"
            title="Unlock to edit seeds"
          >
            Unlock draw
          </button>
        ) : (
          <button
            onClick={generate}
            disabled={!canLock}
            className="px-4 py-2 rounded-xl bg-vinoy-green text-white font-semibold text-sm disabled:opacity-40"
            title={canLock ? 'Generate draw' : 'Add at least 2 entrants'}
          >
            Generate draw
          </button>
        )}
      </div>
      {locked && (
        <p className="text-xs text-vinoy-ink/70 bg-vinoy-cream rounded-lg px-3 py-2 mb-3">
          Draw locked: {entrants.length} entrants → bracket of {drawSize}.
          Unlock to add or reorder.
        </p>
      )}

      <ol className="space-y-2 mb-3">
        {entrants.map((e) => (
          <li
            key={e.id}
            className="flex items-center gap-2 bg-vinoy-cream rounded-xl px-3 py-2"
          >
            <span className="w-7 shrink-0 h-7 rounded-full bg-vinoy-green text-white text-xs font-bold flex items-center justify-center">
              {e.seed}
            </span>
            <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center gap-2">
              <input
                type="text"
                value={e.p1}
                disabled={locked}
                onChange={(ev) =>
                  ifAuthed(() =>
                    dispatch({
                      type: 'UPDATE_BRACKET_ENTRANT',
                      payload: { id: e.id, patch: { p1: ev.target.value } },
                    })
                  )
                }
                placeholder={isDoubles ? 'Player 1' : 'Player'}
                className="flex-1 min-w-0 bg-white border border-vinoy-border rounded-lg px-2 py-1 text-sm"
              />
              {isDoubles && (
                <>
                  <span className="hidden sm:inline text-gray-400 shrink-0">/</span>
                  <input
                    type="text"
                    value={e.p2}
                    disabled={locked}
                    onChange={(ev) =>
                      ifAuthed(() =>
                        dispatch({
                          type: 'UPDATE_BRACKET_ENTRANT',
                          payload: { id: e.id, patch: { p2: ev.target.value } },
                        })
                      )
                    }
                    placeholder="Player 2"
                    className="flex-1 min-w-0 bg-white border border-vinoy-border rounded-lg px-2 py-1 text-sm"
                  />
                </>
              )}
            </div>
            {!locked && (
              <button
                onClick={() =>
                  ifAuthed(() =>
                    dispatch({
                      type: 'REMOVE_BRACKET_ENTRANT',
                      payload: { id: e.id },
                    })
                  )
                }
                className="shrink-0 text-gray-400 hover:text-red-600 px-1"
                title="Remove entrant"
              >
                ✕
              </button>
            )}
          </li>
        ))}
      </ol>

      {!locked && (
        <div className="flex items-center gap-2">
          <span className="w-7 shrink-0 text-center font-bold text-gray-300">
            {entrants.length + 1}
          </span>
          <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center gap-2">
            <input
              type="text"
              value={p1}
              onChange={(e) => setP1(e.target.value)}
              placeholder={isDoubles ? 'Player 1' : 'Player'}
              className="flex-1 min-w-0 bg-white border-2 border-vinoy-border rounded-lg px-2 py-1 text-sm"
              onKeyDown={(e) => e.key === 'Enter' && add()}
            />
            {isDoubles && (
              <>
                <span className="hidden sm:inline text-gray-400 shrink-0">/</span>
                <input
                  type="text"
                  value={p2}
                  onChange={(e) => setP2(e.target.value)}
                  placeholder="Player 2"
                  className="flex-1 min-w-0 bg-white border-2 border-vinoy-border rounded-lg px-2 py-1 text-sm"
                  onKeyDown={(e) => e.key === 'Enter' && add()}
                />
              </>
            )}
          </div>
          <button
            onClick={add}
            className="shrink-0 px-3 py-1 rounded-lg bg-vinoy-green text-white text-sm font-semibold"
          >
            Add
          </button>
        </div>
      )}

      <p className="text-xs text-vinoy-ink/60 mt-3">
        Seeds are assigned in the order entrants are added; top seeds get
        any first-round byes when the field isn't a power of two.
      </p>
    </section>
  )
}

function computeRounds(bracket) {
  if (!bracket?.rounds) return 0
  return bracket.rounds
}
