import React from 'react'
import { useTournament } from './store/useTournament.js'
import Home from './components/Home.jsx'
import Setup from './components/Setup.jsx'
import LiveBoard from './components/LiveBoard.jsx'

export default function App() {
  const { state, dispatch, saveStatus, joinRoom, startNew, continueDraft, goHome } =
    useTournament()

  if (state.phase === 'home') {
    // Surface a draft-recovery entry only if the user has unfinished
    // setup work that isn't already anchored to a room code.
    const hasDraft =
      !state.tournament.roomCode &&
      ((state.divisions?.length ?? 0) > 0 ||
        Boolean(state.tournament.name) ||
        (state.tournament.passes?.length ?? 1) > 1)
    return (
      <Home
        draft={hasDraft ? state : null}
        onStartNew={startNew}
        onContinueDraft={continueDraft}
        onJoinRoom={joinRoom}
      />
    )
  }

  if (state.phase === 'live') {
    return (
      <LiveBoard
        state={state}
        dispatch={dispatch}
        saveStatus={saveStatus}
        onGoHome={goHome}
      />
    )
  }

  return (
    <Setup
      state={state}
      dispatch={dispatch}
      saveStatus={saveStatus}
      onGoHome={goHome}
    />
  )
}
