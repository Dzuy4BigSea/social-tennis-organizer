import React, { useState } from 'react'
import { generateRoomCode, setRoomCodeInURL, getStoredPin } from '../utils/share.js'
import PinGate, { PinSetup } from './PinGate.jsx'
import SaveStatus from './SaveStatus.jsx'

export default function Setup({ state, dispatch, saveStatus }) {
  const { tournament, divisions } = state
  const [showPinSetup, setShowPinSetup] = useState(false)
  const [showPinGate, setShowPinGate] = useState(false)

  const proAuthed = !tournament.pinHash || Boolean(getStoredPin())

  function ensureRoomCode() {
    if (tournament.roomCode) return tournament.roomCode
    const code = generateRoomCode()
    dispatch({ type: 'SET_ROOM_CODE', payload: code })
    setRoomCodeInURL(code)
    return code
  }

  async function handlePinSet(hash) {
    dispatch({ type: 'SET_PIN_HASH', payload: hash })
    setShowPinSetup(false)
  }

  function ifAuthed(fn) {
    if (proAuthed) fn()
    else setShowPinGate(true)
  }

  const allLocked = divisions.length > 0 && divisions.every(d => d.locked)

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <Header
        tournament={tournament}
        roomCode={tournament.roomCode}
        onRoomCode={ensureRoomCode}
        onSetPin={() => setShowPinSetup(true)}
        saveStatus={saveStatus}
        onFixPin={() => setShowPinGate(true)}
      />

      <section className="bg-white rounded-2xl border border-gray-200 p-4 mb-4">
        <h2 className="font-bold text-tennis-green mb-3">Tournament details</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs text-gray-600">Name</span>
            <input
              type="text"
              value={tournament.name}
              onChange={(e) =>
                ifAuthed(() =>
                  dispatch({ type: 'SET_TOURNAMENT', payload: { name: e.target.value } })
                )
              }
              placeholder="e.g. Spring Feed-In"
              className="mt-1 w-full border-2 border-gray-200 rounded-xl px-3 py-2 focus:border-tennis-green focus:outline-none"
            />
          </label>
          <label className="block">
            <span className="text-xs text-gray-600">Date</span>
            <input
              type="date"
              value={tournament.date}
              onChange={(e) =>
                ifAuthed(() =>
                  dispatch({ type: 'SET_TOURNAMENT', payload: { date: e.target.value } })
                )
              }
              className="mt-1 w-full border-2 border-gray-200 rounded-xl px-3 py-2 focus:border-tennis-green focus:outline-none"
            />
          </label>
        </div>

        <RoundsEditor
          passes={tournament.passes}
          locked={divisions.some(d => d.locked)}
          onChange={(passes) =>
            ifAuthed(() => dispatch({ type: 'SET_PASSES', payload: passes }))
          }
        />
      </section>

      {!tournament.pinHash && (
        <div className="bg-yellow-50 border border-yellow-300 rounded-2xl p-4 mb-4 text-sm">
          <p className="text-yellow-900">
            <strong>No PIN set.</strong> Anyone with the room code can edit scores. Set a PIN so only the pros can score.
          </p>
          <button
            onClick={() => setShowPinSetup(true)}
            className="mt-2 px-4 py-2 rounded-xl bg-yellow-500 text-white font-semibold"
          >
            Set PIN
          </button>
        </div>
      )}

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-tennis-green">Divisions</h2>
          <button
            onClick={() =>
              ifAuthed(() => dispatch({ type: 'ADD_DIVISION', payload: { name: '' } }))
            }
            className="px-3 py-2 rounded-xl bg-tennis-green text-white font-semibold text-sm"
          >
            + Add Division
          </button>
        </div>

        {divisions.length === 0 ? (
          <div className="bg-white border-2 border-dashed border-gray-300 rounded-2xl p-8 text-center text-gray-500">
            No divisions yet. Add one to start (e.g. <em>Mens 4.0/Open</em>).
          </div>
        ) : (
          <div className="space-y-3">
            {divisions.map((d) => (
              <DivisionCard
                key={d.id}
                division={d}
                dispatch={dispatch}
                ifAuthed={ifAuthed}
              />
            ))}
          </div>
        )}
      </section>

      {allLocked && (
        <div className="sticky bottom-4 mt-6 z-30">
          <button
            onClick={() => ifAuthed(() => dispatch({ type: 'START_LIVE' }))}
            className="w-full py-4 rounded-2xl bg-tennis-green text-white text-lg font-bold shadow-lg"
          >
            Start Tournament →
          </button>
        </div>
      )}

      {showPinSetup && (
        <PinSetup onSet={handlePinSet} onClose={() => setShowPinSetup(false)} />
      )}
      {showPinGate && (
        <PinGate
          pinHash={tournament.pinHash}
          onUnlock={() => setShowPinGate(false)}
          onClose={() => setShowPinGate(false)}
        />
      )}
    </div>
  )
}

function RoundsEditor({ passes, locked, onChange }) {
  const list = passes && passes.length ? passes : [{ winningScore: 7 }]

  function update(idx, ws) {
    const next = list.map((p, i) =>
      i === idx ? { ...p, winningScore: Math.max(1, parseInt(ws) || 1) } : p
    )
    onChange(next)
  }
  function add() {
    onChange([...list, { winningScore: list[list.length - 1]?.winningScore || 7 }])
  }
  function remove(idx) {
    if (list.length <= 1) return
    onChange(list.filter((_, i) => i !== idx))
  }

  return (
    <div className="mt-4 pt-4 border-t border-gray-100">
      <div className="flex items-center justify-between mb-2">
        <div>
          <div className="text-sm font-semibold text-gray-700">Rounds</div>
          <div className="text-xs text-gray-500">
            Each round is a full round-robin. Set a target score per round.
          </div>
        </div>
        {!locked && (
          <button
            type="button"
            onClick={add}
            className="px-3 py-1.5 rounded-lg border border-tennis-green text-tennis-green text-sm font-semibold"
          >
            + Round
          </button>
        )}
      </div>
      {locked && (
        <p className="text-xs text-yellow-700 bg-yellow-50 rounded-lg px-3 py-2 mb-2">
          Schedule already generated. Unlock divisions to change the round count.
        </p>
      )}
      <ol className="space-y-2">
        {list.map((p, idx) => (
          <li
            key={idx}
            className="flex items-center gap-3 bg-gray-50 rounded-xl px-3 py-2"
          >
            <span className="w-8 h-8 rounded-full bg-tennis-green text-white flex items-center justify-center font-bold text-sm">
              {idx + 1}
            </span>
            <span className="text-sm text-gray-700 flex-1">First to</span>
            <input
              type="number"
              min="1"
              max="21"
              value={p.winningScore}
              disabled={locked}
              onChange={(e) => update(idx, e.target.value)}
              className="w-20 text-center text-lg font-bold border-2 border-gray-200 rounded-lg px-2 py-1 focus:border-tennis-green focus:outline-none disabled:bg-gray-100"
            />
            <span className="text-sm text-gray-500">games</span>
            {!locked && list.length > 1 && (
              <button
                type="button"
                onClick={() => remove(idx)}
                className="text-gray-400 hover:text-red-600 px-1"
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

function Header({ tournament, roomCode, onRoomCode, onSetPin, saveStatus, onFixPin }) {
  const shareUrl = roomCode
    ? `${window.location.origin}${window.location.pathname}#room=${roomCode}`
    : ''

  return (
    <header className="mb-5">
      <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
        <h1 className="text-2xl font-bold text-tennis-green">Feed-In Tournament</h1>
        <div className="flex items-center gap-2">
          <SaveStatus status={saveStatus} hasRoomCode={Boolean(roomCode)} onFix={onFixPin} />
          <button
            onClick={onSetPin}
            className="text-xs px-3 py-2 rounded-xl border border-gray-300 bg-white"
            title="Set or change pro PIN"
          >
            {tournament.pinHash ? 'Change PIN' : 'Set PIN'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-3 flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="text-xs text-gray-500">Room code (share with iPads)</div>
          <div className="font-mono text-2xl tracking-wider text-tennis-green truncate">
            {roomCode || '—'}
          </div>
        </div>
        {!roomCode ? (
          <button
            onClick={onRoomCode}
            className="px-4 py-2 rounded-xl bg-tennis-green text-white font-semibold"
          >
            Create Room
          </button>
        ) : (
          <button
            onClick={() => navigator.clipboard?.writeText(shareUrl)}
            className="px-3 py-2 rounded-xl border border-gray-300 text-sm"
          >
            Copy link
          </button>
        )}
      </div>
    </header>
  )
}

function DivisionCard({ division, dispatch, ifAuthed }) {
  const { id, name, courtLabel, pairs, locked } = division
  const [expanded, setExpanded] = useState(true)
  const canLock = pairs.length >= 2

  return (
    <div className="bg-white rounded-2xl border border-gray-200">
      <div className="p-4 flex items-center gap-3 flex-wrap">
        <button
          onClick={() => setExpanded((e) => !e)}
          className="text-gray-400 text-lg"
          aria-label="toggle"
        >
          {expanded ? '▾' : '▸'}
        </button>
        <input
          type="text"
          value={name}
          onChange={(e) =>
            ifAuthed(() =>
              dispatch({
                type: 'UPDATE_DIVISION',
                payload: { id, patch: { name: e.target.value } },
              })
            )
          }
          placeholder="Division name (e.g. Mens 4.0/Open)"
          className="flex-1 min-w-[10rem] font-bold text-lg text-gray-900 bg-transparent focus:outline-none border-b border-transparent focus:border-tennis-green"
          disabled={locked}
        />
        <input
          type="text"
          value={courtLabel}
          onChange={(e) =>
            ifAuthed(() =>
              dispatch({
                type: 'UPDATE_DIVISION',
                payload: { id, patch: { courtLabel: e.target.value } },
              })
            )
          }
          placeholder="Court"
          className="w-20 text-sm text-center border border-gray-200 rounded-lg px-2 py-1"
          disabled={locked}
        />
        {locked ? (
          <button
            onClick={() =>
              ifAuthed(() =>
                dispatch({ type: 'UNLOCK_DIVISION', payload: { divisionId: id } })
              )
            }
            className="px-3 py-2 rounded-xl border border-yellow-400 text-yellow-700 text-sm font-semibold"
          >
            Unlock
          </button>
        ) : (
          <>
            <button
              onClick={() =>
                ifAuthed(() =>
                  dispatch({ type: 'LOCK_DIVISION', payload: { divisionId: id } })
                )
              }
              disabled={!canLock}
              className="px-3 py-2 rounded-xl bg-tennis-green text-white text-sm font-semibold disabled:opacity-40"
            >
              Generate Schedule
            </button>
            <button
              onClick={() =>
                ifAuthed(() => {
                  if (confirm(`Remove division "${name || 'unnamed'}"?`))
                    dispatch({ type: 'REMOVE_DIVISION', payload: id })
                })
              }
              className="px-2 py-2 rounded-xl text-gray-400 hover:text-red-600"
              title="Remove"
            >
              ✕
            </button>
          </>
        )}
      </div>

      {expanded && (
        <div className="border-t border-gray-100 p-4">
          <div className="text-xs text-gray-500 mb-2">
            Pairs ({pairs.length}) ·{' '}
            {pairs.length < 2 ? 'add at least 2' : `${pairs.length} round-robin teams`}
          </div>
          <PairList division={division} dispatch={dispatch} ifAuthed={ifAuthed} />
        </div>
      )}
    </div>
  )
}

function PairList({ division, dispatch, ifAuthed }) {
  const [p1, setP1] = useState('')
  const [p2, setP2] = useState('')
  const { pairs, locked } = division

  function add() {
    if (!p1.trim() && !p2.trim()) return
    ifAuthed(() => {
      dispatch({
        type: 'ADD_PAIR',
        payload: { divisionId: division.id, p1: p1.trim(), p2: p2.trim() },
      })
      setP1('')
      setP2('')
    })
  }

  return (
    <div>
      <ol className="space-y-2 mb-3">
        {pairs.map((pair, idx) => (
          <li
            key={pair.id}
            className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2"
          >
            <span className="w-6 text-center font-bold text-gray-500">{idx + 1}</span>
            <input
              type="text"
              value={pair.p1}
              onChange={(e) =>
                ifAuthed(() =>
                  dispatch({
                    type: 'UPDATE_PAIR',
                    payload: {
                      divisionId: division.id,
                      pairId: pair.id,
                      patch: { p1: e.target.value },
                    },
                  })
                )
              }
              placeholder="Player 1"
              disabled={locked}
              className="flex-1 bg-white border border-gray-200 rounded-lg px-2 py-1 text-sm"
            />
            <span className="text-gray-400">/</span>
            <input
              type="text"
              value={pair.p2}
              onChange={(e) =>
                ifAuthed(() =>
                  dispatch({
                    type: 'UPDATE_PAIR',
                    payload: {
                      divisionId: division.id,
                      pairId: pair.id,
                      patch: { p2: e.target.value },
                    },
                  })
                )
              }
              placeholder="Player 2"
              disabled={locked}
              className="flex-1 bg-white border border-gray-200 rounded-lg px-2 py-1 text-sm"
            />
            {!locked && (
              <button
                onClick={() =>
                  ifAuthed(() =>
                    dispatch({
                      type: 'REMOVE_PAIR',
                      payload: { divisionId: division.id, pairId: pair.id },
                    })
                  )
                }
                className="text-gray-400 hover:text-red-600 px-1"
                title="Remove pair"
              >
                ✕
              </button>
            )}
          </li>
        ))}
      </ol>

      {!locked && (
        <div className="flex items-center gap-2">
          <span className="w-6 text-center font-bold text-gray-300">{pairs.length + 1}</span>
          <input
            type="text"
            value={p1}
            onChange={(e) => setP1(e.target.value)}
            placeholder="Player 1"
            className="flex-1 bg-white border-2 border-gray-200 rounded-lg px-2 py-1 text-sm"
            onKeyDown={(e) => e.key === 'Enter' && add()}
          />
          <span className="text-gray-400">/</span>
          <input
            type="text"
            value={p2}
            onChange={(e) => setP2(e.target.value)}
            placeholder="Player 2"
            className="flex-1 bg-white border-2 border-gray-200 rounded-lg px-2 py-1 text-sm"
            onKeyDown={(e) => e.key === 'Enter' && add()}
          />
          <button
            onClick={add}
            className="px-3 py-1 rounded-lg bg-tennis-green text-white text-sm font-semibold"
          >
            Add
          </button>
        </div>
      )}
    </div>
  )
}
