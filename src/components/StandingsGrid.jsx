import React from 'react'
import { buildStandings } from '../utils/schedule.js'

/**
 * Round-robin matrix view, modeled on the paper score sheet:
 * rows = pairs, columns = pairs, cell shows the score that row pair
 * recorded against column pair. The "Total" column sums games won.
 */
export default function StandingsGrid({ division }) {
  const { pairs, matches } = division
  const numPairs = pairs.length
  const { grid, totals, wins } = buildStandings(numPairs, matches)

  // Sort by wins desc, then total games desc — the usual round-robin tiebreak.
  const ranked = pairs
    .map((p, i) => ({ pair: p, num: i + 1, wins: wins[i + 1], total: totals[i + 1] }))
    .sort((a, b) => b.wins - a.wins || b.total - a.total)

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <h3 className="font-bold text-tennis-green">Standings</h3>
        <span className="text-xs text-gray-500">
          first to {division.matches[0]?.scoreA != null
            ? Math.max(division.matches[0].scoreA, division.matches[0].scoreB)
            : 7} wins
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
                <th key={j} className="px-2 py-2 text-center w-10">{j + 1}</th>
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
                    const cell = grid[num][j + 1]
                    const colNum = j + 1
                    if (cell === 'X') {
                      return (
                        <td key={j} className="px-2 py-2 text-center text-gray-300 bg-gray-50">
                          —
                        </td>
                      )
                    }
                    const win = cell != null && cell > grid[colNum][num]
                    return (
                      <td
                        key={j}
                        className={`px-2 py-2 text-center font-mono ${
                          cell == null ? 'text-gray-300' : win ? 'text-tennis-green font-bold' : 'text-gray-700'
                        }`}
                      >
                        {cell == null ? '·' : cell}
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
