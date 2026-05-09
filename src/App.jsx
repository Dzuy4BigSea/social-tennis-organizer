import React, { useState } from 'react'
import { useTournament } from './store/useTournament.js'
import Home from './components/Home.jsx'
import Setup from './components/Setup.jsx'
import LiveBoard from './components/LiveBoard.jsx'
import PrintView from './components/PrintView.jsx'
import SiteFooter from './components/SiteFooter.jsx'

export default function App() {
  const { state, dispatch, saveStatus, joinRoom, startNew, continueDraft, goHome } =
    useTournament()
  const [printing, setPrinting] = useState(false)

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
      ((state.divisions?.length ?? 0) > 0 ||
        Boolean(state.tournament.name) ||
        (state.tournament.passes?.length ?? 1) > 1)
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
      <SiteFooter />
    </>
  )
}
