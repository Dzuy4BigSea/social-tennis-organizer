import React, { useEffect, useState } from 'react'
import { useAuth } from './store/useAuth.js'
import { useTournament } from './store/useTournament.js'
import Setup from './components/Setup.jsx'
import Roster from './components/Roster.jsx'
import CourtBoard from './components/CourtBoard.jsx'
import WelcomeScreen from './components/auth/WelcomeScreen.jsx'
import SignIn from './components/auth/SignIn.jsx'
import SignUp from './components/auth/SignUp.jsx'
import ProfileSetup from './components/auth/ProfileSetup.jsx'
import Home from './components/auth/Home.jsx'

export default function App() {
  const auth = useAuth()
  const { state, dispatch } = useTournament()
  const [authView, setAuthView] = useState('welcome')
  const [guestMode, setGuestMode] = useState(false)
  const [appView, setAppView] = useState('home')

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
          onSignUp={() => setAuthView('signup')}
        />
      )
    }
    if (authView === 'signup') {
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
        onSignIn={() => setAuthView('signin')}
        onSignUp={() => setAuthView('signup')}
        onGuest={() => setGuestMode(true)}
      />
    )
  }

  if (auth.session && !auth.profile) return <ProfileSetup />

  if (auth.session && appView === 'home') {
    return <Home onStartTournament={() => setAppView('tournament')} />
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

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-emerald-700 flex items-center justify-center">
      <div className="text-white text-sm">Loading…</div>
    </div>
  )
}
