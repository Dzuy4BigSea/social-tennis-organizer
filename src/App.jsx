import React, { useEffect, useState } from 'react'
import { useAuth } from './store/useAuth.js'
import { useTournament } from './store/useTournament.js'
import { getSupabase } from './lib/supabase.js'
import Setup from './components/Setup.jsx'
import Roster from './components/Roster.jsx'
import CourtBoard from './components/CourtBoard.jsx'
import WelcomeScreen from './components/auth/WelcomeScreen.jsx'
import SignIn from './components/auth/SignIn.jsx'
import SignUp from './components/auth/SignUp.jsx'
import ProfileSetup from './components/auth/ProfileSetup.jsx'
import OrgBootstrap from './components/auth/OrgBootstrap.jsx'
import Home from './components/auth/Home.jsx'

function readInviteFromUrl() {
  const params = new URLSearchParams(window.location.search)
  const token = params.get('invite')
  if (!token) return null
  params.delete('invite')
  const search = params.toString()
  const url =
    window.location.pathname +
    (search ? '?' + search : '') +
    window.location.hash
  window.history.replaceState({}, '', url)
  return token
}

export default function App() {
  const auth = useAuth()
  const { state, dispatch } = useTournament()
  const [authView, setAuthView] = useState('welcome')
  const [guestMode, setGuestMode] = useState(false)
  const [appView, setAppView] = useState('home')
  const [inviteToken, setInviteToken] = useState(null)
  const [inviteOrgName, setInviteOrgName] = useState(null)
  const [redeeming, setRedeeming] = useState(false)
  const [inviteError, setInviteError] = useState(null)

  useEffect(() => {
    const token = readInviteFromUrl()
    if (token) setInviteToken(token)
  }, [])

  // Look up the org name behind the invite (so the welcome screen can
  // show "Lakeside invited you"). Doesn't redeem yet.
  useEffect(() => {
    if (!auth.configured || !inviteToken) return
    let mounted = true
    const supabase = getSupabase()
    supabase
      .from('org_invites')
      .select('org_id, orgs(name)')
      .eq('code', inviteToken)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!mounted) return
        if (error || !data) {
          setInviteOrgName(null)
          return
        }
        setInviteOrgName(data.orgs?.name ?? 'a club')
      })
    return () => {
      mounted = false
    }
  }, [auth.configured, inviteToken])

  // Once signed in with profile, redeem any pending invite.
  useEffect(() => {
    if (
      !auth.session ||
      !auth.profile ||
      !inviteToken ||
      redeeming
    )
      return
    setRedeeming(true)
    setInviteError(null)
    auth
      .redeemInvite(inviteToken)
      .then(() => setInviteToken(null))
      .catch((err) => {
        console.error('[invite] redeem failed', err)
        setInviteError(err.message ?? 'Could not redeem invite')
        setInviteToken(null)
      })
      .finally(() => setRedeeming(false))
  }, [auth.session?.user?.id, auth.profile?.id, inviteToken])

  useEffect(() => {
    if (auth.session) setGuestMode(false)
    else setAppView('home')
  }, [auth.session])

  if (auth.configured && auth.loading) return <LoadingScreen />

  if (auth.configured && !auth.session && !guestMode) {
    if (authView === 'signin') {
      return (
        <SignIn
          onBack={() => setAuthView('welcome')}
          onSignUp={
            inviteOrgName ? () => setAuthView('signup') : undefined
          }
        />
      )
    }
    if (authView === 'signup' && inviteOrgName) {
      return (
        <SignUp
          onBack={() => setAuthView('welcome')}
          onSignIn={() => setAuthView('signin')}
        />
      )
    }
    return (
      <WelcomeScreen
        configured={auth.configured}
        inviteOrgName={inviteOrgName}
        onSignIn={() => setAuthView('signin')}
        onSignUp={() => setAuthView('signup')}
        onGuest={() => setGuestMode(true)}
      />
    )
  }

  if (auth.session && !auth.profile) return <ProfileSetup />

  if (redeeming) return <LoadingScreen label="Joining club…" />

  if (auth.session && auth.profile && auth.orgs.length === 0) {
    return <OrgBootstrap />
  }

  if (auth.session && appView === 'home') {
    return (
      <Home
        onStartTournament={() => setAppView('tournament')}
        inviteError={inviteError}
      />
    )
  }

  switch (state.phase) {
    case 'setup':
      return <Setup state={state} dispatch={dispatch} />
    case 'roster':
      return <Roster state={state} dispatch={dispatch} />
    case 'round':
      return <CourtBoard state={state} dispatch={dispatch} />
    default:
      return <Setup state={state} dispatch={dispatch} />
  }
}

function LoadingScreen({ label = 'Loading…' }) {
  return (
    <div className="min-h-screen bg-emerald-700 flex items-center justify-center">
      <div className="text-white text-sm">{label}</div>
    </div>
  )
}
