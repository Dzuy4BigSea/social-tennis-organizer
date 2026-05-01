import { useReducer, useEffect, useRef } from 'react'
import { getRoomCodeFromURL, loadFromRoom, saveToRoom, setRoomCodeInURL } from '../utils/share.js'

const STORAGE_KEY = 'tennis-tournament-state'

let _idCounter = 1
function newId() {
  return `player-${_idCounter++}-${Math.random().toString(36).slice(2, 7)}`
}

const initialState = {
  phase: 'setup',
  tournament: {
    name: '',
    format: 'doubles',
    numCourts: 6,
    genderMix: 'open',
    currentRound: 0,
    roomCode: null,
  },
  players: [],
  courts: [],
  history: [],
}

function reducer(state, action) {
  switch (action.type) {
    case 'SET_TOURNAMENT':
      return { ...state, tournament: { ...state.tournament, ...action.payload } }

    case 'SET_PHASE':
      return { ...state, phase: action.payload }

    case 'ADD_PLAYER': {
      const player = {
        id: newId(),
        name: action.payload.name,
        gender: action.payload.gender || 'X',
        skill: action.payload.skill || 3,
        checkedIn: true,
        wins: 0,
        losses: 0,
      }
      return { ...state, players: [...state.players, player] }
    }

    case 'UPDATE_PLAYER':
      return {
        ...state,
        players: state.players.map(p =>
          p.id === action.payload.id ? { ...p, ...action.payload } : p
        ),
      }

    case 'REMOVE_PLAYER':
      return {
        ...state,
        players: state.players.filter(p => p.id !== action.payload),
        courts: state.courts.map(court => ({
          ...court,
          teams: court.teams.map(team => team.map(pid => pid === action.payload ? null : pid)),
        })),
      }

    case 'TOGGLE_CHECKIN':
      return {
        ...state,
        players: state.players.map(p =>
          p.id === action.payload ? { ...p, checkedIn: !p.checkedIn } : p
        ),
      }

    case 'SET_COURTS':
      return {
        ...state,
        courts: action.payload,
        phase: 'round',
        tournament: { ...state.tournament, currentRound: state.tournament.currentRound + 1 },
      }

    case 'RENAME_COURT':
      return {
        ...state,
        courts: state.courts.map(c =>
          c.id === action.payload.courtId ? { ...c, label: action.payload.label } : c
        ),
      }

    case 'MOVE_PLAYER': {
      const { playerId, fromCourtId, fromTeam, fromSlot, toCourtId, toTeam, toSlot } = action.payload
      let destPlayerId = null
      if (toCourtId !== 'unassigned') {
        const destCourt = state.courts.find(c => c.id === toCourtId)
        if (destCourt) destPlayerId = destCourt.teams[toTeam]?.[toSlot] ?? null
      }
      const newCourts = state.courts.map(court => {
        let teams = court.teams.map(team => [...team])
        if (court.id === fromCourtId && fromTeam !== null && fromSlot !== null)
          teams[fromTeam][fromSlot] = destPlayerId
        if (court.id === toCourtId && toTeam !== null && toSlot !== null)
          teams[toTeam][toSlot] = playerId
        return { ...court, teams }
      })
      return { ...state, courts: newCourts }
    }

    case 'MOVE_TO_UNASSIGNED': {
      const { playerId, fromCourtId, fromTeam, fromSlot } = action.payload
      const newCourts = state.courts.map(court => {
        if (court.id !== fromCourtId) return court
        const teams = court.teams.map(team => [...team])
        if (fromTeam !== null && fromSlot !== null) teams[fromTeam][fromSlot] = null
        return { ...court, teams }
      })
      return { ...state, courts: newCourts }
    }

    case 'MOVE_FROM_UNASSIGNED': {
      const { playerId, toCourtId, toTeam, toSlot } = action.payload
      const newCourts = state.courts.map(court => {
        if (court.id !== toCourtId) return court
        const teams = court.teams.map(team => [...team])
        teams[toTeam][toSlot] = playerId
        return { ...court, teams }
      })
      return { ...state, courts: newCourts }
    }

    case 'SET_WINNER':
      return {
        ...state,
        courts: state.courts.map(c =>
          c.id === action.payload.courtId ? { ...c, winnerId: action.payload.winnerId } : c
        ),
      }

    case 'NEXT_ROUND': {
      const currentCourts = state.courts
      const historyEntry = {
        round: state.tournament.currentRound,
        courts: JSON.parse(JSON.stringify(currentCourts)),
      }
      const winMap = {}
      const lossMap = {}
      currentCourts.forEach(court => {
        if (court.winnerId === null || court.winnerId === undefined) return
        const winTeam = court.teams[court.winnerId] || []
        const loseTeam = court.teams[1 - court.winnerId] || []
        winTeam.forEach(pid => { if (pid) winMap[pid] = (winMap[pid] || 0) + 1 })
        loseTeam.forEach(pid => { if (pid) lossMap[pid] = (lossMap[pid] || 0) + 1 })
      })
      const updatedPlayers = state.players.map(p => ({
        ...p,
        wins: (p.wins || 0) + (winMap[p.id] || 0),
        losses: (p.losses || 0) + (lossMap[p.id] || 0),
      }))
      return {
        ...state,
        history: [...state.history, historyEntry],
        players: updatedPlayers,
        courts: action.payload.newCourts,
        tournament: { ...state.tournament, currentRound: state.tournament.currentRound + 1 },
      }
    }

    case 'SET_ROOM_CODE':
      return { ...state, tournament: { ...state.tournament, roomCode: action.payload } }

    case 'LOAD_STATE':
      return { ...initialState, ...action.payload }

    case 'RESET':
      return { ...initialState }

    default:
      return state
  }
}

export function useTournament() {
  const [state, dispatch] = useReducer(reducer, null, () => {
    // 1. Room code in URL → will be loaded async after mount
    // 2. localStorage fallback
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) return JSON.parse(saved)
    } catch {}
    return initialState
  })

  const saveTimerRef = useRef(null)
  const isFirstRender = useRef(true)

  // On mount: if there's a room code in the URL, load from server
  useEffect(() => {
    const code = getRoomCodeFromURL()
    if (!code) return
    loadFromRoom(code).then(loaded => {
      if (loaded) {
        dispatch({ type: 'LOAD_STATE', payload: { ...loaded, tournament: { ...loaded.tournament, roomCode: code } } })
        setRoomCodeInURL(code)
      }
    })
  }, [])

  // Persist to localStorage on every change
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)) } catch {}
  }, [state])

  // Auto-save to server (debounced 1.5s) whenever state changes and a room code exists
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    const code = state.tournament.roomCode
    if (!code) return
    clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      saveToRoom(code, state)
    }, 1500)
    return () => clearTimeout(saveTimerRef.current)
  }, [state])

  return { state, dispatch }
}

export { initialState }
