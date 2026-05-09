import React from 'react'
import { buildStandings } from '../utils/schedule.js'

/**
 * Round-robin matrix view, modeled on the paper score sheet.
 * rows = pairs, columns = pairs, cell shows the score(s) the row pair
 * recorded against the column pair across every round. The "Total"
 * column sums games won across the whole tournament.
 */
export default function StandingsGrid({ division, passes }) {
  const { pairs, matches } = division
  const numPairs = pairs.length
  const { grid, totals, wins } = buildStandings(numPairs, matches)
  const passList = passes && passes.length ? passes : [{ winningScore: 7 }]

  const ranked = pairs
    .map((p, i) => ({ pair: p, num: i + 1, wins: wins[i + 1], total: totals[i + 1] }))
    .sort((a, b) => b.wins - a.wins || b.total - a.total)

  return (
    <div className="bg-white rounded-2xl border border-vinoy-border overflow-hidden shadow-sm">
      <div className="px-4 py-3 border-b border-vinoy-border flex items-center justify-between flex-wrap gap-2">
        <h3 className="font-display text-lg font-bold text-vinoy-green">Standings</h3>
        <span className="text-xs text-vinoy-ink/60">
          {passList.length === 1
            ? `first to ${passList[0].winningScore}`
            : passList
                .map((p, i) => `R${i + 1}: ${p.winningScore}`)
                .join(' · ')}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-gray-600">
              <th className="px-2 py-2 text-left sticky left-0 bg-gray-50 z-10 min-w-[10rem]">
                Pair
              </th>
              {pairs.map((_, j) => (
                <th key={j} className="px-2 py-2 text-center w-12">{j + 1}</th>
              ))}
              <th className="px-2 py-2 text-center font-bold bg-tennis-court">W</th>
              <th className="px-2 py-2 text-center font-bold bg-tennis-court">Games</th>
            </tr>
          </thead>
          <tbody>
            {pairs.map((pair, i) => {
              const num = i + 1
              return (
                <tr key={pair.id} className="border-t border-gray-100">
                  <td className="px-2 py-2 sticky left-0 bg-white z-10">
                    <span className="inline-block w-5 text-gray-400 mr-1">{num}.</span>
                    <span className="font-medium">{pair.label}</span>
                  </td>
                  {pairs.map((_, j) => {
                    const colNum = j + 1
                    const cell = grid[num][colNum]
                    if (cell === 'X') {
                      return (
                        <td key={j} className="px-2 py-2 text-center text-gray-300 bg-gray-50">
                          —
                        </td>
                      )
                    }
                    const opp = grid[colNum][num]
                    const my = Array.isArray(cell) ? cell : []
                    const their = Array.isArray(opp) ? opp : []
                    if (my.length === 0) {
                      return (
                        <td key={j} className="px-2 py-2 text-center text-gray-300 font-mono">
                          ·
                        </td>
                      )
                    }
                    return (
                      <td key={j} className="px-1 py-2 text-center font-mono leading-tight">
                        {my.map((s, k) => {
                          const win = their[k] != null && s > their[k]
                          return (
                            <div
                              key={k}
                              className={win ? 'text-tennis-green font-bold' : 'text-gray-700'}
                            >
                              {s}
                            </div>
                          )
                        })}
                      </td>
                    )
                  })}
                  <td className="px-2 py-2 text-center font-bold bg-tennis-court/40">
                    {wins[num]}
                  </td>
                  <td className="px-2 py-2 text-center font-bold bg-tennis-court/40">
                    {totals[num]}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {ranked.some(r => r.wins > 0 || r.total > 0) && (
        <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
          <div className="text-xs uppercase tracking-wide text-gray-500 mb-2">
            Current order
          </div>
          <ol className="space-y-1">
            {ranked.map((r, idx) => (
              <li key={r.pair.id} className="flex items-baseline gap-2 text-sm">
                <span className="w-5 font-bold text-gray-700">{idx + 1}.</span>
                <span className="flex-1">{r.pair.label}</span>
                <span className="text-gray-500 text-xs">
                  {r.wins}W · {r.total} games
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  )
}
