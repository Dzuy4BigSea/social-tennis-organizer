import React from 'react'
import { useTournament } from './store/useTournament.js'
import Setup from './components/Setup.jsx'
import LiveBoard from './components/LiveBoard.jsx'

export default function App() {
  const { state, dispatch } = useTournament()

  if (state.phase === 'live') {
    return <LiveBoard state={state} dispatch={dispatch} />
  }
  return <Setup state={state} dispatch={dispatch} />
}
