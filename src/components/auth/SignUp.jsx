import React, { useState } from 'react'
import { useAuth } from '../../store/useAuth.js'

export default function SignUp({ onBack, onSignIn }) {
  const { signUp } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await signUp(email.trim(), password)
    } catch (err) {
      setError(err.message ?? 'Sign-up failed')
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
        <button
          type="button"
          onClick={onBack}
          className="text-emerald-700 hover:underline text-sm"
        >
          ← Back
        </button>
        <h2 className="text-2xl font-bold text-emerald-700">Create account</h2>
        <label className="block">
          <span className="text-sm text-gray-700">Email</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            autoComplete="email"
          />
        </label>
        <label className="block">
          <span className="text-sm text-gray-700">Password</span>
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            autoComplete="new-password"
          />
          <span className="text-xs text-gray-400 mt-1 block">
            At least 6 characters.
          </span>
        </label>
        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-50"
        >
          {submitting ? 'Creating…' : 'Create account'}
        </button>
        <p className="text-sm text-center text-gray-500">
          Already have one?{' '}
          <button
            type="button"
            onClick={onSignIn}
            className="text-emerald-700 hover:underline"
          >
            Sign in
          </button>
        </p>
      </form>
    </div>
  )
}
