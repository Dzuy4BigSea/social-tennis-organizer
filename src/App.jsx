import React, { useEffect, useState } from 'react'
import { useTournament } from './store/useTournament.js'
import { supabase } from './lib/supabase.js'
import Home from './components/Home.jsx'
import Setup from './components/Setup.jsx'
import LiveBoard from './components/LiveBoard.jsx'
import PrintView from './components/PrintView.jsx'
import SiteFooter from './components/SiteFooter.jsx'
import Auth from './components/Auth.jsx'

export default function App() {
  // session: undefined while we're checking, null when signed out, object
  // when signed in. The undefined state matters — without it we'd flash
  // the sign-in screen on every refresh before persistSession resolves.
  const [session, setSession] = useState(undefined)
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) =>
      setSession(s)
    )
    return () => sub.subscription.unsubscribe()
  }, [])

  const { state, dispatch, saveStatus, joinRoom, startNew, continueDraft, goHome } =
    useTournament()
  const [printing, setPrinting] = useState(false)

  if (session === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center text-vinoy-ink/60">
        Loading…
      </div>
    )
  }
  if (session === null) {
    return <Auth />
  }

  // Print is a modal-style takeover so the printable layout owns the
  // entire viewport — easier to get the @page sizing right than to
  // weave print-only sections through the live UI. Cancel returns to
  // wherever the pro was. PrintView renders its own footer so the
  // credit ends up on the printed document too.
  if (printing) {
    return <PrintView state={state} onClose={() => setPrinting(false)} />
  }

  let content
  if (state.phase === 'home') {
    const hasDraft =
      !state.tournament.roomCode &&
      ((state.divisions?.length ?? 0) > 0 || Boolean(state.tournament.name))
    content = (
      <Home
        draft={hasDraft ? state : null}
        onStartNew={startNew}
        onContinueDraft={continueDraft}
        onJoinRoom={joinRoom}
      />
    )
  } else if (state.phase === 'live') {
    content = (
      <LiveBoard
        state={state}
        dispatch={dispatch}
        saveStatus={saveStatus}
        onGoHome={goHome}
        onPrint={() => setPrinting(true)}
      />
    )
  } else {
    content = (
      <Setup
        state={state}
        dispatch={dispatch}
        saveStatus={saveStatus}
        onGoHome={goHome}
        onPrint={() => setPrinting(true)}
      />
    )
  }

  return (
    <>
      {content}
      <SignOutBadge email={session.user.email} />
      <SiteFooter />
    </>
  )
}

// Small floating chip in the top-right that confirms who's signed in and
// offers sign-out. Intentionally minimal for Phase 2 — once we have a real
// account menu we'll fold this into the masthead.
function SignOutBadge({ email }) {
  return (
    <div className="fixed top-2 right-2 z-40 print:hidden text-xs text-vinoy-ink/70 bg-white/80 backdrop-blur border border-vinoy-border rounded-full px-3 py-1 shadow-sm flex items-center gap-2">
      <span className="truncate max-w-[10rem]" title={email}>
        {email}
      </span>
      <button
        type="button"
        onClick={() => supabase.auth.signOut()}
        className="text-vinoy-green hover:text-vinoy-greenDark underline underline-offset-2"
      >
        Sign out
      </button>
    </div>
  )
}
