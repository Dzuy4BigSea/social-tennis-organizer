import React, { useState } from 'react'
import { useAuth } from '../../store/useAuth.js'

export default function ProfileSetup() {
  const { user, saveDisplayName, signOut } = useAuth()
  const [name, setName] = useState('')
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) return
    setError(null)
    setSubmitting(true)
    try {
      await saveDisplayName(name.trim())
    } catch (err) {
      setError(err.message ?? 'Could not save')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-emerald-700 flex items-center justify-center p-4">
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full space-y-4"
      >
        <h2 className="text-2xl font-bold text-emerald-700">One more thing</h2>
        <p className="text-sm text-gray-500">
          What should other players see when they look at your name?
          You can change this later.
        </p>
        <label className="block">
          <span className="text-sm text-gray-700">Display name</span>
          <input
            type="text"
            required
            maxLength={60}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            autoComplete="name"
            autoFocus
          />
        </label>
        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={submitting || !name.trim()}
          className="w-full py-3 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-50"
        >
          {submitting ? 'Saving…' : 'Continue'}
        </button>
        <p className="text-xs text-center text-gray-400">
          Signed in as {user?.email}.{' '}
          <button
            type="button"
            onClick={signOut}
            className="hover:underline"
          >
            Sign out
          </button>
        </p>
      </form>
    </div>
  )
}
