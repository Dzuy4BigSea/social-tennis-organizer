import React, { useState, useMemo } from 'react'
import { resolveSlot, entrantLabel } from '../utils/bracket.js'
import { formatMatchTime } from '../utils/format.js'

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
export default function LiveBracket({ bracket, dispatch, ifAuthed, proAuthed }) {
  const [editing, setEditing] = useState(null)

  const enriched = useMemo(() => enrichMatches(bracket), [bracket])

  if (!bracket || !bracket.matches?.length) {
    return (
      <div className="bg-white rounded-2xl border border-vinoy-border p-6 text-center text-vinoy-ink/60">
        No draw generated yet for {bracket?.name || 'this bracket'}. Head back
        to Setup to add entrants and lock the bracket.
      </div>
    )
  }

  const isDoubleElim = bracket.kind === 'doubleElim'
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
            {entrantLabel(winnerEntrant(bracket, championMatch))}
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
          division={bracket}
          dispatch={dispatch}
          ifAuthed={ifAuthed}
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
      <div className="bg-vinoy-green text-white px-4 py-2 flex items-center justify-between flex-wrap gap-2">
        <span className="font-bold uppercase text-sm tracking-wide">
          Now playing
        </span>
        <span className="text-sm">
          Round {match.round}
          {match.scheduledAt && ` · ${formatMatchTime(match.scheduledAt)}`}
        </span>
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

function BracketScoreModal({ match, division, dispatch, ifAuthed, onClose }) {
  const scoring = division.scoring || {}
  const setsToWin = clampSets(scoring.setsToWin ?? 2)
  const totalPossibleSets = setsToWin * 2 - 1
  const gamesPerSet = scoring.gamesPerSet ?? 6

  // Pre-fill from match.setsA/setsB if recorded that way; otherwise
  // if we only have aggregate scoreA/scoreB (legacy), pad sets to
  // match. Default is one empty input pair per possible set.
  const initialA = padSets(match.setsA, totalPossibleSets, match.scoreA, match.setsB ? null : 'A')
  const initialB = padSets(match.setsB, totalPossibleSets, match.scoreB, match.setsA ? null : 'B')
  const [setsA, setSetsA] = useState(initialA)
  const [setsB, setSetsB] = useState(initialB)

  const entrantA = match.sideA?.kind === 'entrant' ? match.sideA.entrant : null
  const entrantB = match.sideB?.kind === 'entrant' ? match.sideB.entrant : null
  const labelA = entrantA ? entrantLabel(entrantA) : '—'
  const labelB = entrantB ? entrantLabel(entrantB) : '—'

  // Live-derived sets-won counts so the pro can see who's winning
  // the match while typing in per-set games.
  const won = countSetsWon(setsA, setsB)

  // Inline name editing piggybacks on the existing UPDATE_ENTRANT
  // action — we call it on save if the strings differ from the
  // entrant on file. Keeps the modal as the single edit surface.
  const [nameAp1, setNameAp1] = useState(entrantA?.p1 || '')
  const [nameAp2, setNameAp2] = useState(entrantA?.p2 || '')
  const [nameBp1, setNameBp1] = useState(entrantB?.p1 || '')
  const [nameBp2, setNameBp2] = useState(entrantB?.p2 || '')
  const isDoubles = division.entrantKind === 'doubles'
  const [showNameEdit, setShowNameEdit] = useState(false)

  function save() {
    // Persist any name changes first so downstream display picks
    // up new labels even if the score itself is empty.
    ifAuthed(() => {
      const persistName = (entrant, p1, p2) => {
        if (!entrant) return
        const a = p1.trim()
        const b = p2.trim()
        if (a !== (entrant.p1 || '') || b !== (entrant.p2 || '')) {
          dispatch({
            type: 'UPDATE_ENTRANT',
            payload: { divisionId: division.id, id: entrant.id, patch: { p1: a, p2: b } },
          })
        }
      }
      persistName(entrantA, nameAp1, nameAp2)
      persistName(entrantB, nameBp1, nameBp2)

      // Strip trailing empty pairs and only persist sets that have
      // both numbers filled in. Best-of-3 matches usually only need
      // 2 or 3 sets played; we don't want to record empty 4th/5th.
      const trimmed = trimEmptyTrailingSets(setsA, setsB)
      if (trimmed.setsA.length === 0) {
        // No sets at all → caller probably opened to edit names only.
        // If neither side has any score input, just close.
        onClose?.()
        return
      }
      const w = countSetsWon(trimmed.setsA, trimmed.setsB)
      if (w.a === w.b) {
        return alert('Bracket matches need a winner. Adjust the set scores.')
      }
      dispatch({
        type: 'RECORD_BRACKET_SCORE',
        payload: {
          divisionId: division.id,
          matchId: match.id,
          setsA: trimmed.setsA.map(s => Number(s)),
          setsB: trimmed.setsB.map(s => Number(s)),
        },
      })
      onClose?.()
    })
  }

  function clear() {
    if (!confirm('Clear this score and put the match back in play?')) return
    ifAuthed(() => {
      dispatch({
        type: 'CLEAR_BRACKET_SCORE',
        payload: { divisionId: division.id, matchId: match.id },
      })
      onClose?.()
    })
  }

  function setOneSet(side, idx, val) {
    const setter = side === 'A' ? setSetsA : setSetsB
    setter(prev => {
      const next = [...prev]
      next[idx] = val
      return next
    })
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-white w-full sm:max-w-md sm:rounded-2xl shadow-xl max-h-[95vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b border-vinoy-border px-5 py-3 flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-bold text-vinoy-green">
              {match.completed ? 'Edit match' : 'Enter score'}
            </h2>
            <p className="text-xs text-vinoy-ink/60">
              Round {match.round} · {matchLabel(match.id)} · best of {totalPossibleSets} · sets to {gamesPerSet}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-vinoy-ink/40 hover:text-vinoy-ink text-2xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="p-5 space-y-4">
          <SideHeader
            label={labelA}
            wonSets={won.a}
            isWinner={won.a > won.b}
          />
          <SetInputRow
            sets={setsA}
            onChange={(idx, v) => setOneSet('A', idx, v)}
            counterpart={setsB}
            highlight="A"
            gamesPerSet={gamesPerSet}
          />

          <SideHeader
            label={labelB}
            wonSets={won.b}
            isWinner={won.b > won.a}
          />
          <SetInputRow
            sets={setsB}
            onChange={(idx, v) => setOneSet('B', idx, v)}
            counterpart={setsA}
            highlight="B"
            gamesPerSet={gamesPerSet}
          />

          {(entrantA || entrantB) && (
            <div className="border-t border-vinoy-border pt-3">
              <button
                type="button"
                onClick={() => setShowNameEdit(s => !s)}
                className="text-xs text-vinoy-ink/70 hover:text-vinoy-green font-semibold"
              >
                {showNameEdit ? '▾ Hide name editor' : '▸ Edit player names'}
              </button>
              {showNameEdit && (
                <div className="mt-2 space-y-2">
                  {entrantA && (
                    <NameEditor
                      label={`Side A (seed ${entrantA.seed})`}
                      isDoubles={isDoubles}
                      p1={nameAp1}
                      p2={nameAp2}
                      onP1={setNameAp1}
                      onP2={setNameAp2}
                    />
                  )}
                  {entrantB && (
                    <NameEditor
                      label={`Side B (seed ${entrantB.seed})`}
                      isDoubles={isDoubles}
                      p1={nameBp1}
                      p2={nameBp2}
                      onP1={setNameBp1}
                      onP2={setNameBp2}
                    />
                  )}
                  <p className="text-xs text-vinoy-ink/50 italic">
                    Saving here updates the seed everywhere — same as
                    a substitute.
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 pt-1">
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
              className="w-full py-2 text-sm text-red-600 hover:underline"
            >
              Clear score
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function SideHeader({ label, wonSets, isWinner }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <div className={`font-semibold truncate ${isWinner ? 'text-vinoy-green' : 'text-vinoy-ink'}`}>
        {label}
      </div>
      <div className={`text-xs ${isWinner ? 'text-vinoy-green font-bold' : 'text-vinoy-ink/50'}`}>
        {wonSets} {wonSets === 1 ? 'set' : 'sets'}
      </div>
    </div>
  )
}

function SetInputRow({ sets, onChange, counterpart, highlight, gamesPerSet }) {
  return (
    <div
      className="grid gap-2"
      style={{ gridTemplateColumns: `repeat(${sets.length}, minmax(0, 1fr))` }}
    >
      {sets.map((value, idx) => {
        const opp = counterpart[idx]
        const my = Number(value)
        const their = Number(opp)
        const won = Number.isFinite(my) && Number.isFinite(their) && my > their
        return (
          <div key={idx}>
            <div className="text-[10px] uppercase tracking-wider text-vinoy-ink/40 mb-0.5 text-center">
              Set {idx + 1}
            </div>
            <input
              type="number"
              inputMode="numeric"
              min="0"
              max={gamesPerSet + 5}
              value={value}
              onChange={(e) => onChange(idx, e.target.value)}
              placeholder="—"
              className={[
                'w-full h-12 text-center text-xl font-mono font-bold border-2 rounded-xl focus:outline-none transition',
                won
                  ? 'border-vinoy-green bg-vinoy-cream text-vinoy-green'
                  : 'border-vinoy-border focus:border-vinoy-green',
              ].join(' ')}
            />
          </div>
        )
      })}
    </div>
  )
}

function NameEditor({ label, isDoubles, p1, p2, onP1, onP2 }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-vinoy-ink/50 mb-1">
        {label}
      </div>
      <div className="flex flex-col sm:flex-row sm:items-center gap-1.5">
        <input
          type="text"
          value={p1}
          onChange={(e) => onP1(e.target.value)}
          placeholder={isDoubles ? 'Player 1' : 'Player'}
          className="flex-1 min-w-0 bg-white border border-vinoy-border rounded-lg px-2 py-1 text-sm"
        />
        {isDoubles && (
          <>
            <span className="hidden sm:inline text-vinoy-ink/30 shrink-0">/</span>
            <input
              type="text"
              value={p2}
              onChange={(e) => onP2(e.target.value)}
              placeholder="Player 2"
              className="flex-1 min-w-0 bg-white border border-vinoy-border rounded-lg px-2 py-1 text-sm"
            />
          </>
        )}
      </div>
    </div>
  )
}

function clampSets(n) {
  const v = parseInt(n)
  if (!Number.isFinite(v)) return 2
  return Math.max(1, Math.min(3, v))
}

function padSets(arr, total, fallbackAggregate, _aggregateSide) {
  const out = []
  for (let i = 0; i < total; i++) {
    const v = arr?.[i]
    out.push(v == null ? '' : String(v))
  }
  return out
}

function trimEmptyTrailingSets(setsA, setsB) {
  let len = Math.max(setsA.length, setsB.length)
  while (len > 0 && setsA[len - 1] === '' && setsB[len - 1] === '') len--
  return { setsA: setsA.slice(0, len), setsB: setsB.slice(0, len) }
}

function countSetsWon(setsA, setsB) {
  let a = 0
  let b = 0
  const len = Math.max(setsA.length, setsB.length)
  for (let i = 0; i < len; i++) {
    const x = Number(setsA[i])
    const y = Number(setsB[i])
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue
    if (x > y) a++
    else if (y > x) b++
  }
  return { a, b }
}
