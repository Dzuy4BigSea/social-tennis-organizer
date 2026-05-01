import React, { useState } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
} from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { shuffleCourts } from '../utils/shuffle.js'
import { exportJSON, generateRoomCode, saveToRoom, setRoomCodeInURL } from '../utils/share.js'
import PrintView from './PrintView.jsx'

// ─── Helpers ────────────────────────────────────────────────────────────────

function getPlayer(players, id) {
  return players.find(p => p.id === id) || null
}

function parseSlotId(slotId) {
  // Format: "slot-{courtId}-{teamIdx}-{slotIdx}" or "unassigned-{playerId}"
  if (slotId.startsWith('unassigned')) return { type: 'unassigned' }
  const parts = slotId.split('|')
  if (parts.length === 3) {
    return { type: 'slot', courtId: parts[0], teamIdx: parseInt(parts[1]), slotIdx: parseInt(parts[2]) }
  }
  return null
}

function makeSlotId(courtId, teamIdx, slotIdx) {
  return `${courtId}|${teamIdx}|${slotIdx}`
}

// ─── Gender badge ────────────────────────────────────────────────────────────

function GenderBadge({ gender, small }) {
  const map = {
    M: 'bg-blue-500 text-white',
    F: 'bg-pink-500 text-white',
    X: 'bg-purple-500 text-white',
  }
  return (
    <span className={`font-bold rounded px-1 ${small ? 'text-xs py-0' : 'text-xs py-0.5'} ${map[gender] || map.X}`}>
      {gender}
    </span>
  )
}

function SkillDots({ skill, small }) {
  return (
    <span className="flex gap-0.5">
      {[1,2,3,4,5].map(i => (
        <span key={i} className={`rounded-full ${small ? 'w-1.5 h-1.5' : 'w-2 h-2'} ${i <= skill ? 'bg-yellow-400' : 'bg-gray-200'}`} />
      ))}
    </span>
  )
}

// ─── Draggable Player Chip ────────────────────────────────────────────────────

function PlayerChip({ player, slotId, isDragOverlay }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `drag-${player.id}-${slotId}`,
    data: { playerId: player.id, slotId },
    disabled: isDragOverlay,
  })

  const style = transform ? {
    transform: CSS.Translate.toString(transform),
    zIndex: 1000,
  } : {}

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-white border-2 border-emerald-300 shadow cursor-grab select-none transition-opacity ${
        isDragging ? 'opacity-30' : 'opacity-100 hover:border-emerald-500 hover:shadow-md'
      } ${isDragOverlay ? 'cursor-grabbing shadow-xl border-emerald-500' : ''}`}
    >
      <div className="min-w-0">
        <div className="font-semibold text-gray-800 text-sm truncate max-w-[100px]">{player.name}</div>
        <div className="flex items-center gap-1 mt-0.5">
          <GenderBadge gender={player.gender} small />
          <SkillDots skill={player.skill} small />
        </div>
      </div>
    </div>
  )
}

// ─── Droppable Slot ──────────────────────────────────────────────────────────

function PlayerSlot({ slotId, player, resultsMode }) {
  const { setNodeRef, isOver } = useDroppable({ id: slotId })

  return (
    <div
      ref={setNodeRef}
      className={`min-h-[64px] rounded-lg border-2 transition-all flex items-center justify-center ${
        isOver
          ? 'border-emerald-500 bg-emerald-50'
          : player
            ? 'border-emerald-200 bg-white'
            : 'border-dashed border-gray-300 bg-gray-50'
      }`}
    >
      {player ? (
        <PlayerChip player={player} slotId={slotId} />
      ) : (
        <span className="text-xs text-gray-400 select-none px-2 text-center">
          {isOver ? 'Release to drop' : 'Drop player here'}
        </span>
      )}
    </div>
  )
}

// ─── Results Panel ───────────────────────────────────────────────────────────

function ResultsPanel({ court, players, dispatch }) {
  const [teamA, teamB] = court.teams

  const teamANames = (teamA || []).map(pid => pid ? getPlayer(players, pid)?.name || '?' : '—').join(' & ')
  const teamBNames = (teamB || []).map(pid => pid ? getPlayer(players, pid)?.name || '?' : '—').join(' & ')

  function setWinner(idx) {
    dispatch({ type: 'SET_WINNER', payload: { courtId: court.id, winnerId: idx } })
  }

  return (
    <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
      {[{ idx: 0, names: teamANames, label: 'A' }, { idx: 1, names: teamBNames, label: 'B' }].map(team => (
        <div key={team.idx} className="flex items-center gap-2">
          <span className="text-xs font-bold text-gray-500 w-4">{team.label}</span>
          <span className="flex-1 text-xs text-gray-700 truncate">{team.names}</span>
          <button
            onClick={() => setWinner(team.idx)}
            className={`px-3 py-1 rounded-lg text-xs font-bold border-2 transition-all ${
              court.winnerId === team.idx
                ? 'bg-emerald-600 border-emerald-600 text-white'
                : 'bg-white border-gray-300 text-gray-500 hover:border-emerald-400 hover:text-emerald-700'
            }`}
          >
            W
          </button>
          <button
            onClick={() => setWinner(1 - team.idx)}
            className={`px-3 py-1 rounded-lg text-xs font-bold border-2 transition-all ${
              court.winnerId === (1 - team.idx)
                ? 'bg-red-500 border-red-500 text-white'
                : 'bg-white border-gray-300 text-gray-500 hover:border-red-400 hover:text-red-600'
            }`}
          >
            L
          </button>
        </div>
      ))}
    </div>
  )
}

// ─── Court Card ──────────────────────────────────────────────────────────────

const COURT_BORDER_COLORS = [
  'border-yellow-400',  // 1 - gold
  'border-gray-400',    // 2 - silver
  'border-amber-600',   // 3 - bronze
  'border-emerald-400',
  'border-blue-400',
  'border-purple-400',
  'border-pink-400',
  'border-teal-400',
  'border-orange-400',
  'border-cyan-400',
  'border-indigo-400',
  'border-rose-400',
  'border-lime-400',
  'border-slate-400',
]

function CourtCard({ court, players, resultsMode, dispatch, format }) {
  const slotsPerTeam = format === 'singles' ? 1 : 2
  const borderColor = COURT_BORDER_COLORS[(court.number - 1) % COURT_BORDER_COLORS.length]
  const isTop = court.number === 1
  const [editing, setEditing] = useState(false)
  const [labelDraft, setLabelDraft] = useState('')

  function startEdit() {
    setLabelDraft(court.label ?? `Court ${court.number}`)
    setEditing(true)
  }

  function commitEdit() {
    const trimmed = labelDraft.trim()
    dispatch({
      type: 'RENAME_COURT',
      payload: { courtId: court.id, label: trimmed || `Court ${court.number}` },
    })
    setEditing(false)
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') commitEdit()
    if (e.key === 'Escape') setEditing(false)
  }

  const displayName = court.label ?? `Court ${court.number}`

  return (
    <div className={`bg-white rounded-xl shadow-md border-l-4 ${borderColor} p-4 w-full`}
      style={{ minWidth: 280, maxWidth: 340 }}>
      <div className="flex items-center justify-between mb-3">
        {editing ? (
          <input
            autoFocus
            value={labelDraft}
            onChange={e => setLabelDraft(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={handleKeyDown}
            className="font-bold text-gray-700 border-b-2 border-emerald-400 outline-none bg-transparent w-full mr-2"
          />
        ) : (
          <h3
            className="font-bold text-gray-700 cursor-pointer hover:text-emerald-700 flex items-center gap-1 group"
            title="Click to rename"
            onClick={startEdit}
          >
            {displayName}{isTop ? ' ★' : ''}
            <span className="text-gray-300 group-hover:text-emerald-400 text-xs">✎</span>
          </h3>
        )}
        {court.winnerId !== null && court.winnerId !== undefined && (
          <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium shrink-0">
            Result set
          </span>
        )}
      </div>

      {/* Teams */}
      <div className="grid grid-cols-2 gap-2">
        {[0, 1].map(teamIdx => (
          <div key={teamIdx}>
            <div className="text-xs font-semibold text-gray-400 mb-1">
              Team {teamIdx === 0 ? 'A' : 'B'}
            </div>
            <div className="space-y-1">
              {Array.from({ length: slotsPerTeam }).map((_, slotIdx) => {
                const slotId = makeSlotId(court.id, teamIdx, slotIdx)
                const playerId = court.teams[teamIdx]?.[slotIdx] || null
                const player = playerId ? getPlayer(players, playerId) : null
                return (
                  <PlayerSlot
                    key={slotId}
                    slotId={slotId}
                    player={player}
                    resultsMode={resultsMode}
                  />
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Results */}
      {resultsMode && (
        <ResultsPanel court={court} players={players} dispatch={dispatch} />
      )}
    </div>
  )
}

// ─── Unassigned Pool ─────────────────────────────────────────────────────────

function UnassignedPool({ playerIds, players }) {
  const { setNodeRef, isOver } = useDroppable({ id: 'unassigned' })

  const playerList = playerIds.map(id => getPlayer(players, id)).filter(Boolean)

  return (
    <div
      ref={setNodeRef}
      className={`min-h-[80px] rounded-xl border-2 border-dashed transition-all p-3 ${
        isOver ? 'border-emerald-500 bg-emerald-50' : 'border-gray-300 bg-gray-50'
      }`}
    >
      <div className="text-xs font-semibold text-gray-500 mb-2">
        Unassigned Players ({playerList.length})
      </div>
      {playerList.length === 0 ? (
        <div className="text-xs text-gray-400 text-center py-2">
          {isOver ? 'Drop here to unassign' : 'All players assigned'}
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {playerList.map(player => (
            <PlayerChip
              key={player.id}
              player={player}
              slotId={`unassigned-pool`}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main CourtBoard ─────────────────────────────────────────────────────────

export default function CourtBoard({ state, dispatch }) {
  const { tournament, courts, players } = state
  const [resultsMode, setResultsMode] = useState(false)
  const [showPrint, setShowPrint] = useState(false)
  const [activeId, setActiveId] = useState(null)
  const [activeDragData, setActiveDragData] = useState(null)
  const [roomMsg, setRoomMsg] = useState('')
  const [saveStatus, setSaveStatus] = useState('') // 'saving' | 'saved' | 'error' | ''

  const roomCode = tournament.roomCode

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  )

  // Compute unassigned player IDs
  const assignedIds = new Set()
  courts.forEach(court => {
    court.teams.forEach(team => team.forEach(pid => { if (pid) assignedIds.add(pid) }))
  })
  const checkedInPlayers = players.filter(p => p.checkedIn)
  const unassignedIds = checkedInPlayers.map(p => p.id).filter(id => !assignedIds.has(id))

  // Check if all courts have results
  const allResultsSet = courts.length > 0 && courts.every(c => c.winnerId !== null && c.winnerId !== undefined)

  function handleDragStart(event) {
    setActiveId(event.active.id)
    setActiveDragData(event.active.data.current)
  }

  function handleDragEnd(event) {
    setActiveId(null)
    setActiveDragData(null)
    const { active, over } = event
    if (!over) return

    const dragData = active.data.current
    if (!dragData) return

    const { playerId, slotId: sourceSlotId } = dragData
    const targetId = over.id

    // Parse source
    const source = parseSlotId(sourceSlotId)
    // Parse target
    let target = null
    if (targetId === 'unassigned') {
      target = { type: 'unassigned' }
    } else {
      target = parseSlotId(targetId)
    }

    if (!source || !target) return

    // Same slot — no-op
    if (source.type === 'slot' && target.type === 'slot' &&
        source.courtId === target.courtId &&
        source.teamIdx === target.teamIdx &&
        source.slotIdx === target.slotIdx) return

    // Dragging from court slot → unassigned
    if (source.type === 'slot' && target.type === 'unassigned') {
      dispatch({
        type: 'MOVE_TO_UNASSIGNED',
        payload: {
          playerId,
          fromCourtId: source.courtId,
          fromTeam: source.teamIdx,
          fromSlot: source.slotIdx,
        },
      })
      return
    }

    // Dragging from unassigned → court slot
    if (source.type === 'unassigned' && target.type === 'slot') {
      // Find if there's a player in the target slot
      const targetCourt = courts.find(c => c.id === target.courtId)
      const occupantId = targetCourt?.teams[target.teamIdx]?.[target.slotIdx] || null

      if (occupantId) {
        // Move occupant to unassigned, then place dragged player
        dispatch({
          type: 'MOVE_TO_UNASSIGNED',
          payload: {
            playerId: occupantId,
            fromCourtId: target.courtId,
            fromTeam: target.teamIdx,
            fromSlot: target.slotIdx,
          },
        })
      }
      dispatch({
        type: 'MOVE_FROM_UNASSIGNED',
        payload: {
          playerId,
          toCourtId: target.courtId,
          toTeam: target.teamIdx,
          toSlot: target.slotIdx,
        },
      })
      return
    }

    // Dragging from one court slot to another (swap)
    if (source.type === 'slot' && target.type === 'slot') {
      dispatch({
        type: 'MOVE_PLAYER',
        payload: {
          playerId,
          fromCourtId: source.courtId,
          fromTeam: source.teamIdx,
          fromSlot: source.slotIdx,
          toCourtId: target.courtId,
          toTeam: target.teamIdx,
          toSlot: target.slotIdx,
        },
      })
    }
  }

  function handleNextRound() {
    const { newCourts } = shuffleCourts(courts, tournament.format)
    dispatch({ type: 'NEXT_ROUND', payload: { newCourts } })
    setResultsMode(false)
  }

  async function handleCreateRoom() {
    const code = generateRoomCode()
    setSaveStatus('saving')
    const ok = await saveToRoom(code, { ...state, tournament: { ...tournament, roomCode: code } })
    if (ok) {
      dispatch({ type: 'SET_ROOM_CODE', payload: code })
      setRoomCodeInURL(code)
      setSaveStatus('saved')
      const url = window.location.origin + window.location.pathname + `#room=${code}`
      try { await navigator.clipboard.writeText(url) } catch {}
      setRoomMsg('Room created — URL copied!')
    } else {
      setSaveStatus('error')
      setRoomMsg('Save failed (are you on the live site?)')
    }
    setTimeout(() => { setSaveStatus(''); setRoomMsg('') }, 3000)
  }

  async function handleManualSave() {
    if (!roomCode) return
    setSaveStatus('saving')
    const ok = await saveToRoom(roomCode, state)
    setSaveStatus(ok ? 'saved' : 'error')
    setTimeout(() => setSaveStatus(''), 2000)
  }

  function handleCopyLink() {
    if (!roomCode) return
    const url = window.location.origin + window.location.pathname + `#room=${roomCode}`
    navigator.clipboard.writeText(url).then(() => {
      setRoomMsg('Link copied!')
      setTimeout(() => setRoomMsg(''), 2000)
    })
  }

  // Active drag player
  const activeDragPlayer = activeDragData ? getPlayer(players, activeDragData.playerId) : null

  if (showPrint) {
    return <PrintView state={state} onClose={() => setShowPrint(false)} />
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="min-h-screen bg-gray-50 flex flex-col">
        {/* Header */}
        <div className="bg-emerald-700 text-white px-4 py-3 shadow sticky top-0 z-40">
          <div className="max-w-7xl mx-auto flex items-center gap-3 flex-wrap">
            <button
              onClick={() => dispatch({ type: 'SET_PHASE', payload: 'roster' })}
              className="text-emerald-200 hover:text-white transition-colors text-sm shrink-0"
            >
              ← Roster
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="font-bold text-lg truncate">{tournament.name}</h1>
              <p className="text-emerald-200 text-xs">
                Round {tournament.currentRound} &nbsp;·&nbsp;
                {courts.length} Courts &nbsp;·&nbsp;
                {checkedInPlayers.length} Players
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              {/* Room code badge */}
              {roomCode ? (
                <div className="flex items-center gap-1.5 bg-emerald-900 border border-emerald-500 rounded-lg px-2 py-1">
                  <span className="text-emerald-300 text-xs">Room</span>
                  <span className="font-mono font-bold text-white tracking-widest text-sm">{roomCode}</span>
                  <button
                    onClick={handleCopyLink}
                    title="Copy shareable link"
                    className="text-emerald-300 hover:text-white text-xs ml-1 transition-colors"
                  >
                    🔗
                  </button>
                  <button
                    onClick={handleManualSave}
                    title="Save now"
                    className={`text-xs ml-0.5 transition-colors ${
                      saveStatus === 'saving' ? 'text-yellow-300 animate-pulse' :
                      saveStatus === 'saved'  ? 'text-green-300' :
                      saveStatus === 'error'  ? 'text-red-300' :
                      'text-emerald-300 hover:text-white'
                    }`}
                  >
                    {saveStatus === 'saving' ? '↻' : saveStatus === 'saved' ? '✓' : saveStatus === 'error' ? '✗' : '💾'}
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleCreateRoom}
                  className="px-3 py-1.5 bg-yellow-400 hover:bg-yellow-300 text-yellow-900 rounded-lg text-sm font-bold transition-colors"
                  title="Create a shared room so co-organizers see live updates"
                >
                  + Share Room
                </button>
              )}
              {roomMsg && (
                <span className="text-xs text-yellow-200 font-medium">{roomMsg}</span>
              )}
              <button
                onClick={() => setResultsMode(r => !r)}
                className={`px-3 py-1.5 rounded-lg text-sm font-bold border-2 transition-all ${
                  resultsMode
                    ? 'bg-yellow-400 border-yellow-400 text-yellow-900'
                    : 'bg-emerald-800 border-emerald-600 text-white hover:bg-emerald-600'
                }`}
              >
                {resultsMode ? '📋 Results Mode ON' : '📋 Mark Results'}
              </button>
              <button
                onClick={() => setShowPrint(true)}
                className="px-3 py-1.5 bg-white text-emerald-800 rounded-lg text-sm font-bold hover:bg-gray-100 transition-colors"
              >
                🖨 Print
              </button>
              <button
                onClick={() => exportJSON(state)}
                className="px-3 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg text-sm font-medium transition-colors border border-emerald-600"
              >
                ⬇ Export
              </button>
            </div>
          </div>
        </div>

        {/* Next Round Banner */}
        {resultsMode && allResultsSet && (
          <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-3 text-center">
            <p className="text-yellow-800 text-sm font-medium mb-2">
              All courts have results! Ready for the next round.
            </p>
            <button
              onClick={handleNextRound}
              className="px-6 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl font-bold shadow-md transition-all"
            >
              Run Next Round →
            </button>
          </div>
        )}

        {/* Court Grid */}
        <div className="flex-1 p-4 max-w-7xl mx-auto w-full">
          <div className="flex flex-wrap gap-4 justify-start">
            {courts.map(court => (
              <CourtCard
                key={court.id}
                court={court}
                players={players}
                resultsMode={resultsMode}
                dispatch={dispatch}
                format={tournament.format}
              />
            ))}
          </div>

          {/* Unassigned Pool */}
          <div className="mt-6">
            <h3 className="font-semibold text-gray-600 text-sm mb-2">Unassigned Players</h3>
            <UnassignedPool playerIds={unassignedIds} players={players} />
          </div>
        </div>
      </div>

      {/* Drag Overlay */}
      <DragOverlay>
        {activeDragPlayer ? (
          <PlayerChip player={activeDragPlayer} slotId="overlay" isDragOverlay />
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
