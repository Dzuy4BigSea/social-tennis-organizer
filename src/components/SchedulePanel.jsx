import React from 'react'
import { resolveSlot, entrantLabel } from '../utils/bracket.js'

/**
 * Per-match scheduling editor. Lets the pro stamp each match with a
 * date + time so a printed draw / schedule can be posted before
 * participants are even known (semis at 2pm Saturday, etc.). The
 * editor is read-only when the relevant draw isn't locked yet —
 * scheduling individual matches before the structure is fixed has
 * no real meaning.
 */
export default function SchedulePanel({ state, dispatch, ifAuthed }) {
  const lockedDivs = (state.divisions || []).filter(
    d => d.locked && (d.matches?.length || 0) > 0
  )
  if (lockedDivs.length === 0) return null

  return (
    <section className="bg-white rounded-2xl border border-vinoy-border p-4 mb-4 shadow-sm">
      <div className="flex items-baseline justify-between mb-3 flex-wrap gap-2">
        <h2 className="font-display text-xl font-bold text-vinoy-green">Match schedule</h2>
        <span className="text-xs text-vinoy-ink/60">
          Optional — appears on the printed draw and the live cards.
          Set times even before participants are known so marketing
          schedules can post.
        </span>
      </div>
      {lockedDivs.map(d => (
        <div key={d.id} className="mb-4 last:mb-0">
          <div className="text-sm font-semibold text-vinoy-ink/80 mb-1">
            {d.name || 'Division'}
            <span className="ml-2 text-xs font-normal text-vinoy-ink/50">
              {kindLabel(d.kind)}
            </span>
          </div>
          {d.kind === 'roundRobin' || d.kind === 'feedIn' ? (
            <RoundRobinDivisionSchedule
              division={d}
              dispatch={dispatch}
              ifAuthed={ifAuthed}
            />
          ) : (
            <BracketSchedule
              bracket={d}
              dispatch={dispatch}
              ifAuthed={ifAuthed}
            />
          )}
        </div>
      ))}
    </section>
  )
}

function kindLabel(kind) {
  if (kind === 'doubleElim') return 'Double Elim'
  if (kind === 'singleElim') return 'Single Elim'
  if (kind === 'feedIn') return 'Feed-In'
  return 'Round Robin'
}

function RoundRobinDivisionSchedule({ division, dispatch, ifAuthed }) {
  const pairByNum = (num) => division.pairs[num - 1]
  const matches = division.matches
  return (
    <div className="mb-4 last:mb-0">
      <div className="text-sm font-semibold text-vinoy-ink/80 mb-2">
        {division.name || 'Division'}
        {division.courtLabel && (
          <span className="ml-2 text-xs text-vinoy-ink/60">Court {division.courtLabel}</span>
        )}
      </div>
      <ul className="divide-y divide-vinoy-border/60">
        {matches.map(m => {
          const pA = pairByNum(m.pairA)
          const pB = pairByNum(m.pairB)
          return (
            <li key={m.id} className="py-2 flex items-center gap-2 flex-wrap">
              <span className="text-xs text-vinoy-ink/50 w-16 shrink-0 font-mono">
                R{m.pass || 1}·{m.round}.{m.slot}
              </span>
              <span className="flex-1 min-w-[10rem] text-sm">
                <span className="font-medium">{pA?.label || `Pair ${m.pairA}`}</span>
                <span className="text-vinoy-ink/40 mx-2">vs</span>
                <span className="font-medium">{pB?.label || `Pair ${m.pairB}`}</span>
              </span>
              <input
                type="datetime-local"
                value={m.scheduledAt || ''}
                onChange={(e) =>
                  ifAuthed(() =>
                    dispatch({
                      type: 'SET_MATCH_SCHEDULE',
                      payload: {
                        divisionId: division.id,
                        matchId: m.id,
                        scheduledAt: e.target.value,
                      },
                    })
                  )
                }
                className="border border-vinoy-border rounded-lg px-2 py-1 text-sm"
              />
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function BracketSchedule({ bracket, dispatch, ifAuthed }) {
  const groups = groupForSchedule(bracket)
  return (
    <div className="space-y-4">
      {groups.map(g => (
        <div key={g.title}>
          <div className="text-sm font-semibold text-vinoy-ink/80 mb-2">{g.title}</div>
          <ul className="divide-y divide-vinoy-border/60">
            {g.matches.map(m => (
              <BracketScheduleRow
                key={m.id}
                bracket={bracket}
                match={m}
                dispatch={dispatch}
                ifAuthed={ifAuthed}
              />
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}

function BracketScheduleRow({ bracket, match, dispatch, ifAuthed }) {
  const a = resolveSlot(bracket, match.pA)
  const b = resolveSlot(bracket, match.pB)
  const labelA = sideLabel(a, match.pA)
  const labelB = sideLabel(b, match.pB)
  return (
    <li className="py-2 flex items-center gap-2 flex-wrap">
      <span className="text-xs text-vinoy-ink/50 w-20 shrink-0 font-mono">
        {matchShort(match.id)}
      </span>
      <span className="flex-1 min-w-[10rem] text-sm">
        <span className="font-medium">{labelA}</span>
        <span className="text-vinoy-ink/40 mx-2">vs</span>
        <span className="font-medium">{labelB}</span>
      </span>
      <input
        type="datetime-local"
        value={match.scheduledAt || ''}
        onChange={(e) =>
          ifAuthed(() =>
            dispatch({
              type: 'SET_BRACKET_MATCH_SCHEDULE',
              payload: {
                divisionId: bracket.id,
                matchId: match.id,
                scheduledAt: e.target.value,
              },
            })
          )
        }
        className="border border-vinoy-border rounded-lg px-2 py-1 text-sm"
      />
    </li>
  )
}

function sideLabel(side, slot) {
  if (side?.kind === 'entrant') return entrantLabel(side.entrant)
  if (side?.kind === 'bye') return 'Bye'
  if (side?.kind === 'pendingWinner')
    return `Winner of ${matchShort(side.matchId)}`
  if (side?.kind === 'pendingLoser')
    return `Loser of ${matchShort(side.matchId)}`
  return '—'
}

function matchShort(id) {
  if (!id) return ''
  if (id === 'gf-m1') return 'GF'
  if (id === 'gf-m2') return 'Reset'
  let m = id.match(/^wb-r(\d+)-m(\d+)$/)
  if (m) return `WB ${m[1]}.${m[2]}`
  m = id.match(/^lb-r(\d+)-m(\d+)$/)
  if (m) return `LB ${m[1]}.${m[2]}`
  m = id.match(/^r(\d+)-m(\d+)$/)
  if (m) return `R${m[1]}.${m[2]}`
  return id
}

function groupForSchedule(bracket) {
  const groups = []
  const wb = bracket.matches.filter(m => m.bracket === 'main')
  const lb = bracket.matches.filter(m => m.bracket === 'losers')
  const gf = bracket.matches.filter(m => m.bracket === 'grandFinal' || m.bracket === 'reset')
  if (bracket.kind === 'doubleElim') {
    if (wb.length) groups.push({ title: "Winner's Bracket", matches: wb })
    if (lb.length) groups.push({ title: "Loser's Bracket", matches: lb })
    if (gf.length) groups.push({ title: 'Grand Final', matches: gf })
  } else {
    if (wb.length) groups.push({ title: 'Bracket', matches: wb })
  }
  return groups
}
