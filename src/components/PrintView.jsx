import React, { useEffect } from 'react'
import { exportJSON } from '../utils/share.js'

function getPlayer(players, id) {
  return players.find(p => p.id === id)
}

function GenderBadge({ gender }) {
  const map = { M: '#3b82f6', F: '#ec4899', X: '#a855f7' }
  return (
    <span style={{
      background: map[gender] || '#a855f7',
      color: 'white',
      borderRadius: 4,
      padding: '0 5px',
      fontSize: 11,
      fontWeight: 700,
      marginLeft: 4,
    }}>
      {gender}
    </span>
  )
}

export default function PrintView({ state, onClose }) {
  const { tournament, courts, players } = state

  useEffect(() => {
    // Auto-print when opened
    // Give a small delay for render
    const t = setTimeout(() => {
      window.print()
    }, 500)
    return () => clearTimeout(t)
  }, [])

  function handleShare() {
    const code = state.tournament.roomCode
    if (code) {
      const url = window.location.origin + window.location.pathname + `#room=${code}`
      navigator.clipboard.writeText(url).then(() => alert('Room link copied to clipboard!'))
    } else {
      alert('No active room — create one from the court board first.')
    }
  }

  function handleExport() {
    exportJSON(state)
  }

  // Sort players by wins desc
  const sortedPlayers = [...players].sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins
    if (b.losses !== a.losses) return a.losses - b.losses
    return a.name.localeCompare(b.name)
  })

  return (
    <div className="fixed inset-0 bg-white z-50 overflow-auto">
      {/* Controls — hidden when printing */}
      <div className="no-print sticky top-0 bg-emerald-700 text-white px-4 py-3 flex items-center gap-3 shadow-lg">
        <button
          onClick={onClose}
          className="px-3 py-1.5 bg-emerald-800 hover:bg-emerald-900 rounded-lg text-sm font-medium transition-colors"
        >
          ← Back
        </button>
        <div className="flex-1 font-bold">{tournament.name} — Print View</div>
        <button
          onClick={handleShare}
          className="px-3 py-1.5 bg-yellow-500 hover:bg-yellow-400 text-yellow-900 rounded-lg text-sm font-bold transition-colors"
        >
          🔗 Copy Share URL
        </button>
        <button
          onClick={handleExport}
          className="px-3 py-1.5 bg-white text-emerald-800 rounded-lg text-sm font-bold hover:bg-gray-100 transition-colors"
        >
          ⬇ Export JSON
        </button>
        <button
          onClick={() => window.print()}
          className="px-3 py-1.5 bg-emerald-900 hover:bg-black rounded-lg text-sm font-medium transition-colors"
        >
          🖨 Print
        </button>
      </div>

      {/* Printable content */}
      <div className="max-w-4xl mx-auto p-8">
        {/* Header */}
        <div className="text-center mb-8 border-b-2 border-gray-200 pb-6">
          <h1 className="text-3xl font-bold text-gray-800">{tournament.name}</h1>
          <p className="text-gray-500 mt-1">
            Round {tournament.currentRound} &nbsp;·&nbsp;
            {tournament.format.charAt(0).toUpperCase() + tournament.format.slice(1)} &nbsp;·&nbsp;
            {tournament.genderMix.charAt(0).toUpperCase() + tournament.genderMix.slice(1)}
          </p>
          <p className="text-gray-400 text-sm mt-1">
            {courts.length} Courts &nbsp;·&nbsp; {players.filter(p => p.checkedIn).length} Players
          </p>
        </div>

        {/* Courts */}
        <h2 className="text-xl font-bold text-gray-700 mb-4">Court Assignments — Round {tournament.currentRound}</h2>
        <table className="w-full border-collapse mb-10">
          <thead>
            <tr className="bg-emerald-700 text-white">
              <th className="px-4 py-2 text-left text-sm">Court</th>
              <th className="px-4 py-2 text-left text-sm">Team A</th>
              <th className="px-4 py-2 text-center text-sm">vs</th>
              <th className="px-4 py-2 text-left text-sm">Team B</th>
              <th className="px-4 py-2 text-center text-sm">Winner</th>
            </tr>
          </thead>
          <tbody>
            {courts.map((court, idx) => {
              const [teamA, teamB] = court.teams
              const getNames = team =>
                (team || []).map(pid => pid ? getPlayer(players, pid)?.name || '?' : '—').join(' / ')
              const winnerLabel =
                court.winnerId === 0 ? 'Team A' :
                court.winnerId === 1 ? 'Team B' : '—'

              return (
                <tr key={court.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-4 py-2.5 font-bold text-emerald-700 border-b border-gray-100">
                    Court {court.number}{idx === 0 ? ' ★' : ''}
                  </td>
                  <td className="px-4 py-2.5 border-b border-gray-100 text-gray-800">
                    {getNames(teamA)}
                  </td>
                  <td className="px-4 py-2.5 border-b border-gray-100 text-center text-gray-400 font-bold">vs</td>
                  <td className="px-4 py-2.5 border-b border-gray-100 text-gray-800">
                    {getNames(teamB)}
                  </td>
                  <td className="px-4 py-2.5 border-b border-gray-100 text-center text-gray-500 text-sm">
                    {winnerLabel}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {/* Player Standings */}
        <h2 className="text-xl font-bold text-gray-700 mb-4">Player Standings</h2>
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="px-4 py-2 text-left text-sm text-gray-600">#</th>
              <th className="px-4 py-2 text-left text-sm text-gray-600">Player</th>
              <th className="px-4 py-2 text-center text-sm text-gray-600">Gender</th>
              <th className="px-4 py-2 text-center text-sm text-gray-600">Skill</th>
              <th className="px-4 py-2 text-center text-sm text-gray-600">W</th>
              <th className="px-4 py-2 text-center text-sm text-gray-600">L</th>
              <th className="px-4 py-2 text-center text-sm text-gray-600">Record</th>
            </tr>
          </thead>
          <tbody>
            {sortedPlayers.map((player, idx) => (
              <tr key={player.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="px-4 py-2 text-gray-400 text-sm border-b border-gray-100">{idx + 1}</td>
                <td className="px-4 py-2 font-medium text-gray-800 border-b border-gray-100">
                  {player.name}
                  {!player.checkedIn && <span className="text-xs text-gray-400 ml-2">(out)</span>}
                </td>
                <td className="px-4 py-2 text-center border-b border-gray-100">
                  <GenderBadge gender={player.gender} />
                </td>
                <td className="px-4 py-2 text-center text-yellow-500 font-bold border-b border-gray-100">
                  {'●'.repeat(player.skill)}{'○'.repeat(5 - player.skill)}
                </td>
                <td className="px-4 py-2 text-center text-emerald-600 font-bold border-b border-gray-100">
                  {player.wins}
                </td>
                <td className="px-4 py-2 text-center text-red-500 font-bold border-b border-gray-100">
                  {player.losses}
                </td>
                <td className="px-4 py-2 text-center text-gray-500 text-sm border-b border-gray-100">
                  {player.wins + player.losses > 0
                    ? `${Math.round(player.wins / (player.wins + player.losses) * 100)}%`
                    : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-8 text-center text-gray-300 text-xs">
          Generated by Tennis Tournament Manager
        </div>
      </div>
    </div>
  )
}
