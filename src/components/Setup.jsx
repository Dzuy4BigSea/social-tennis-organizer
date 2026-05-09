import React, { useState } from 'react'
import { generateRoomCode, setRoomCodeInURL, getStoredPin } from '../utils/share.js'
import PinGate, { PinSetup } from './PinGate.jsx'
import SaveStatus from './SaveStatus.jsx'
import Brand from './Brand.jsx'
import SetupBracket from './SetupBracket.jsx'
import ComingSoon from './ComingSoon.jsx'
import {
  getEventType,
  VARIANTS,
  RATINGS_STANDARD,
  RATINGS_COMBO,
  getRatingLabel,
} from '../utils/eventTypes.js'

export default function Setup({ state, dispatch, saveStatus, onGoHome }) {
  const { tournament, divisions, bracket } = state
  const [showPinSetup, setShowPinSetup] = useState(false)
  const [showPinGate, setShowPinGate] = useState(false)

  const proAuthed = !tournament.pinHash || Boolean(getStoredPin())
  const evt = getEventType(tournament.type)
  const engine = evt.engine

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

  function handleGoHome() {
    onGoHome?.()
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <Header
        tournament={tournament}
        roomCode={tournament.roomCode}
        onRoomCode={ensureRoomCode}
        onSetPin={() => setShowPinSetup(true)}
        onGoHome={handleGoHome}
        saveStatus={saveStatus}
        onFixPin={() => setShowPinGate(true)}
      />

      <EventDetailsCard
        tournament={tournament}
        evt={evt}
        ifAuthed={ifAuthed}
        dispatch={dispatch}
        rrLocked={divisions.some(d => d.locked) || !!bracket?.locked}
      />

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

      {engine === 'roundRobin' && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-xl font-bold text-vinoy-green">Divisions</h2>
            <button
              onClick={() =>
                ifAuthed(() => dispatch({ type: 'ADD_DIVISION', payload: { name: '' } }))
              }
              className="px-3 py-2 rounded-xl bg-vinoy-green text-white font-semibold text-sm"
            >
              + Add Division
            </button>
          </div>

          {divisions.length === 0 ? (
            <div className="bg-white border-2 border-dashed border-vinoy-border rounded-2xl p-8 text-center text-vinoy-ink/60">
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
                  entrantKind={evt.entrantKind}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {engine === 'singleElim' && (
        <SetupBracket state={state} dispatch={dispatch} ifAuthed={ifAuthed} />
      )}

      {engine === 'comingSoon' && <ComingSoon state={state} />}

      {canGoLive(engine, divisions, bracket) && (
        <div className="sticky bottom-4 mt-6 z-30">
          <button
            onClick={() => ifAuthed(() => dispatch({ type: 'START_LIVE' }))}
            className="w-full py-4 rounded-2xl bg-vinoy-green text-white text-lg font-bold shadow-lg"
          >
            Start Event →
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

/**
 * Returns true when the current setup is complete enough to flip
 * into the Live phase. Round-robin needs at least one locked
 * division; bracket events need a generated draw; coming-soon types
 * never enter the live phase from this screen.
 */
function canGoLive(engine, divisions, bracket) {
  if (engine === 'roundRobin') {
    return divisions.length > 0 && divisions.every(d => d.locked)
  }
  if (engine === 'singleElim') {
    return !!bracket?.locked && (bracket?.matches?.length || 0) > 0
  }
  return false
}

/**
 * Top card for any event type: name, type label, variant chips,
 * rating chips, and dates. Round-robin events also include the
 * Rounds editor in here so the per-pass target lives next to the
 * other event metadata rather than buried below the divisions list.
 */
function EventDetailsCard({ tournament, evt, ifAuthed, dispatch, rrLocked }) {
  function set(patch) {
    ifAuthed(() => dispatch({ type: 'SET_TOURNAMENT', payload: patch }))
  }
  return (
    <section className="bg-white rounded-2xl border border-vinoy-border p-4 mb-4 shadow-sm">
      <div className="flex items-baseline justify-between mb-3 gap-2 flex-wrap">
        <h2 className="font-display text-xl font-bold text-vinoy-green">
          Event details
        </h2>
        <span className="text-xs uppercase tracking-wider px-2 py-0.5 rounded bg-vinoy-cream border border-vinoy-border text-vinoy-ink/70">
          {evt.label}
        </span>
      </div>

      <label className="block mb-3">
        <span className="text-xs font-semibold text-vinoy-ink/70">Name</span>
        <input
          type="text"
          value={tournament.name}
          onChange={(e) => set({ name: e.target.value })}
          placeholder="e.g. Spring Mixer 4.0"
          className="mt-1 w-full border-2 border-vinoy-border rounded-xl px-3 py-2 focus:border-vinoy-green focus:outline-none"
        />
      </label>

      <div className="mb-3">
        <div className="text-xs font-semibold text-vinoy-ink/70 mb-1">Variant</div>
        <div className="flex flex-wrap gap-2">
          {VARIANTS.map(v => (
            <Chip
              key={v.id}
              active={tournament.variant === v.id}
              onClick={() => set({ variant: v.id })}
              label={v.label}
            />
          ))}
        </div>
      </div>

      <div className="mb-3">
        <div className="text-xs font-semibold text-vinoy-ink/70 mb-1">
          Rating {tournament.rating && (
            <span className="font-normal text-vinoy-ink/50">
              · {getRatingLabel(tournament.rating)}
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {RATINGS_STANDARD.map(r => (
            <Chip
              key={r.id}
              active={tournament.rating === r.id}
              onClick={() => set({ rating: tournament.rating === r.id ? '' : r.id })}
              label={r.label}
              small
            />
          ))}
        </div>
        <details className="mt-2 text-xs">
          <summary className="cursor-pointer text-vinoy-ink/60 hover:text-vinoy-green select-none">
            Combo ratings
          </summary>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {RATINGS_COMBO.map(r => (
              <Chip
                key={r.id}
                active={tournament.rating === r.id}
                onClick={() => set({ rating: tournament.rating === r.id ? '' : r.id })}
                label={r.label}
                small
              />
            ))}
          </div>
        </details>
      </div>

      <div className="border-t border-vinoy-border pt-3">
        <label className="flex items-center gap-2 mb-3 cursor-pointer">
          <input
            type="checkbox"
            checked={!!tournament.ongoing}
            onChange={(e) => set({ ongoing: e.target.checked })}
            className="w-4 h-4 accent-vinoy-green"
          />
          <span className="text-sm text-vinoy-ink/80">Ongoing (recurring)</span>
        </label>
        {!tournament.ongoing && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs font-semibold text-vinoy-ink/70">Start date</span>
              <input
                type="date"
                value={tournament.startDate || ''}
                onChange={(e) => set({ startDate: e.target.value })}
                className="mt-1 w-full border-2 border-vinoy-border rounded-xl px-3 py-2 focus:border-vinoy-green focus:outline-none"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-vinoy-ink/70">
                End date <span className="font-normal text-vinoy-ink/40">(optional)</span>
              </span>
              <input
                type="date"
                value={tournament.endDate || ''}
                onChange={(e) => set({ endDate: e.target.value })}
                className="mt-1 w-full border-2 border-vinoy-border rounded-xl px-3 py-2 focus:border-vinoy-green focus:outline-none"
              />
            </label>
          </div>
        )}
      </div>

      {evt.engine === 'roundRobin' && (
        <RoundsEditor
          passes={tournament.passes}
          locked={rrLocked}
          onChange={(passes) =>
            ifAuthed(() => dispatch({ type: 'SET_PASSES', payload: passes }))
          }
        />
      )}
    </section>
  )
}

function Chip({ active, onClick, label, small }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'rounded-full border-2 transition font-semibold',
        small ? 'px-3 py-1 text-xs' : 'px-4 py-1.5 text-sm',
        active
          ? 'bg-vinoy-green border-vinoy-green text-white'
          : 'bg-white border-vinoy-border text-vinoy-ink/70 hover:border-vinoy-green hover:text-vinoy-green',
      ].join(' ')}
    >
      {label}
    </button>
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

function Header({ tournament, roomCode, onRoomCode, onSetPin, onGoHome, saveStatus, onFixPin }) {
  const shareUrl = roomCode
    ? `${window.location.origin}${window.location.pathname}#room=${roomCode}`
    : ''

  return (
    <header className="mb-5">
      <div className="flex items-start justify-between mb-3 gap-3 flex-wrap">
        <Brand subtitle={tournament.name} onClick={onGoHome} />
        <div className="flex items-center gap-2 flex-wrap">
          <SaveStatus status={saveStatus} hasRoomCode={Boolean(roomCode)} onFix={onFixPin} />
          <button
            onClick={onGoHome}
            className="text-xs px-3 py-2 rounded-xl border border-vinoy-border bg-white hover:bg-vinoy-cream"
            title="Back to home"
          >
            Home
          </button>
          <button
            onClick={onSetPin}
            className="text-xs px-3 py-2 rounded-xl border border-vinoy-border bg-white hover:bg-vinoy-cream"
            title="Set or change pro PIN"
          >
            {tournament.pinHash ? 'Change PIN' : 'Set PIN'}
          </button>
        </div>
      </div>
      <div className="vinoy-rule mb-4" />

      <div className="bg-white rounded-2xl border border-vinoy-border p-3 flex items-center gap-3">
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

function DivisionCard({ division, dispatch, ifAuthed, entrantKind = 'doubles' }) {
  const { id, name, courtLabel, pairs, locked } = division
  const [expanded, setExpanded] = useState(true)
  const canLock = pairs.length >= 2
  const isDoubles = entrantKind !== 'singles'

  return (
    <div className="bg-white rounded-2xl border border-vinoy-border shadow-sm">
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
        <div className="border-t border-vinoy-border p-4">
          <div className="text-xs text-vinoy-ink/60 mb-2">
            {isDoubles ? 'Pairs' : 'Players'} ({pairs.length}) ·{' '}
            {pairs.length < 2
              ? 'add at least 2'
              : `${pairs.length} round-robin entries`}
          </div>
          <PairList
            division={division}
            dispatch={dispatch}
            ifAuthed={ifAuthed}
            isDoubles={isDoubles}
          />
        </div>
      )}
    </div>
  )
}

function PairList({ division, dispatch, ifAuthed, isDoubles = true }) {
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
            className="flex items-center gap-2 bg-vinoy-cream rounded-xl px-3 py-2"
          >
            <span className="w-6 shrink-0 text-center font-bold text-vinoy-ink/50">
              {idx + 1}
            </span>
            <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center gap-2">
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
                placeholder={isDoubles ? 'Player 1' : 'Player'}
                disabled={locked}
                className="flex-1 min-w-0 bg-white border border-vinoy-border rounded-lg px-2 py-1 text-sm"
              />
              {isDoubles && (
                <>
                  <span className="hidden sm:inline text-gray-400 shrink-0">/</span>
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
                      type: 'REMOVE_PAIR',
                      payload: { divisionId: division.id, pairId: pair.id },
                    })
                  )
                }
                className="shrink-0 text-gray-400 hover:text-red-600 px-1"
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
          <span className="w-6 shrink-0 text-center font-bold text-gray-300">
            {pairs.length + 1}
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
    </div>
  )
}
