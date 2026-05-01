import React, { useState, useRef } from 'react'
import { generateInitialCourts } from '../utils/shuffle.js'
import { importJSON } from '../utils/share.js'

const SAMPLE_NAMES_M = [
  'Alex Chen', 'Brian Torres', 'Carlos Ruiz', 'David Kim', 'Ethan Park',
  'Frank Liu', 'Greg Martin', 'Henry Zhao', 'Ivan Petrov', 'James Okafor',
  'Kevin Nguyen', 'Liam Walsh',
]
const SAMPLE_NAMES_F = [
  'Amy Zhang', 'Beth Collins', 'Clara Santos', 'Diana Patel', 'Emma Johansson',
  'Fiona Brennan', 'Grace Tanaka', 'Hannah Berg', 'Isabel Ferreira', 'Julia Novak',
  'Kate Morrison', 'Laura Singh',
]

function GenderBadge({ gender }) {
  const map = {
    M: 'bg-blue-100 text-blue-700 border-blue-300',
    F: 'bg-pink-100 text-pink-700 border-pink-300',
    X: 'bg-purple-100 text-purple-700 border-purple-300',
  }
  return (
    <span className={`text-xs font-bold px-1.5 py-0.5 rounded border ${map[gender] || map.X}`}>
      {gender}
    </span>
  )
}

function SkillDots({ skill }) {
  return (
    <span className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <span
          key={i}
          className={`w-2.5 h-2.5 rounded-full ${i <= skill ? 'bg-yellow-400' : 'bg-gray-200'}`}
        />
      ))}
    </span>
  )
}

function PlayerCard({ player, dispatch }) {
  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
      player.checkedIn ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-200 opacity-60'
    }`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`font-medium truncate ${player.checkedIn ? 'text-gray-800' : 'text-gray-400'}`}>
            {player.name}
          </span>
          <GenderBadge gender={player.gender} />
          <SkillDots skill={player.skill} />
        </div>
        <div className="text-xs text-gray-400 mt-0.5">
          {player.wins}W – {player.losses}L
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={() => dispatch({ type: 'TOGGLE_CHECKIN', payload: player.id })}
          title={player.checkedIn ? 'Check out' : 'Check in'}
          className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-all ${
            player.checkedIn
              ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
              : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
          }`}
        >
          {player.checkedIn ? '✓' : '✗'}
        </button>
        <button
          onClick={() => dispatch({ type: 'REMOVE_PLAYER', payload: player.id })}
          title="Remove player"
          className="w-8 h-8 rounded-full flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all"
        >
          ×
        </button>
      </div>
    </div>
  )
}

export default function Roster({ state, dispatch }) {
  const { players, tournament } = state
  const [form, setForm] = useState({ name: '', gender: 'M', skill: 3 })
  const [error, setError] = useState('')
  const importRef = useRef()

  const playersPerCourt = tournament.format === 'singles' ? 2 : 4
  const checkedIn = players.filter(p => p.checkedIn)
  const canGenerate = checkedIn.length >= playersPerCourt && checkedIn.length % playersPerCourt === 0

  const sortedPlayers = [...players].sort((a, b) => {
    if (b.skill !== a.skill) return b.skill - a.skill
    return a.name.localeCompare(b.name)
  })

  function handleAdd(e) {
    e.preventDefault()
    if (!form.name.trim()) {
      setError('Name is required')
      return
    }
    dispatch({ type: 'ADD_PLAYER', payload: { ...form, name: form.name.trim() } })
    setForm({ name: '', gender: 'M', skill: 3 })
    setError('')
  }

  function handleAutoFill() {
    const skills = [5, 5, 4, 4, 4, 3, 3, 3, 3, 2, 2, 1]
    SAMPLE_NAMES_M.forEach((name, i) => {
      dispatch({ type: 'ADD_PLAYER', payload: { name, gender: 'M', skill: skills[i] } })
    })
    SAMPLE_NAMES_F.forEach((name, i) => {
      dispatch({ type: 'ADD_PLAYER', payload: { name, gender: 'F', skill: skills[i] } })
    })
  }

  function handleGenerate() {
    const checkedInPlayers = players.filter(p => p.checkedIn)
    const { courts, byePlayers } = generateInitialCourts(
      checkedInPlayers,
      tournament.numCourts,
      tournament.format
    )
    dispatch({ type: 'SET_COURTS', payload: courts })
  }

  function handleImport(e) {
    const file = e.target.files[0]
    if (!file) return
    importJSON(file, dispatch).catch(err => setError(err.message))
    e.target.value = ''
  }

  const remainder = checkedIn.length % playersPerCourt
  const neededMore = remainder === 0 ? 0 : playersPerCourt - remainder

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <div className="bg-emerald-700 text-white px-4 py-3 flex items-center gap-4 shadow">
        <button
          onClick={() => dispatch({ type: 'SET_PHASE', payload: 'setup' })}
          className="text-emerald-200 hover:text-white transition-colors text-sm"
        >
          ← Setup
        </button>
        <div className="flex-1">
          <h1 className="font-bold text-lg">{tournament.name || 'Tournament'}</h1>
          <p className="text-emerald-200 text-xs">Player Roster</p>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold">{checkedIn.length} / {players.length}</div>
          <div className="text-xs text-emerald-200">checked in</div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-4 grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left: Player List */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-gray-700">Players ({players.length})</h2>
            <div className="flex gap-2">
              <button
                onClick={handleAutoFill}
                className="text-xs px-3 py-1.5 bg-yellow-100 text-yellow-800 border border-yellow-300 rounded-lg hover:bg-yellow-200 transition-colors font-medium"
              >
                Auto-fill (24)
              </button>
              <button
                onClick={() => importRef.current.click()}
                className="text-xs px-3 py-1.5 bg-gray-100 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                Import JSON
              </button>
              <input
                ref={importRef}
                type="file"
                accept=".json"
                className="hidden"
                onChange={handleImport}
              />
            </div>
          </div>

          {players.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <div className="text-4xl mb-2">👥</div>
              <p>No players yet. Add some!</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
              {sortedPlayers.map(player => (
                <PlayerCard key={player.id} player={player} dispatch={dispatch} />
              ))}
            </div>
          )}

          {/* Generate button */}
          <div className="mt-4">
            {!canGenerate && checkedIn.length > 0 && (
              <p className="text-sm text-amber-600 mb-2 text-center">
                {neededMore > 0
                  ? `Need ${neededMore} more checked-in player${neededMore > 1 ? 's' : ''} (groups of ${playersPerCourt})`
                  : `Check in at least ${playersPerCourt} players`}
              </p>
            )}
            <button
              onClick={handleGenerate}
              disabled={!canGenerate}
              className={`w-full py-3 rounded-xl font-bold text-lg transition-all ${
                canGenerate
                  ? 'bg-emerald-700 hover:bg-emerald-600 text-white shadow-md hover:shadow-lg'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              Generate Courts →
            </button>
          </div>
        </div>

        {/* Right: Add Player Form */}
        <div>
          <h2 className="font-bold text-gray-700 mb-3">Add Player</h2>
          <form onSubmit={handleAdd} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                type="text"
                value={form.name}
                onChange={e => { setForm(f => ({ ...f, name: e.target.value })); setError('') }}
                placeholder="Player name"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-800"
              />
              {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
              <div className="flex gap-2">
                {[
                  { v: 'M', label: 'M', cls: 'bg-blue-500 text-white', outCls: 'border-blue-300 text-blue-600 hover:bg-blue-50' },
                  { v: 'F', label: 'F', cls: 'bg-pink-500 text-white', outCls: 'border-pink-300 text-pink-600 hover:bg-pink-50' },
                  { v: 'X', label: 'X', cls: 'bg-purple-500 text-white', outCls: 'border-purple-300 text-purple-600 hover:bg-purple-50' },
                ].map(opt => (
                  <button
                    type="button"
                    key={opt.v}
                    onClick={() => setForm(f => ({ ...f, gender: opt.v }))}
                    className={`flex-1 py-2 rounded-lg font-bold border-2 transition-all ${
                      form.gender === opt.v ? opt.cls + ' border-transparent' : 'bg-white ' + opt.outCls
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Skill Level: <span className="text-emerald-600 font-bold">{form.skill}</span>
              </label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map(s => (
                  <button
                    type="button"
                    key={s}
                    onClick={() => setForm(f => ({ ...f, skill: s }))}
                    className={`flex-1 py-2 rounded-lg font-bold border-2 transition-all text-sm ${
                      form.skill >= s
                        ? 'bg-yellow-400 border-yellow-400 text-yellow-900'
                        : 'bg-white border-gray-200 text-gray-400 hover:border-yellow-300'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
              <div className="flex justify-between text-xs text-gray-400 mt-1 px-1">
                <span>Beginner</span>
                <span>Expert</span>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg font-bold transition-colors shadow"
            >
              + Add Player
            </button>
          </form>

          {/* Stats */}
          {players.length > 0 && (
            <div className="mt-4 bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <h3 className="font-semibold text-gray-700 mb-3 text-sm">Roster Stats</h3>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-blue-50 rounded-lg p-2">
                  <div className="text-xl font-bold text-blue-600">{players.filter(p => p.gender === 'M').length}</div>
                  <div className="text-xs text-blue-500">Men</div>
                </div>
                <div className="bg-pink-50 rounded-lg p-2">
                  <div className="text-xl font-bold text-pink-600">{players.filter(p => p.gender === 'F').length}</div>
                  <div className="text-xs text-pink-500">Women</div>
                </div>
                <div className="bg-purple-50 rounded-lg p-2">
                  <div className="text-xl font-bold text-purple-600">{players.filter(p => p.gender === 'X').length}</div>
                  <div className="text-xs text-purple-500">Other</div>
                </div>
              </div>
              <div className="mt-3 text-xs text-gray-500 text-center">
                Courts needed: {tournament.numCourts} × {playersPerCourt} = {tournament.numCourts * playersPerCourt} players
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
