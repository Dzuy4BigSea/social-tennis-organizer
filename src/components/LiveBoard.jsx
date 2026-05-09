import React, { useState, useMemo } from 'react'
import StandingsGrid from './StandingsGrid.jsx'
import PinGate from './PinGate.jsx'
import SaveStatus from './SaveStatus.jsx'
import Brand from './Brand.jsx'
import LiveBracket from './LiveBracket.jsx'
import ComingSoon from './ComingSoon.jsx'
import { upcomingMatches } from '../utils/schedule.js'
import { getStoredPin } from '../utils/share.js'
import { getEventType } from '../utils/eventTypes.js'

export default function LiveBoard({ state, dispatch, saveStatus, onGoHome }) {
  const { tournament, divisions } = state
  const evt = getEventType(tournament.type)
  const engine = evt.engine
  const liveDivisions = divisions.filter(d => d.locked)
  const [activeId, setActiveId] = useState(liveDivisions[0]?.id ?? null)
  const [showPinGate, setShowPinGate] = useState(false)
  const [pendingAction, setPendingAction] = useState(null)

  const proAuthed = !tournament.pinHash || Boolean(getStoredPin())

  const active = liveDivisions.find(d => d.id === activeId) ?? liveDivisions[0]

  function ifAuthed(fn) {
    if (proAuthed) fn()
    else {
      setPendingAction(() => fn)
      setShowPinGate(true)
    }
  }

  // Round-robin needs at least one locked division to have anything
  // to show; bracket events have their own emptiness check inside
  // LiveBracket. Coming-soon types just render the placeholder.
  const noDivisions = engine === 'roundRobin' && !active

  return (
    <div className="max-w-5xl mx-auto px-3 py-4">
      <header className="mb-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <Brand
            subtitle={tournament.name}
            compact
            onClick={onGoHome}
          />
          <div className="flex items-center gap-2 flex-wrap">
            <SaveStatus
              status={saveStatus}
              hasRoomCode={Boolean(tournament.roomCode)}
              onFix={() => setShowPinGate(true)}
            />
            {!proAuthed && tournament.pinHash && (
              <button
                onClick={() => setShowPinGate(true)}
                className="px-3 py-2 rounded-xl border border-vinoy-green text-vinoy-green text-sm font-semibold"
              >
                Pro mode
              </button>
            )}
            <button
              onClick={onGoHome}
              className="px-3 py-2 rounded-xl border border-vinoy-border text-sm bg-white hover:bg-vinoy-cream"
              title="Back to home"
            >
              Home
            </button>
            <button
              onClick={() => ifAuthed(() => dispatch({ type: 'BACK_TO_SETUP' }))}
              className="px-3 py-2 rounded-xl border border-vinoy-border text-sm bg-white hover:bg-vinoy-cream"
            >
              Setup
            </button>
          </div>
        </div>
        {tournament.roomCode && (
          <p className="text-xs text-vinoy-ink/60 font-mono mt-1 ml-1">
            Room {tournament.roomCode}
          </p>
        )}
        <div className="vinoy-rule mt-3" />
      </header>

      {engine === 'roundRobin' && (
        noDivisions ? (
          <div className="max-w-3xl mx-auto p-6 text-center text-vinoy-ink/60">
            No divisions are locked. Go back to setup and lock at least one
            division.
          </div>
        ) : (
          <>
            <DivisionTabs
              divisions={liveDivisions}
              activeId={active.id}
              onSelect={setActiveId}
            />
            <DivisionPanel
              division={active}
              passes={tournament.passes}
              dispatch={dispatch}
              ifAuthed={ifAuthed}
              proAuthed={proAuthed}
            />
          </>
        )
      )}

      {engine === 'singleElim' && (
        <LiveBracket
          state={state}
          dispatch={dispatch}
          ifAuthed={ifAuthed}
          proAuthed={proAuthed}
        />
      )}

      {engine === 'comingSoon' && <ComingSoon state={state} />}

      {showPinGate && (
        <PinGate
          pinHash={tournament.pinHash}
          onUnlock={() => {
            setShowPinGate(false)
            if (pendingAction) {
              pendingAction()
              setPendingAction(null)
            }
          }}
          onClose={() => {
            setShowPinGate(false)
            setPendingAction(null)
          }}
        />
      )}
    </div>
  )
}

function DivisionTabs({ divisions, activeId, onSelect }) {
  return (
    <div className="overflow-x-auto -mx-3 px-3 mb-3">
      <div className="flex gap-2 min-w-max">
        {divisions.map(d => {
          const completed = d.matches.filter(m => m.completed).length
          const total = d.matches.length
          const isActive = d.id === activeId
          return (
            <button
              key={d.id}
              onClick={() => onSelect(d.id)}
              className={`px-4 py-2 rounded-xl font-semibold whitespace-nowrap transition ${
                isActive
                  ? 'bg-tennis-green text-white shadow'
                  : 'bg-white border border-gray-200 text-gray-700'
              }`}
            >
              <div className="text-sm">{d.name || 'Division'}</div>
              <div className={`text-xs ${isActive ? 'text-white/80' : 'text-gray-500'}`}>
                {d.courtLabel ? `Court ${d.courtLabel} · ` : ''}
                {completed}/{total} matches
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function winningScoreFor(passes, match) {
  const idx = (match?.pass || 1) - 1
  return passes?.[idx]?.winningScore ?? passes?.[0]?.winningScore ?? 7
}

function DivisionPanel({ division, passes, dispatch, ifAuthed, proAuthed }) {
  const queue = useMemo(() => upcomingMatches(division.matches, 3), [division.matches])
  const [now, next, after] = queue
  const allDone = division.matches.length > 0 && queue.length === 0
  const [editing, setEditing] = useState(null) // a completed match being re-edited

  return (
    <div className="space-y-3">
      {allDone ? (
        <div className="bg-tennis-green text-white rounded-2xl p-6 text-center">
          <h2 className="text-2xl font-bold">Division complete!</h2>
          <p className="text-white/80 text-sm mt-1">
            All matches scored. Final standings below.
          </p>
        </div>
      ) : (
        <NowPlayingCard
          match={now}
          division={division}
          winningScore={winningScoreFor(passes, now)}
          dispatch={dispatch}
          ifAuthed={ifAuthed}
          proAuthed={proAuthed}
        />
      )}

      {(next || after) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {next && <UpcomingCard label="On deck" match={next} division={division} passes={passes} />}
          {after && <UpcomingCard label="In the hole" match={after} division={division} passes={passes} />}
        </div>
      )}

      <CompletedSummary
        division={division}
        proAuthed={proAuthed}
        onEdit={(m) => ifAuthed(() => setEditing(m))}
      />

      <StandingsGrid division={division} passes={passes} />

      {editing && (
        <ScoreEditModal
          match={division.matches.find(m => m.id === editing.id) || editing}
          division={division}
          winningScore={winningScoreFor(passes, editing)}
          dispatch={dispatch}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}

function pairByNum(division, num) {
  return division.pairs[num - 1]
}

function NowPlayingCard({ match, division, winningScore, dispatch, ifAuthed, proAuthed }) {
  const pairA = pairByNum(division, match.pairA)
  const pairB = pairByNum(division, match.pairB)

  return (
    <div className="bg-white rounded-2xl border-2 border-tennis-green shadow-md overflow-hidden">
      <div className="bg-tennis-green text-white px-4 py-2 flex items-center justify-between">
        <span className="font-bold uppercase text-sm tracking-wide">Now playing</span>
        <span className="text-sm">
          Round {match.pass || 1} · first to {winningScore}
          {division.courtLabel && ` · Court ${division.courtLabel}`}
        </span>
      </div>
      <div className="p-4">
        <ScoreEntry
          match={match}
          pairA={pairA}
          pairB={pairB}
          winningScore={winningScore}
          divisionId={division.id}
          dispatch={dispatch}
          ifAuthed={ifAuthed}
          proAuthed={proAuthed}
        />
        {match.bye && (
          <div className="mt-3 text-xs text-gray-500 border-t border-gray-100 pt-2">
            Bye this round: <strong>{pairByNum(division, match.bye)?.label || `Pair ${match.bye}`}</strong>
          </div>
        )}
      </div>
    </div>
  )
}

function ScoreEntry({ match, pairA, pairB, winningScore, divisionId, dispatch, ifAuthed, proAuthed }) {
  const [scoreA, setScoreA] = useState(match.scoreA ?? '')
  const [scoreB, setScoreB] = useState(match.scoreB ?? '')
  const [editing, setEditing] = useState(!match.completed)

  // If the match changes (queue advances), reset local state.
  React.useEffect(() => {
    setScoreA(match.scoreA ?? '')
    setScoreB(match.scoreB ?? '')
    setEditing(!match.completed)
  }, [match.id])

  function submit() {
    const a = parseInt(scoreA)
    const b = parseInt(scoreB)
    if (isNaN(a) || isNaN(b)) return
    if (a < 0 || b < 0) return
    if (a === b) return alert('A feed-in match must have a winner.')
    if (Math.max(a, b) !== winningScore) {
      const ok = confirm(
        `Winner's score should be ${winningScore} (first to ${winningScore}). Save anyway?`
      )
      if (!ok) return
    }
    ifAuthed(() => {
      dispatch({
        type: 'RECORD_SCORE',
        payload: { divisionId, matchId: match.id, scoreA: a, scoreB: b },
      })
      setEditing(false)
    })
  }

  function clear() {
    ifAuthed(() => {
      dispatch({ type: 'CLEAR_SCORE', payload: { divisionId, matchId: match.id } })
      setScoreA('')
      setScoreB('')
      setEditing(true)
    })
  }

  return (
    <div className="space-y-3">
      <PairLine
        num={match.pairA}
        pair={pairA}
        scoreValue={scoreA}
        onScoreChange={setScoreA}
        winningScore={winningScore}
        disabled={!proAuthed || !editing}
      />
      <div className="text-center text-gray-400 text-sm font-bold">vs</div>
      <PairLine
        num={match.pairB}
        pair={pairB}
        scoreValue={scoreB}
        onScoreChange={setScoreB}
        winningScore={winningScore}
        disabled={!proAuthed || !editing}
      />
      {proAuthed && (
        <div className="flex gap-2 pt-1">
          {editing ? (
            <>
              <button
                onClick={submit}
                className="flex-1 py-3 rounded-xl bg-tennis-green text-white font-bold text-lg"
              >
                Submit Score
              </button>
              <QuickFill
                winningScore={winningScore}
                onPick={(a, b) => { setScoreA(String(a)); setScoreB(String(b)) }}
              />
            </>
          ) : (
            <button
              onClick={clear}
              className="flex-1 py-2 rounded-xl border border-gray-300 text-gray-700 text-sm"
            >
              Edit score
            </button>
          )}
        </div>
      )}
      {!proAuthed && (
        <p className="text-xs text-center text-gray-500 pt-1">
          Pro PIN required to enter scores.
        </p>
      )}
    </div>
  )
}

function PairLine({ num, pair, scoreValue, onScoreChange, winningScore, disabled }) {
  return (
    <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
      <div className="flex-shrink-0 w-9 h-9 rounded-full bg-tennis-green text-white flex items-center justify-center font-bold">
        {num}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-gray-900 truncate">
          {pair?.label || `Pair ${num}`}
        </div>
      </div>
      <input
        type="number"
        inputMode="numeric"
        min="0"
        max={winningScore + 5}
        value={scoreValue}
        onChange={(e) => onScoreChange(e.target.value)}
        disabled={disabled}
        placeholder="—"
        className="w-16 h-12 text-center text-2xl font-mono font-bold border-2 border-gray-300 rounded-xl focus:border-tennis-green focus:outline-none disabled:bg-gray-100 disabled:text-gray-700"
      />
    </div>
  )
}

function QuickFill({ winningScore, onPick }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="px-3 py-3 rounded-xl border border-gray-300 text-sm font-semibold text-gray-700"
        title="Quick fill"
      >
        ⋯
      </button>
      {open && (
        <div className="absolute right-0 bottom-full mb-2 bg-white border border-gray-200 rounded-xl shadow-lg p-2 grid grid-cols-2 gap-1 z-20 min-w-[10rem]">
          {Array.from({ length: winningScore }, (_, i) => i).map(n => (
            <button
              key={`A${n}`}
              onClick={() => { onPick(winningScore, n); setOpen(false) }}
              className="text-xs px-2 py-1 rounded hover:bg-gray-100 text-left"
            >
              {winningScore}–{n} (1)
            </button>
          ))}
          {Array.from({ length: winningScore }, (_, i) => i).map(n => (
            <button
              key={`B${n}`}
              onClick={() => { onPick(n, winningScore); setOpen(false) }}
              className="text-xs px-2 py-1 rounded hover:bg-gray-100 text-left"
            >
              {n}–{winningScore} (2)
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function UpcomingCard({ label, match, division, passes }) {
  const pairA = pairByNum(division, match.pairA)
  const pairB = pairByNum(division, match.pairB)
  const ws = winningScoreFor(passes, match)
  return (
    <div className="bg-white rounded-2xl border border-vinoy-border p-3 shadow-sm">
      <div className="text-xs uppercase tracking-wide text-vinoy-gold font-semibold mb-1">
        {label} · Round {match.pass || 1} · to {ws}
      </div>
      <div className="flex items-center gap-2">
        <span className="w-6 h-6 rounded-full bg-gray-200 text-gray-700 flex items-center justify-center text-xs font-bold">
          {match.pairA}
        </span>
        <span className="font-medium text-sm flex-1 truncate">
          {pairA?.label || `Pair ${match.pairA}`}
        </span>
      </div>
      <div className="text-xs text-gray-400 my-1 ml-8">vs</div>
      <div className="flex items-center gap-2">
        <span className="w-6 h-6 rounded-full bg-gray-200 text-gray-700 flex items-center justify-center text-xs font-bold">
          {match.pairB}
        </span>
        <span className="font-medium text-sm flex-1 truncate">
          {pairB?.label || `Pair ${match.pairB}`}
        </span>
      </div>
    </div>
  )
}

function CompletedSummary({ division, proAuthed, onEdit }) {
  const [open, setOpen] = useState(false)
  const completed = division.matches.filter(m => m.completed)
  if (completed.length === 0) return null

  return (
    <details
      className="bg-white rounded-2xl border border-vinoy-border shadow-sm"
      open={open}
      onToggle={(e) => setOpen(e.currentTarget.open)}
    >
      <summary className="cursor-pointer list-none p-3 flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-700">
          Completed matches ({completed.length})
          {proAuthed && (
            <span className="ml-2 text-xs text-gray-400 font-normal">
              tap a row to edit
            </span>
          )}
        </span>
        <span className="text-gray-400 text-xs">{open ? 'hide' : 'show'}</span>
      </summary>
      <ul className="border-t border-gray-100 divide-y divide-gray-100">
        {completed.map(m => {
          const pairA = pairByNum(division, m.pairA)
          const pairB = pairByNum(division, m.pairB)
          const aWon = m.scoreA > m.scoreB
          const Row = (
            <>
              <span className="text-xs text-gray-500 w-14 shrink-0">
                R{m.pass || 1}·{m.round}
              </span>
              <span className={`flex-1 truncate ${aWon ? 'font-bold text-tennis-green' : ''}`}>
                {pairA?.label || `Pair ${m.pairA}`}
              </span>
              <span className="font-mono w-12 text-center">
                {m.scoreA}–{m.scoreB}
              </span>
              <span className={`flex-1 truncate text-right ${!aWon ? 'font-bold text-tennis-green' : ''}`}>
                {pairB?.label || `Pair ${m.pairB}`}
              </span>
            </>
          )
          return proAuthed ? (
            <li key={m.id}>
              <button
                type="button"
                onClick={() => onEdit?.(m)}
                className="w-full p-3 flex items-center gap-2 text-sm text-left hover:bg-gray-50"
              >
                {Row}
                <span className="text-gray-300 ml-1" aria-hidden>✎</span>
              </button>
            </li>
          ) : (
            <li key={m.id} className="p-3 flex items-center gap-2 text-sm">
              {Row}
            </li>
          )
        })}
      </ul>
    </details>
  )
}

function ScoreEditModal({ match, division, winningScore, dispatch, onClose }) {
  const pairA = pairByNum(division, match.pairA)
  const pairB = pairByNum(division, match.pairB)
  const [scoreA, setScoreA] = useState(String(match.scoreA ?? ''))
  const [scoreB, setScoreB] = useState(String(match.scoreB ?? ''))

  function save() {
    const a = parseInt(scoreA)
    const b = parseInt(scoreB)
    if (isNaN(a) || isNaN(b) || a < 0 || b < 0) return
    if (a === b) return alert('A feed-in match must have a winner.')
    if (Math.max(a, b) !== winningScore) {
      const ok = confirm(
        `Winner's score should be ${winningScore} (first to ${winningScore}). Save anyway?`
      )
      if (!ok) return
    }
    dispatch({
      type: 'RECORD_SCORE',
      payload: { divisionId: division.id, matchId: match.id, scoreA: a, scoreB: b },
    })
    onClose?.()
  }

  function clear() {
    if (!confirm('Mark this match as not played and put it back in the queue?')) return
    dispatch({ type: 'CLEAR_SCORE', payload: { divisionId: division.id, matchId: match.id } })
    onClose?.()
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl p-5 w-full max-w-sm shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3">
          <h2 className="text-lg font-bold text-tennis-green">Edit score</h2>
          <p className="text-xs text-gray-500">
            Round {match.pass || 1} · Match {match.round}.{match.slot} · first to {winningScore}
          </p>
        </div>

        <div className="space-y-2 mb-4">
          <Row
            num={match.pairA}
            label={pairA?.label || `Pair ${match.pairA}`}
            value={scoreA}
            onChange={setScoreA}
            max={winningScore + 5}
          />
          <div className="text-center text-gray-400 text-xs font-bold">vs</div>
          <Row
            num={match.pairB}
            label={pairB?.label || `Pair ${match.pairB}`}
            value={scoreB}
            onChange={setScoreB}
            max={winningScore + 5}
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={onClose}
            className="py-3 rounded-xl border-2 border-gray-300 text-gray-700 font-semibold"
          >
            Cancel
          </button>
          <button
            onClick={save}
            className="py-3 rounded-xl bg-tennis-green text-white font-bold"
          >
            Save
          </button>
        </div>
        <button
          onClick={clear}
          className="w-full mt-2 py-2 text-sm text-red-600 hover:underline"
        >
          Mark as not played
        </button>
      </div>
    </div>
  )
}

function Row({ num, label, value, onChange, max }) {
  return (
    <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
      <div className="flex-shrink-0 w-9 h-9 rounded-full bg-tennis-green text-white flex items-center justify-center font-bold">
        {num}
      </div>
      <div className="flex-1 min-w-0 font-semibold text-gray-900 truncate">{label}</div>
      <input
        type="number"
        inputMode="numeric"
        min="0"
        max={max}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-16 h-12 text-center text-2xl font-mono font-bold border-2 border-gray-300 rounded-xl focus:border-tennis-green focus:outline-none"
        autoFocus={num === 1}
      />
    </div>
  )
}
