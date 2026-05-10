import React, { useState } from 'react'
import { supabase } from '../lib/supabase.js'
import Brand from './Brand.jsx'
import OrnamentalRule from './OrnamentalRule.jsx'

// Sign-in screen. Phase 2 only supports existing users — no signup flow
// yet, since the only path to a club role is via a head_pro seeding the
// account from the dashboard. Once we add invite codes, this screen
// gains a "register with code" tab.
export default function Auth() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  async function onSubmit(e) {
    e.preventDefault()
    setErr('')
    setBusy(true)
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })
    setBusy(false)
    if (error) setErr(error.message)
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-2">
          <Brand />
        </div>
        <OrnamentalRule />
        <h1 className="text-2xl font-display font-bold text-vinoy-green text-center mt-4 mb-6">
          Sign in
        </h1>

        <form
          onSubmit={onSubmit}
          className="bg-white/70 border border-vinoy-border rounded-lg p-5 shadow-sm space-y-4"
        >
          <label className="block">
            <span className="block text-sm font-medium text-vinoy-ink/80 mb-1">
              Email
            </span>
            <input
              type="email"
              autoComplete="email"
              autoFocus
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-vinoy-border rounded bg-white focus:outline-none focus:ring-2 focus:ring-vinoy-green/40"
            />
          </label>

          <label className="block">
            <span className="block text-sm font-medium text-vinoy-ink/80 mb-1">
              Password
            </span>
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-vinoy-border rounded bg-white focus:outline-none focus:ring-2 focus:ring-vinoy-green/40"
            />
          </label>

          {err && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
              {err}
            </div>
          )}

          <button
            type="submit"
            disabled={busy || !email || !password}
            className="w-full bg-vinoy-green text-white font-semibold rounded py-2 hover:bg-vinoy-greenDark disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="text-xs text-vinoy-ink/60 text-center mt-4">
          Accounts are created by the club. Ask your head pro for access.
        </p>
      </div>
    </div>
  )
}
