import React, { useState } from 'react'
import { loadFromRoom, setRoomCodeInURL } from '../utils/share.js'

const GENDER_MIX_OPTIONS = [
  { value: 'open', label: "Open", color: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  { value: 'mens', label: "Men's", color: 'bg-blue-100 text-blue-800 border-blue-300' },
  { value: 'womens', label: "Women's", color: 'bg-pink-100 text-pink-800 border-pink-300' },
  { value: 'mixed', label: 'Mixed', color: 'bg-purple-100 text-purple-800 border-purple-300' },
]

export default function Setup({ state, dispatch }) {
  const { tournament } = state
  const [joinCode, setJoinCode] = useState('')
  const [joinStatus, setJoinStatus] = useState('') // 'loading' | 'error' | ''

  function update(field, value) {
    dispatch({ type: 'SET_TOURNAMENT', payload: { [field]: value } })
  }

  function handleContinue() {
    if (!tournament.name.trim()) return
    dispatch({ type: 'SET_PHASE', payload: 'roster' })
  }

  async function handleJoin() {
    const code = joinCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
    if (code.length !== 6) return
    setJoinStatus('loading')
    const loaded = await loadFromRoom(code)
    if (loaded) {
      dispatch({ type: 'LOAD_STATE', payload: { ...loaded, tournament: { ...loaded.tournament, roomCode: code } } })
      setRoomCodeInURL(code)
    } else {
      setJoinStatus('error')
      setTimeout(() => setJoinStatus(''), 3000)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-800 to-emerald-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🎾</div>
          <h1 className="text-3xl font-bold text-emerald-800">Tennis Tournament</h1>
          <p className="text-gray-500 mt-1">Set up your charity doubles event</p>
        </div>

        {/* Join existing room */}
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
          <p className="text-sm font-semibold text-emerald-800 mb-2">Join an existing session</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={joinCode}
              onChange={e => { setJoinCode(e.target.value.toUpperCase()); setJoinStatus('') }}
              onKeyDown={e => e.key === 'Enter' && handleJoin()}
              placeholder="Enter room code"
              maxLength={6}
              className="flex-1 border border-emerald-300 rounded-lg px-3 py-2 font-mono font-bold tracking-widest text-center text-gray-800 uppercase focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <button
              onClick={handleJoin}
              disabled={joinCode.replace(/[^A-Z0-9]/g, '').length !== 6 || joinStatus === 'loading'}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 disabled:bg-gray-300 text-white rounded-lg font-bold transition-colors"
            >
              {joinStatus === 'loading' ? '...' : 'Join'}
            </button>
          </div>
          {joinStatus === 'error' && (
            <p className="text-red-600 text-xs mt-1.5">Room not found — check the code and try again.</p>
          )}
        </div>

        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-xs text-gray-400 font-medium">or start a new tournament</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        <div className="space-y-6">
          {/* Tournament Name */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Tournament Name
            </label>
            <input
              type="text"
              value={tournament.name}
              onChange={e => update('name', e.target.value)}
              placeholder="e.g. Charity Classic 2025"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>

          {/* Format */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Format
            </label>
            <div className="flex gap-3">
              {['singles', 'doubles'].map(fmt => (
                <button
                  key={fmt}
                  onClick={() => update('format', fmt)}
                  className={`flex-1 py-2.5 rounded-lg font-medium border-2 transition-all ${
                    tournament.format === fmt
                      ? 'bg-emerald-700 border-emerald-700 text-white'
                      : 'bg-white border-gray-300 text-gray-600 hover:border-emerald-400'
                  }`}
                >
                  {fmt.charAt(0).toUpperCase() + fmt.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Number of Courts */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Number of Courts
            </label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => update('numCourts', Math.max(1, tournament.numCourts - 1))}
                className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xl flex items-center justify-center transition-colors"
              >
                −
              </button>
              <input
                type="number"
                min={1}
                max={14}
                value={tournament.numCourts}
                onChange={e => {
                  const v = parseInt(e.target.value)
                  if (!isNaN(v) && v >= 1 && v <= 14) update('numCourts', v)
                }}
                className="w-20 text-center border border-gray-300 rounded-lg px-3 py-2 text-gray-800 text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button
                onClick={() => update('numCourts', Math.min(14, tournament.numCourts + 1))}
                className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xl flex items-center justify-center transition-colors"
              >
                +
              </button>
              <span className="text-gray-500 text-sm ml-1">
                courts ({tournament.numCourts * (tournament.format === 'singles' ? 2 : 4)} players/round)
              </span>
            </div>
          </div>

          {/* Gender Mix */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Gender Mix
            </label>
            <div className="grid grid-cols-2 gap-2">
              {GENDER_MIX_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => update('genderMix', opt.value)}
                  className={`py-2 px-3 rounded-lg border-2 font-medium transition-all ${
                    tournament.genderMix === opt.value
                      ? opt.color + ' border-current shadow-sm'
                      : 'bg-white border-gray-200 text-gray-500 hover:border-gray-400'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Continue Button */}
          <button
            onClick={handleContinue}
            disabled={!tournament.name.trim()}
            className={`w-full py-3 rounded-xl font-bold text-lg transition-all ${
              tournament.name.trim()
                ? 'bg-emerald-700 hover:bg-emerald-600 text-white shadow-md hover:shadow-lg'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            Continue to Roster →
          </button>
        </div>
      </div>
    </div>
  )
}
