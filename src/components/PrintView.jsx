import React from 'react'
import {
  getVariant,
  getRatingLabel,
} from '../utils/eventTypes.js'
import { resolveSlot, entrantLabel } from '../utils/bracket.js'
import { formatMatchTime, formatTimeOnly } from '../utils/format.js'
import { buildStandings } from '../utils/schedule.js'
import OrnamentalRule from './OrnamentalRule.jsx'
import SiteFooter from './SiteFooter.jsx'

/**
 * Print-friendly rendering of the active event. Lives behind a small
 * toolbar with a Cancel button and a "Print / Save PDF" trigger that
 * fires the browser's native print → save-as-PDF dialog. The toolbar
 * itself is `.no-print` so it disappears in the actual paper output.
 *
 * Why list-style instead of an absolute-positioned bracket diagram:
 * a list of rounds with blank score lines works equally well for
 * (a) offline scoring when WiFi drops mid-event and (b) printed
 * marketing schedules posted on the club bulletin board. A pictorial
 * bracket diagram is a follow-up nice-to-have.
 */
export default function PrintView({ state, onClose }) {
  const lockedDraws = (state.divisions || []).filter(
    d => d.locked && (d.matches?.length || 0) > 0
  )

  return (
    <div className="fixed inset-0 bg-white z-50 overflow-y-auto">
      <div className="no-print sticky top-0 z-10 bg-vinoy-cream border-b border-vinoy-border px-4 py-2 flex items-center justify-between gap-2">
        <button
          onClick={onClose}
          className="px-4 py-2 rounded-xl border border-vinoy-border bg-white text-sm hover:bg-vinoy-cream"
        >
          ← Back
        </button>
        <span className="text-xs text-vinoy-ink/60 hidden sm:inline">
          The browser's print dialog has a "Save as PDF" destination.
        </span>
        <button
          onClick={() => window.print()}
          className="px-5 py-2 rounded-xl bg-vinoy-green text-white text-sm font-semibold"
        >
          Print / Save PDF
        </button>
      </div>

      <div className="max-w-[850px] mx-auto p-6 print:p-0 print:max-w-none">
        <PrintHeader state={state} />

        {/* Print every locked division. Each starts on a fresh page
            so the printout collates cleanly when posted on a wall. */}
        {lockedDraws.map((d, idx) => (
          <div key={d.id} className={idx > 0 ? 'print:break-before-page' : ''}>
            {d.kind === 'roundRobin' ? (
              <DivisionPrint division={d} />
            ) : (
              <BracketPrint bracket={d} />
            )}
          </div>
        ))}

        {lockedDraws.length === 0 && (
          <p className="text-vinoy-ink/60 text-sm italic">
            No locked divisions to print yet — head back to Setup and lock a
            draw first.
          </p>
        )}

        <SiteFooter className="mt-8 print:mt-4" />
      </div>
    </div>
  )
}

function PrintHeader({ state }) {
  const t = state.tournament
  const logoUrl = `${import.meta.env.BASE_URL}vinoy-logo.png`
  return (
    <header className="mb-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <img src={logoUrl} alt="Vinoy crest" className="h-14 w-auto" />
          <div>
            <div className="font-display font-bold text-vinoy-green tracking-wide">
              VINOY TENNIS
            </div>
            <h1 className="font-display text-2xl font-bold text-vinoy-ink leading-tight">
              {t.name || 'Untitled event'}
            </h1>
          </div>
        </div>
        <div className="text-right text-sm text-vinoy-ink/80 min-w-[10rem]">
          {t.ongoing ? (
            <div>Ongoing</div>
          ) : (
            <>
              {t.startDate && (
                <div>
                  {formatDate(t.startDate)}
                  {t.endDate && t.endDate !== t.startDate &&
                    ` – ${formatDate(t.endDate)}`}
                </div>
              )}
              {(t.startTime || t.endTime) && (
                <div className="text-vinoy-ink/60">
                  {formatTimeOnly(t.startTime)}
                  {t.endTime && ` – ${formatTimeOnly(t.endTime)}`}
                </div>
              )}
            </>
          )}
          {t.roomCode && (
            <div className="font-mono text-xs text-vinoy-ink/50 mt-2">
              Event {t.roomCode}
            </div>
          )}
        </div>
      </div>
      <OrnamentalRule className="mt-3" />
    </header>
  )
}

function formatDate(iso) {
  if (!iso) return ''
  const d = new Date(iso + 'T00:00:00')
  if (isNaN(d)) return iso
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

/**
 * Shared header for any printed division — round-robin or bracket.
 * Reads the per-division kind / variant / rating / entrantKind so
 * mixed events ("Men's 4.0 SE" + "Women's 3.5 RR") have a clear
 * identity on each page.
 */
function DivisionHeading({ division }) {
  const variant =
    division.variant && division.variant !== 'all'
      ? getVariant(division.variant).label
      : ''
  const rating = getRatingLabel(division.rating)
  const entrants = division.entrantKind === 'doubles' ? 'Doubles' : 'Singles'
  const format =
    division.kind === 'doubleElim'
      ? 'Double Elimination'
      : division.kind === 'singleElim'
        ? 'Single Elimination'
        : 'Round Robin'
  const subtitle = [variant, rating, entrants, format]
    .filter(Boolean)
    .join(' · ')
  return (
    <div className="mb-3">
      <h2 className="font-display text-2xl font-bold text-vinoy-green leading-tight">
        {division.name || 'Division'}
        {division.courtLabel && (
          <span className="ml-3 text-sm font-normal text-vinoy-ink/60">
            Court {division.courtLabel}
          </span>
        )}
      </h2>
      {subtitle && (
        <div className="text-sm text-vinoy-ink/70 mt-0.5">{subtitle}</div>
      )}
    </div>
  )
}

// ----- Round robin -----

function DivisionPrint({ division }) {
  const byRound = {}
  division.matches.forEach(m => {
    const key = `${m.pass || 1}-${m.round}`
    ;(byRound[key] = byRound[key] || []).push(m)
  })
  const sortedKeys = Object.keys(byRound).sort((a, b) => {
    const [pa, ra] = a.split('-').map(Number)
    const [pb, rb] = b.split('-').map(Number)
    return pa - pb || ra - rb
  })

  return (
    <section>
      <DivisionHeading division={division} />

      <div className="text-sm mb-3">
        <strong>Pairs:</strong>{' '}
        {division.pairs
          .map((p, i) => `${i + 1}. ${p.label}`)
          .join('   ·   ')}
      </div>

      {sortedKeys.map(key => {
        const matches = byRound[key]
        const [pass, round] = key.split('-').map(Number)
        return (
          <div key={key} className="mb-4 break-inside-avoid">
            <div className="text-sm font-semibold text-vinoy-ink/80 mb-1">
              Round {pass}.{round}
            </div>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-vinoy-border text-xs text-vinoy-ink/60">
                  <th className="text-left py-1 pr-2 w-20">Match</th>
                  <th className="text-left py-1 pr-2">Pair A</th>
                  <th className="text-center py-1 px-2 w-20">Score</th>
                  <th className="text-left py-1 pr-2">Pair B</th>
                  <th className="text-center py-1 px-2 w-20">Score</th>
                  <th className="text-left py-1 pl-2 w-32">Time</th>
                </tr>
              </thead>
              <tbody>
                {matches.map(m => (
                  <tr key={m.id} className="border-b border-vinoy-border/60">
                    <td className="py-2 pr-2 font-mono text-xs text-vinoy-ink/60">
                      R{pass}.{round}.{m.slot}
                    </td>
                    <td className="py-2 pr-2">
                      {division.pairs[m.pairA - 1]?.label || `Pair ${m.pairA}`}
                    </td>
                    <td className="py-2 px-2 text-center font-mono">
                      {m.completed ? m.scoreA : <span className="text-vinoy-ink/30">____</span>}
                    </td>
                    <td className="py-2 pr-2">
                      {division.pairs[m.pairB - 1]?.label || `Pair ${m.pairB}`}
                    </td>
                    <td className="py-2 px-2 text-center font-mono">
                      {m.completed ? m.scoreB : <span className="text-vinoy-ink/30">____</span>}
                    </td>
                    <td className="py-2 pl-2 text-xs text-vinoy-ink/60">
                      {m.scheduledAt ? formatMatchTime(m.scheduledAt) : ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      })}

      <StandingsPrint division={division} />
    </section>
  )
}

function StandingsPrint({ division }) {
  const numPairs = division.pairs.length
  const { grid, totals, wins } = buildStandings(numPairs, division.matches)
  return (
    <div className="mt-4 break-inside-avoid">
      <h3 className="font-display text-lg font-bold text-vinoy-green mb-2">
        Standings
      </h3>
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-vinoy-cream text-xs text-vinoy-ink/70">
            <th className="text-left p-1 border border-vinoy-border">Pair</th>
            {division.pairs.map((_, j) => (
              <th key={j} className="text-center p-1 border border-vinoy-border w-8">
                {j + 1}
              </th>
            ))}
            <th className="text-center p-1 border border-vinoy-border">W</th>
            <th className="text-center p-1 border border-vinoy-border">Games</th>
          </tr>
        </thead>
        <tbody>
          {division.pairs.map((p, i) => {
            const num = i + 1
            return (
              <tr key={p.id}>
                <td className="p-1 border border-vinoy-border">
                  <span className="text-vinoy-ink/40 mr-1">{num}.</span>
                  {p.label}
                </td>
                {division.pairs.map((_, j) => {
                  const cell = grid[num][j + 1]
                  if (cell === 'X') {
                    return (
                      <td key={j} className="p-1 border border-vinoy-border bg-gray-100 text-center text-vinoy-ink/40">
                        —
                      </td>
                    )
                  }
                  const arr = Array.isArray(cell) ? cell : []
                  return (
                    <td key={j} className="p-1 border border-vinoy-border text-center font-mono leading-tight">
                      {arr.length === 0 ? (
                        <span className="text-vinoy-ink/30">·</span>
                      ) : (
                        arr.map((s, k) => <div key={k}>{s}</div>)
                      )}
                    </td>
                  )
                })}
                <td className="p-1 border border-vinoy-border text-center font-bold">
                  {wins[num]}
                </td>
                <td className="p-1 border border-vinoy-border text-center font-bold">
                  {totals[num]}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ----- Bracket -----

function BracketPrint({ bracket }) {
  const wb = bracket.matches.filter(m => m.bracket === 'main')
  const lb = bracket.matches.filter(m => m.bracket === 'losers')
  const gf = bracket.matches.filter(m => m.bracket === 'grandFinal' || m.bracket === 'reset')
  const isDouble = bracket.kind === 'doubleElim'

  return (
    <div className="space-y-6">
      <DivisionHeading division={bracket} />

      <SeedList bracket={bracket} />

      <BracketMatchList
        title={isDouble ? "Winner's Bracket" : 'Draw'}
        bracket={bracket}
        matches={wb}
      />

      {isDouble && lb.length > 0 && (
        <BracketMatchList
          title="Loser's Bracket"
          bracket={bracket}
          matches={lb}
        />
      )}

      {isDouble && gf.length > 0 && (
        <BracketMatchList
          title="Grand Final"
          bracket={bracket}
          matches={gf}
          isGrandFinal
        />
      )}
    </div>
  )
}

function SeedList({ bracket }) {
  return (
    <section className="break-inside-avoid">
      <h2 className="font-display text-xl font-bold text-vinoy-green mb-2">
        Seeds
      </h2>
      <ol className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-1 text-sm">
        {bracket.entrants.map(e => (
          <li key={e.id} className="flex items-baseline gap-2">
            <span className="w-6 text-vinoy-ink/50 font-mono text-xs">{e.seed}.</span>
            <span className={e.isBye ? 'italic text-vinoy-ink/50' : ''}>
              {e.isBye ? 'BYE' : entrantLabel(e)}
            </span>
          </li>
        ))}
      </ol>
    </section>
  )
}

function BracketMatchList({ title, bracket, matches, isGrandFinal }) {
  const byRound = {}
  matches.forEach(m => {
    const key = isGrandFinal ? m.slot : m.round
    ;(byRound[key] = byRound[key] || []).push(m)
  })
  const sortedKeys = Object.keys(byRound).sort((a, b) => Number(a) - Number(b))

  return (
    <section className="break-inside-avoid">
      <h2 className="font-display text-xl font-bold text-vinoy-green mb-2">
        {title}
      </h2>
      {sortedKeys.map(key => {
        const ms = byRound[key]
        const label = isGrandFinal
          ? Number(key) === 1
            ? 'Grand Final'
            : 'Reset'
          : roundHeading(Number(key), Math.max(...sortedKeys.map(Number)), title)
        return (
          <div key={key} className="mb-3 break-inside-avoid">
            <div className="text-sm font-semibold text-vinoy-ink/80 mb-1">{label}</div>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-vinoy-border text-xs text-vinoy-ink/60">
                  <th className="text-left py-1 pr-2 w-24">Match</th>
                  <th className="text-left py-1 pr-2">Side A</th>
                  <th className="text-center py-1 px-2 w-12">Score</th>
                  <th className="text-left py-1 pr-2">Side B</th>
                  <th className="text-center py-1 px-2 w-12">Score</th>
                  <th className="text-left py-1 pl-2 w-32">Time</th>
                </tr>
              </thead>
              <tbody>
                {ms.map(m => {
                  const a = resolveSlot(bracket, m.pA)
                  const b = resolveSlot(bracket, m.pB)
                  return (
                    <tr key={m.id} className="border-b border-vinoy-border/60">
                      <td className="py-2 pr-2 font-mono text-xs text-vinoy-ink/60">
                        {compactMatchId(m.id)}
                      </td>
                      <td className="py-2 pr-2">{slotLabel(a, m.pA)}</td>
                      <td className="py-2 px-2 text-center font-mono">
                        {m.completed && m.scoreA != null ? (
                          m.scoreA
                        ) : (
                          <span className="text-vinoy-ink/30">____</span>
                        )}
                      </td>
                      <td className="py-2 pr-2">{slotLabel(b, m.pB)}</td>
                      <td className="py-2 px-2 text-center font-mono">
                        {m.completed && m.scoreB != null ? (
                          m.scoreB
                        ) : (
                          <span className="text-vinoy-ink/30">____</span>
                        )}
                      </td>
                      <td className="py-2 pl-2 text-xs text-vinoy-ink/60">
                        {m.scheduledAt ? formatMatchTime(m.scheduledAt) : ''}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )
      })}
    </section>
  )
}

function slotLabel(side, slot) {
  if (side?.kind === 'entrant') {
    const e = side.entrant
    return `(${e.seed}) ${entrantLabel(e)}`
  }
  if (side?.kind === 'bye') return 'Bye'
  if (side?.kind === 'pendingWinner')
    return `Winner of ${compactMatchId(side.matchId)}`
  if (side?.kind === 'pendingLoser')
    return `Loser of ${compactMatchId(side.matchId)}`
  return '—'
}

function compactMatchId(id) {
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

function roundHeading(round, total, sectionTitle) {
  if (round === total) {
    if (sectionTitle.includes("Loser")) return "Loser's Final"
    return 'Final'
  }
  if (round === total - 1) return 'Semifinals'
  if (round === total - 2 && total > 3) return 'Quarterfinals'
  return `Round ${round}`
}
