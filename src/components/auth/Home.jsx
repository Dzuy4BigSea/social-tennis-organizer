import React from 'react'
import { useAuth } from '../../store/useAuth.js'

export default function Home({ onStartTournament }) {
  const { profile, user, signOut } = useAuth()

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-emerald-700 text-white px-4 py-3 flex items-center gap-4 shadow">
        <div className="flex-1">
          <h1 className="font-bold text-lg">🎾 Tennis Organizer</h1>
          <p className="text-emerald-200 text-xs">
            Welcome, {profile?.display_name || user?.email}
          </p>
        </div>
        <button
          onClick={signOut}
          className="text-emerald-200 hover:text-white text-sm"
        >
          Sign out
        </button>
      </div>
      <div className="max-w-2xl mx-auto p-4 space-y-4">
        <div className="rounded-2xl p-6 border border-amber-200 bg-amber-50 text-sm text-amber-800">
          <strong>Account ready.</strong> Org / event flow is still
          under construction — for now, your tournaments behave like
          guest tournaments. Cloud-saved events arrive in the next
          step.
        </div>
        <button
          onClick={onStartTournament}
          className="w-full py-4 bg-emerald-600 text-white rounded-2xl shadow font-semibold hover:bg-emerald-700 transition-colors"
        >
          Start a new tournament
        </button>
      </div>
    </div>
  )
}
