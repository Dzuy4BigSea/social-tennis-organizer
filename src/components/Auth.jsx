import React, { useState } from 'react'
import { supabase } from '../lib/supabase.js'
import OrnamentalRule from './OrnamentalRule.jsx'
import SiteFooter from './SiteFooter.jsx'

// Sign-in screen. Phase 2 only supports existing users — no signup
// flow yet, since the only path to a club role is via a head_pro
// seeding the account. Once we add invite codes, this screen gains a
// "register with code" tab.
//
// Layout deliberately differs from internal pages: the crest stacks
// above "VINOY TENNIS" instead of next to it. Sign-in has plenty of
// vertical room on a phone, and a stacked masthead reads more like a
// resort marquee than the horizontal lockup we use inside the app.
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

  const logoUrl = `${import.meta.env.BASE_URL}vinoy-logo.png`

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1 flex flex-col items-center px-4 pt-12 sm:pt-16 pb-8">
        <div className="w-full max-w-sm flex flex-col items-center">
          <img
            src={logoUrl}
            alt="Vinoy Club crest"
            className="h-24 sm:h-28 w-auto select-none"
            draggable={false}
          />
          <div className="font-display font-bold text-vinoy-green tracking-wide text-2xl sm:text-3xl mt-3">
            VINOY TENNIS
          </div>
          <OrnamentalRule className="w-40 mt-3" />

          <h1 className="text-xl font-display font-bold text-vinoy-green mt-8 mb-4">
            Sign in
          </h1>

          <form
            onSubmit={onSubmit}
            className="w-full bg-white/70 border border-vinoy-border rounded-lg p-5 shadow-sm space-y-4"
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

      <SiteFooter />
    </div>
  )
}
