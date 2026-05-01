import React from 'react'
import { useTournament } from './store/useTournament.js'
import Setup from './components/Setup.jsx'
import Roster from './components/Roster.jsx'
import CourtBoard from './components/CourtBoard.jsx'

export default function App() {
  const { state, dispatch } = useTournament()

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
