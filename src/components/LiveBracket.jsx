import React, { useState, useMemo } from 'react'
import { resolveSlot, entrantLabel } from '../utils/bracket.js'

/**
 * Live view for a single-elimination bracket. Two stacked panels:
 *
 *   1. "Now playing" — first not-yet-completed match, with score
 *      entry. Walkovers (auto-completed bye matches) are skipped so
 *      pros don't see a meaningless prompt.
 *   2. Full bracket — round columns left-to-right, each match card
 *      showing both sides and the result. Tapping a completed match
 *      (in pro mode) re-opens the score editor; tapping a pending
 *      match where both sides are known opens the same entry UI.
 */
export default function LiveBracket({ state, dispatch, ifAuthed, proAuthed }) {
  const { bracket } = state
  const [editing, setEditing] = useState(null)

  const enriched = useMemo(() => enrichMatches(bracket), [bracket])

  if (!bracket || !bracket.matches?.length) {
    return (
      <div className="bg-white rounded-2xl border border-vinoy-border p-6 text-center text-vinoy-ink/60">
        No draw generated yet. Head back to Setup to add entrants and lock the
        bracket.
      </div>
    )
  }

  const isDoubleElim = bracket.type === 'doubleElim'
  const visibleMatches = isDoubleElim
    ? enriched.filter(m => m.bracket !== 'reset' || isResetNeeded(enriched))
    : enriched
  const playable = visibleMatches.find(m => m.ready && !m.completed)
  const championMatch = pickChampionMatch(visibleMatches, isDoubleElim)
  const isComplete = championMatch?.completed

  function openMatch(match) {
    if (!proAuthed) return
    if (!match.ready && !match.completed) return
    ifAuthed(() => setEditing(match))
  }

  return (
    <div className="space-y-3">
      {isComplete ? (
        <div className="bg-vinoy-green text-white rounded-2xl p-6 text-center">
          <h2 className="font-display text-2xl font-bold">Champion!</h2>
          <p className="text-white/80 text-sm mt-1">
            {entrantLabel(winnerEntrant(bracket, champion))}
          </p>
        </div>
      ) : playable ? (
        <NowPlayingCard match={playable} onClick={() => openMatch(playable)} />
      ) : (
        <div className="bg-white rounded-2xl border border-vinoy-border p-4 text-center text-vinoy-ink/70 text-sm">
          Waiting on earlier matches before the next can start.
        </div>
      )}

      {isDoubleElim ? (
        <DoubleElimGrid
          bracket={bracket}
          matches={visibleMatches}
          onPick={openMatch}
          proAuthed={proAuthed}
        />
      ) : (
        <BracketGrid
          bracket={bracket}
          matches={enriched}
          onPick={openMatch}
          proAuthed={proAuthed}
        />
      )}

      {editing && (
        <BracketScoreModal
          match={enriched.find(m => m.id === editing.id) || editing}
          dispatch={dispatch}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}

/**
 * Walk every match and resolve its sides via the bracket.
 * `ready` = both sides resolved to a real entrant (or one side has a
 * bye and the match is auto-completed). The order returned matches
 * the source order of bracket.matches, which is round-major so the
 * last item is the final.
 */
function enrichMatches(bracket) {
  if (!bracket) return []
  return bracket.matches.map((m) => {
    const a = resolveSlot(bracket, m.pA)
    const b = resolveSlot(bracket, m.pB)
    const ready =
      (a.kind === 'entrant' || a.kind === 'bye') &&
      (b.kind === 'entrant' || b.kind === 'bye')
    return { ...m, sideA: a, sideB: b, ready }
  })
}

function winnerEntrant(bracket, match) {
  if (!match?.completed) return null
  const slot = match.winnerSlot === 'A' ? match.sideA : match.sideB
  return slot?.kind === 'entrant' ? slot.entrant : null
}

/**
 * Tournament-deciding match for the champion banner.
 *
 * - Single elim: the very last match (the WB Final).
 * - Double elim: GF1 if the WB-side wins (no reset needed); GF2
 *   otherwise. Falls back to GF1 while undecided.
 */
function pickChampionMatch(matches, isDoubleElim) {
  if (!matches.length) return null
  if (!isDoubleElim) return matches[matches.length - 1]
  const gf1 = matches.find(m => m.id === 'gf-m1')
  const gf2 = matches.find(m => m.id === 'gf-m2')
  if (!gf1) return matches[matches.length - 1]
  if (!gf1.completed) return gf1
  // gf-m1 completed: WB-side is pA, LB-side is pB by construction.
  // If WB-side wins, no reset. Otherwise the reset decides it.
  if (gf1.winnerSlot === 'A') return gf1
  return gf2 || gf1
}

/**
 * The grand-final reset only matters when the LB-side wins GF1, since
 * the WB-side entered with zero losses. We hide the reset entirely
 * until needed so it doesn't clutter the bracket view in the common
 * case where the WB-side closes the tournament.
 */
function isResetNeeded(matches) {
  const gf1 = matches.find(m => m.id === 'gf-m1')
  return gf1?.completed && gf1.winnerSlot === 'B'
}

function NowPlayingCard({ match, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white rounded-2xl border-2 border-vinoy-green shadow-md overflow-hidden"
    >
      <div className="bg-vinoy-green text-white px-4 py-2 flex items-center justify-between">
        <span className="font-bold uppercase text-sm tracking-wide">
          Now playing
        </span>
        <span className="text-sm">Round {match.round}</span>
      </div>
      <div className="p-4 space-y-2">
        <SideRow side={match.sideA} score={match.scoreA} />
        <div className="text-center text-gray-400 text-sm font-bold">vs</div>
        <SideRow side={match.sideB} score={match.scoreB} />
        <p className="text-xs text-vinoy-ink/60 text-center pt-1">
          Tap to enter score
        </p>
      </div>
    </button>
  )
}

function SideRow({ side, score, dim }) {
  const label =
    side?.kind === 'entrant'
      ? entrantLabel(side.entrant)
      : side?.kind === 'bye'
      ? 'BYE'
      : side?.kind === 'pendingWinner'
      ? `Winner of ${matchLabel(side.matchId)}`
      : side?.kind === 'pendingLoser'
      ? `Loser of ${matchLabel(side.matchId)}`
      : '—'
  const seed = side?.kind === 'entrant' ? side.entrant.seed : null
  return (
    <div
      className={`flex items-center gap-3 rounded-xl p-3 ${
        dim ? 'bg-gray-50 text-gray-400' : 'bg-vinoy-cream'
      }`}
    >
      {seed != null ? (
        <span className="w-8 h-8 rounded-full bg-vinoy-green text-white text-xs font-bold flex items-center justify-center shrink-0">
          {seed}
        </span>
      ) : (
        <span className="w-8 h-8 shrink-0" />
      )}
      <span className="flex-1 min-w-0 font-semibold truncate">{label}</span>
      {score != null && (
        <span className="font-mono text-2xl font-bold w-12 text-center">
          {score}
        </span>
      )}
    </div>
  )
}

function matchLabel(id) {
  if (!id) return ''
  if (id === 'gf-m1') return 'GF'
  if (id === 'gf-m2') return 'GF Reset'
  let m = id.match(/^wb-r(\d+)-m(\d+)$/)
  if (m) return `WB ${m[1]}.${m[2]}`
  m = id.match(/^lb-r(\d+)-m(\d+)$/)
  if (m) return `LB ${m[1]}.${m[2]}`
  m = id.match(/^r(\d+)-m(\d+)$/)
  if (m) return `R${m[1]}.${m[2]}`
  return id
}

/**
 * Double-elimination layout: three stacked panels (Winner's Bracket,
 * Loser's Bracket, Grand Final). Each panel renders the same round-
 * column grid as the single-elim view, so a coach can scan WB and LB
 * progress side-by-side without a custom bracket-line diagram.
 *
 * Stacking instead of overlaying keeps the layout usable on iPad
 * portrait — a true crossed bracket would need a much larger canvas.
 */
function DoubleElimGrid({ bracket, matches, onPick, proAuthed }) {
  const wb = matches.filter(m => m.bracket === 'main')
  const lb = matches.filter(m => m.bracket === 'losers')
  const gf = matches.filter(m => m.bracket === 'grandFinal' || m.bracket === 'reset')

  return (
    <div className="space-y-3">
      <BracketSection
        title="Winner’s Bracket"
        matches={wb}
        totalRounds={Math.max(...wb.map(m => m.round), 0)}
        onPick={onPick}
        proAuthed={proAuthed}
      />
      {lb.length > 0 && (
        <BracketSection
          title="Loser’s Bracket"
          matches={lb}
          totalRounds={Math.max(...lb.map(m => m.round), 0)}
          onPick={onPick}
          proAuthed={proAuthed}
          accent="gold"
        />
      )}
      {gf.length > 0 && (
        <BracketSection
          title="Grand Final"
          matches={gf}
          totalRounds={Math.max(...gf.map(m => m.slot), 0)}
          // Each GF match is its own "round" visually; pass slot as round.
          roundOverride={(m) => m.slot}
          roundLabel={(r, total) => (r === 1 ? 'GF' : 'Reset')}
          onPick={onPick}
          proAuthed={proAuthed}
          accent="green"
        />
      )}
    </div>
  )
}

/**
 * A bracket panel with a header and round columns. The shared
 * round-column logic used to live inside BracketGrid; this thin
 * wrapper lets DoubleElimGrid render WB / LB / GF with consistent
 * styling and small per-section overrides (round labels, accent).
 */
function BracketSection({
  title,
  matches,
  totalRounds,
  onPick,
  proAuthed,
  accent,
  roundOverride,
  roundLabel,
}) {
  const cols = []
  for (let r = 1; r <= totalRounds; r++) {
    cols.push(
      matches.filter(m => (roundOverride ? roundOverride(m) : m.round) === r)
    )
  }
  const headerClass =
    accent === 'gold'
      ? 'border-l-4 border-l-vinoy-gold'
      : accent === 'green'
      ? 'border-l-4 border-l-vinoy-green'
      : ''
  return (
    <div className={`bg-white rounded-2xl border border-vinoy-border shadow-sm overflow-hidden ${headerClass}`}>
      <div className="px-4 py-3 border-b border-vinoy-border">
        <h3 className="font-display text-lg font-bold text-vinoy-green">{title}</h3>
      </div>
      <div className="overflow-x-auto p-3">
        <div className="flex gap-3 min-w-max">
          {cols.map((roundMatches, idx) => (
            <div key={idx} className="flex flex-col gap-3 min-w-[12rem]">
              <div className="text-xs font-semibold text-vinoy-ink/60 uppercase tracking-wider px-2">
                {roundLabel
                  ? roundLabel(idx + 1, totalRounds)
                  : sectionRoundLabel(idx + 1, totalRounds)}
              </div>
              {roundMatches.map((m) => (
                <BracketMatch
                  key={m.id}
                  match={m}
                  onClick={() => onPick(m)}
                  clickable={proAuthed && (m.ready || m.completed)}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function sectionRoundLabel(round, total) {
  if (round === total) return 'Final'
  if (round === total - 1) return 'Semis'
  if (round === total - 2 && total > 3) return 'Quarters'
  return `Round ${round}`
}

function BracketGrid({ bracket, matches, onPick, proAuthed }) {
  const rounds = bracket.rounds || Math.max(...matches.map(m => m.round))
  const cols = []
  for (let r = 1; r <= rounds; r++) {
    cols.push(matches.filter(m => m.round === r))
  }

  return (
    <div className="bg-white rounded-2xl border border-vinoy-border shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-vinoy-border">
        <h3 className="font-display text-lg font-bold text-vinoy-green">
          Bracket
        </h3>
      </div>
      <div className="overflow-x-auto p-3">
        <div className="flex gap-3 min-w-max">
          {cols.map((roundMatches, idx) => (
            <div key={idx} className="flex flex-col gap-3 min-w-[12rem]">
              <div className="text-xs font-semibold text-vinoy-ink/60 uppercase tracking-wider px-2">
                {roundLabel(idx + 1, rounds)}
              </div>
              {roundMatches.map((m) => (
                <BracketMatch
                  key={m.id}
                  match={m}
                  onClick={() => onPick(m)}
                  clickable={proAuthed && (m.ready || m.completed)}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function roundLabel(round, total) {
  if (round === total) return 'Final'
  if (round === total - 1) return 'Semis'
  if (round === total - 2) return 'Quarters'
  return `Round ${round}`
}

function BracketMatch({ match, onClick, clickable }) {
  const winA = match.completed && match.winnerSlot === 'A'
  const winB = match.completed && match.winnerSlot === 'B'
  const Wrapper = clickable ? 'button' : 'div'
  return (
    <Wrapper
      onClick={clickable ? onClick : undefined}
      className={[
        'block text-left bg-vinoy-cream rounded-xl border border-vinoy-border overflow-hidden',
        clickable ? 'hover:border-vinoy-green' : '',
      ].join(' ')}
    >
      <Side side={match.sideA} score={match.scoreA} winner={winA} />
      <div className="border-t border-vinoy-border" />
      <Side side={match.sideB} score={match.scoreB} winner={winB} />
    </Wrapper>
  )
}

function Side({ side, score, winner }) {
  const label =
    side?.kind === 'entrant'
      ? entrantLabel(side.entrant)
      : side?.kind === 'bye'
      ? 'Bye'
      : side?.kind === 'pendingWinner'
      ? `Winner of ${matchLabel(side.matchId)}`
      : side?.kind === 'pendingLoser'
      ? `Loser of ${matchLabel(side.matchId)}`
      : '—'
  const seed = side?.kind === 'entrant' ? side.entrant.seed : null
  return (
    <div
      className={[
        'flex items-center gap-2 px-3 py-2',
        winner ? 'bg-white text-vinoy-green font-bold' : '',
        side?.kind !== 'entrant' ? 'text-vinoy-ink/50 italic' : '',
      ].join(' ')}
    >
      {seed != null ? (
        <span className="w-5 text-xs text-vinoy-ink/40 font-mono">{seed}</span>
      ) : (
        <span className="w-5" />
      )}
      <span className="flex-1 min-w-0 truncate text-sm">{label}</span>
      {score != null && (
        <span className="font-mono text-base w-6 text-right">{score}</span>
      )}
    </div>
  )
}

function BracketScoreModal({ match, dispatch, onClose }) {
  const [scoreA, setScoreA] = useState(String(match.scoreA ?? ''))
  const [scoreB, setScoreB] = useState(String(match.scoreB ?? ''))

  const labelA =
    match.sideA?.kind === 'entrant' ? entrantLabel(match.sideA.entrant) : '—'
  const labelB =
    match.sideB?.kind === 'entrant' ? entrantLabel(match.sideB.entrant) : '—'

  function save() {
    const a = parseInt(scoreA)
    const b = parseInt(scoreB)
    if (isNaN(a) || isNaN(b) || a < 0 || b < 0) return
    if (a === b) return alert('A bracket match must have a winner.')
    dispatch({
      type: 'RECORD_BRACKET_SCORE',
      payload: { matchId: match.id, scoreA: a, scoreB: b },
    })
    onClose?.()
  }

  function clear() {
    if (!confirm('Clear this score and put the match back in play?')) return
    dispatch({ type: 'CLEAR_BRACKET_SCORE', payload: { matchId: match.id } })
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
          <h2 className="font-display text-lg font-bold text-vinoy-green">
            {match.completed ? 'Edit score' : 'Enter score'}
          </h2>
          <p className="text-xs text-vinoy-ink/60">
            Round {match.round} · {matchLabel(match.id)}
          </p>
        </div>
        <div className="space-y-2 mb-4">
          <ScoreRow label={labelA} value={scoreA} onChange={setScoreA} />
          <div className="text-center text-gray-400 text-xs font-bold">vs</div>
          <ScoreRow label={labelB} value={scoreB} onChange={setScoreB} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={onClose}
            className="py-3 rounded-xl border-2 border-vinoy-border text-vinoy-ink/70 font-semibold"
          >
            Cancel
          </button>
          <button
            onClick={save}
            className="py-3 rounded-xl bg-vinoy-green text-white font-bold"
          >
            Save
          </button>
        </div>
        {match.completed && (
          <button
            onClick={clear}
            className="w-full mt-2 py-2 text-sm text-red-600 hover:underline"
          >
            Clear score
          </button>
        )}
      </div>
    </div>
  )
}

function ScoreRow({ label, value, onChange }) {
  return (
    <div className="flex items-center gap-3 bg-vinoy-cream rounded-xl p-3">
      <div className="flex-1 min-w-0 font-semibold text-vinoy-ink truncate">
        {label}
      </div>
      <input
        type="number"
        inputMode="numeric"
        min="0"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-16 h-12 text-center text-2xl font-mono font-bold border-2 border-vinoy-border rounded-xl focus:border-vinoy-green focus:outline-none"
      />
    </div>
  )
}
