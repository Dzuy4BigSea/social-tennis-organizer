import React, { useState } from 'react'
import { generateRoomCode, setRoomCodeInURL, getStoredPin } from '../utils/share.js'
import PinGate, { PinSetup } from './PinGate.jsx'
import SaveStatus from './SaveStatus.jsx'
import Brand from './Brand.jsx'
import SetupBracket from './SetupBracket.jsx'
import SchedulePanel from './SchedulePanel.jsx'
import OrnamentalRule from './OrnamentalRule.jsx'
import AddDivisionDialog from './AddDivisionDialog.jsx'
import { getVariant, getRatingLabel } from '../utils/eventTypes.js'

export default function Setup({ state, dispatch, saveStatus, onGoHome, onPrint }) {
  const { tournament, divisions } = state
  const [showPinSetup, setShowPinSetup] = useState(false)
  const [showPinGate, setShowPinGate] = useState(false)
  const [showAddDivision, setShowAddDivision] = useState(false)

  const proAuthed = !tournament.pinHash || Boolean(getStoredPin())
  const anyLocked = (divisions || []).some(d => d.locked)

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

  function handleAddDivision(payload) {
    ifAuthed(() => dispatch({ type: 'ADD_DIVISION', payload }))
    setShowAddDivision(false)
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <Header
        tournament={tournament}
        roomCode={tournament.roomCode}
        onRoomCode={ensureRoomCode}
        onSetPin={() => setShowPinSetup(true)}
        onGoHome={onGoHome}
        onPrint={onPrint}
        saveStatus={saveStatus}
        onFixPin={() => setShowPinGate(true)}
      />

      <EventDetailsCard
        tournament={tournament}
        ifAuthed={ifAuthed}
        dispatch={dispatch}
        anyLocked={anyLocked}
      />

      {!tournament.pinHash && (
        <div className="bg-yellow-50 border border-yellow-300 rounded-2xl p-4 mb-4 text-sm">
          <p className="text-yellow-900">
            <strong>No PIN set.</strong> Anyone with the event code can edit scores. Set a PIN so only the pros can score.
          </p>
          <button
            onClick={() => setShowPinSetup(true)}
            className="mt-2 px-4 py-2 rounded-xl bg-yellow-500 text-white font-semibold"
          >
            Set PIN
          </button>
        </div>
      )}

      <section className="mb-2">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h2 className="font-display text-xl font-bold text-vinoy-green">Divisions</h2>
          <button
            onClick={() => setShowAddDivision(true)}
            className="px-3 py-2 rounded-xl bg-vinoy-green text-white font-semibold text-sm"
          >
            + Add division
          </button>
        </div>

        {divisions.length === 0 ? (
          <div className="bg-white border-2 border-dashed border-vinoy-border rounded-2xl p-8 text-center text-vinoy-ink/60 mb-4">
            No divisions yet. Add one to start (e.g.{' '}
            <em>Men's 4.0 Single Elim</em> or <em>Mixed 3.5 Round Robin</em>).
          </div>
        ) : (
          <div className="space-y-3 mb-4">
            {divisions.map(d =>
              d.kind === 'roundRobin' ? (
                <RoundRobinDivisionCard
                  key={d.id}
                  division={d}
                  dispatch={dispatch}
                  ifAuthed={ifAuthed}
                />
              ) : (
                <SetupBracket
                  key={d.id}
                  bracket={d}
                  dispatch={dispatch}
                  ifAuthed={ifAuthed}
                  onRemove={() =>
                    ifAuthed(() => {
                      if (confirm(`Remove division "${d.name || 'unnamed'}"?`))
                        dispatch({ type: 'REMOVE_DIVISION', payload: d.id })
                    })
                  }
                />
              )
            )}
          </div>
        )}
      </section>

      <SchedulePanel state={state} dispatch={dispatch} ifAuthed={ifAuthed} />

      {anyLocked && (
        <div className="sticky bottom-4 mt-6 z-30">
          <button
            onClick={() => ifAuthed(() => dispatch({ type: 'START_LIVE' }))}
            className="w-full py-4 rounded-2xl bg-vinoy-green text-white text-lg font-bold shadow-lg"
          >
            Start Event →
          </button>
        </div>
      )}

      {showAddDivision && (
        <AddDivisionDialog
          defaults={tournament.defaults || {}}
          onCreate={handleAddDivision}
          onClose={() => setShowAddDivision(false)}
        />
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
 * Top card for the event itself: name, dates, times, ongoing flag,
 * and the round-count editor for round-robin divisions. Variant /
 * rating / format used to live here too — they've moved into the
 * Add Division dialog so each division can hold its own values.
 */
function EventDetailsCard({ tournament, ifAuthed, dispatch, anyLocked }) {
  function set(patch) {
    ifAuthed(() => dispatch({ type: 'SET_TOURNAMENT', payload: patch }))
  }
  return (
    <section className="bg-white rounded-2xl border border-vinoy-border p-4 mb-4 shadow-sm">
      <div className="flex items-baseline justify-between mb-3 gap-2 flex-wrap">
        <h2 className="font-display text-xl font-bold text-vinoy-green">
          Event details
        </h2>
      </div>

      <label className="block mb-3">
        <span className="text-xs font-semibold text-vinoy-ink/70">Name</span>
        <input
          type="text"
          value={tournament.name}
          onChange={(e) => set({ name: e.target.value })}
          placeholder="e.g. Spring Mixer 2026"
          className="mt-1 w-full border-2 border-vinoy-border rounded-xl px-3 py-2 focus:border-vinoy-green focus:outline-none"
        />
      </label>

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
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <label className="block col-span-2 sm:col-span-1">
              <span className="text-xs font-semibold text-vinoy-ink/70">Start date</span>
              <input
                type="date"
                value={tournament.startDate || ''}
                onChange={(e) => set({ startDate: e.target.value })}
                className="mt-1 w-full border-2 border-vinoy-border rounded-xl px-3 py-2 focus:border-vinoy-green focus:outline-none"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-vinoy-ink/70">Start time</span>
              <input
                type="time"
                value={tournament.startTime || ''}
                onChange={(e) => set({ startTime: e.target.value })}
                className="mt-1 w-full border-2 border-vinoy-border rounded-xl px-3 py-2 focus:border-vinoy-green focus:outline-none"
              />
            </label>
            <label className="block col-span-2 sm:col-span-1">
              <span className="text-xs font-semibold text-vinoy-ink/70">
                End date <span className="font-normal text-vinoy-ink/40">(opt)</span>
              </span>
              <input
                type="date"
                value={tournament.endDate || ''}
                onChange={(e) => set({ endDate: e.target.value })}
                className="mt-1 w-full border-2 border-vinoy-border rounded-xl px-3 py-2 focus:border-vinoy-green focus:outline-none"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-vinoy-ink/70">
                End time <span className="font-normal text-vinoy-ink/40">(opt)</span>
              </span>
              <input
                type="time"
                value={tournament.endTime || ''}
                onChange={(e) => set({ endTime: e.target.value })}
                className="mt-1 w-full border-2 border-vinoy-border rounded-xl px-3 py-2 focus:border-vinoy-green focus:outline-none"
              />
            </label>
          </div>
        )}
      </div>

      <RoundsEditor
        passes={tournament.passes}
        locked={anyLocked}
        onChange={(passes) =>
          ifAuthed(() => dispatch({ type: 'SET_PASSES', payload: passes }))
        }
      />
    </section>
  )
}

/**
 * Per-pass winning-score editor. Round-robin divisions read this
 * pass list when generating their schedule, so changes after a draw
 * is locked have no effect (the schedule's already baked).
 */
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
    <div className="mt-4 pt-4 border-t border-vinoy-border">
      <div className="flex items-center justify-between mb-2">
        <div>
          <div className="text-sm font-semibold text-vinoy-ink/80">
            Round-robin rounds
          </div>
          <div className="text-xs text-vinoy-ink/60">
            New round-robin divisions use this pass list. Set a target
            score per round.
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
          A division has already been generated. Unlock it to change
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

function Header({ tournament, roomCode, onRoomCode, onSetPin, onGoHome, onPrint, saveStatus, onFixPin }) {
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
          {onPrint && (
            <button
              onClick={onPrint}
              className="text-xs px-3 py-2 rounded-xl border border-vinoy-border bg-white hover:bg-vinoy-cream"
              title="Print or save as PDF"
            >
              Print
            </button>
          )}
          <button
            onClick={onSetPin}
            className="text-xs px-3 py-2 rounded-xl border border-vinoy-border bg-white hover:bg-vinoy-cream"
            title="Set or change pro PIN"
          >
            {tournament.pinHash ? 'Change PIN' : 'Set PIN'}
          </button>
        </div>
      </div>
      <OrnamentalRule className="mb-4" />

      <div className="bg-white rounded-2xl border border-vinoy-border p-3 flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="text-xs text-vinoy-ink/60">Event code (share with iPads)</div>
          <div className="font-mono text-2xl tracking-wider text-vinoy-green truncate">
            {roomCode || '—'}
          </div>
        </div>
        {!roomCode ? (
          <button
            onClick={onRoomCode}
            className="px-4 py-2 rounded-xl bg-vinoy-green text-white font-semibold"
          >
            Generate code
          </button>
        ) : (
          <button
            onClick={() => navigator.clipboard?.writeText(shareUrl)}
            className="px-3 py-2 rounded-xl border border-vinoy-border text-sm"
          >
            Copy link
          </button>
        )}
      </div>
    </header>
  )
}

/**
 * Setup card for one round-robin division. Variant / rating /
 * entrant-kind chips up top — read-only labels here since they were
 * picked in the Add Division dialog and changing them after the fact
 * usually means the wrong division was added.
 */
function RoundRobinDivisionCard({ division, dispatch, ifAuthed }) {
  const { id, name, courtLabel, pairs, locked } = division
  const [expanded, setExpanded] = useState(true)
  const canLock = pairs.length >= 2
  const isDoubles = division.entrantKind !== 'singles'

  return (
    <div className="bg-white rounded-2xl border border-vinoy-border shadow-sm">
      <div className="p-4 flex items-center gap-3 flex-wrap">
        <button
          onClick={() => setExpanded((e) => !e)}
          className="text-vinoy-ink/40 text-lg"
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
          placeholder="Division name (e.g. Men's 4.0)"
          className="flex-1 min-w-[10rem] font-bold text-lg text-vinoy-ink bg-transparent focus:outline-none border-b border-transparent focus:border-vinoy-green"
          disabled={locked}
        />
        <input
          type="text"
          value={courtLabel || ''}
          onChange={(e) =>
            ifAuthed(() =>
              dispatch({
                type: 'UPDATE_DIVISION',
                payload: { id, patch: { courtLabel: e.target.value } },
              })
            )
          }
          placeholder="Court"
          className="w-20 text-sm text-center border border-vinoy-border rounded-lg px-2 py-1"
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
              className="px-3 py-2 rounded-xl bg-vinoy-green text-white text-sm font-semibold disabled:opacity-40"
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
              className="px-2 py-2 rounded-xl text-vinoy-ink/40 hover:text-red-600"
              title="Remove"
            >
              ✕
            </button>
          </>
        )}
      </div>

      <div className="px-4 pb-2 -mt-2 flex items-center gap-1.5 flex-wrap">
        <DivisionMeta division={division} />
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

/** Read-only chip strip showing variant / rating / entrantKind. */
function DivisionMeta({ division }) {
  const variantLabel =
    division.variant && division.variant !== 'all'
      ? getVariant(division.variant).label
      : 'All'
  const ratingLabel = getRatingLabel(division.rating)
  const entrantLabel = division.entrantKind === 'doubles' ? 'Doubles' : 'Singles'
  return (
    <>
      <MetaChip>{variantLabel}</MetaChip>
      {ratingLabel && <MetaChip>{ratingLabel}</MetaChip>}
      <MetaChip>{entrantLabel}</MetaChip>
    </>
  )
}

function MetaChip({ children }) {
  return (
    <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-vinoy-cream border border-vinoy-border text-vinoy-ink/70">
      {children}
    </span>
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
                  <span className="hidden sm:inline text-vinoy-ink/30 shrink-0">/</span>
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
                className="shrink-0 text-vinoy-ink/40 hover:text-red-600 px-1"
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
          <span className="w-6 shrink-0 text-center font-bold text-vinoy-ink/30">
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
                <span className="hidden sm:inline text-vinoy-ink/30 shrink-0">/</span>
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
