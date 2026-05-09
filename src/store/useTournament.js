import { useReducer, useEffect, useRef, useState } from 'react'
import {
  getRoomCodeFromURL,
  loadFromRoom,
  saveToRoom,
  setRoomCodeInURL,
} from '../utils/share.js'
import { generateSchedule } from '../utils/schedule.js'

const STORAGE_KEY = 'feedin-tournament-state'

let _idCounter = 1
function newId(prefix = 'id') {
  return `${prefix}-${_idCounter++}-${Math.random().toString(36).slice(2, 6)}`
}

/**
 * State shape:
 * {
 *   phase: 'setup' | 'live',
 *   tournament: {
 *     name,
 *     date,
 *     winningScore,        // first to N (default 7)
 *     roomCode,
 *     pinHash,             // bcrypt-style hash, set when pro chooses a pin
 *   },
 *   divisions: [
 *     {
 *       id, name, courtLabel,
 *       pairs:   [{ id, label, p1, p2 }],
 *       matches: [{ id, round, slot, pairA, pairB, bye, scoreA, scoreB, completed }],
 *       locked,            // schedule generated, no more pair edits
 *     }
 *   ]
 * }
 */
export const initialState = {
  phase: 'setup',
  tournament: {
    name: '',
    date: '',
    winningScore: 7,
    roomCode: null,
    pinHash: null,
  },
  divisions: [],
}

function reducer(state, action) {
  switch (action.type) {
    case 'SET_TOURNAMENT':
      return { ...state, tournament: { ...state.tournament, ...action.payload } }

    case 'SET_PHASE':
      return { ...state, phase: action.payload }

    case 'ADD_DIVISION': {
      const division = {
        id: newId('div'),
        name: action.payload.name || 'New Division',
        courtLabel: action.payload.courtLabel || '',
        pairs: [],
        matches: [],
        locked: false,
      }
      return { ...state, divisions: [...state.divisions, division] }
    }

    case 'UPDATE_DIVISION':
      return {
        ...state,
        divisions: state.divisions.map(d =>
          d.id === action.payload.id ? { ...d, ...action.payload.patch } : d
        ),
      }

    case 'REMOVE_DIVISION':
      return {
        ...state,
        divisions: state.divisions.filter(d => d.id !== action.payload),
      }

    case 'ADD_PAIR': {
      const { divisionId, p1, p2 } = action.payload
      return {
        ...state,
        divisions: state.divisions.map(d => {
          if (d.id !== divisionId || d.locked) return d
          const pair = {
            id: newId('pair'),
            p1: p1 || '',
            p2: p2 || '',
            label: pairLabel(p1, p2),
          }
          return { ...d, pairs: [...d.pairs, pair] }
        }),
      }
    }

    case 'UPDATE_PAIR': {
      const { divisionId, pairId, patch } = action.payload
      return {
        ...state,
        divisions: state.divisions.map(d => {
          if (d.id !== divisionId || d.locked) return d
          return {
            ...d,
            pairs: d.pairs.map(p => {
              if (p.id !== pairId) return p
              const merged = { ...p, ...patch }
              merged.label = pairLabel(merged.p1, merged.p2)
              return merged
            }),
          }
        }),
      }
    }

    case 'REMOVE_PAIR': {
      const { divisionId, pairId } = action.payload
      return {
        ...state,
        divisions: state.divisions.map(d => {
          if (d.id !== divisionId || d.locked) return d
          return { ...d, pairs: d.pairs.filter(p => p.id !== pairId) }
        }),
      }
    }

    case 'REORDER_PAIRS': {
      const { divisionId, order } = action.payload // order = array of pair ids
      return {
        ...state,
        divisions: state.divisions.map(d => {
          if (d.id !== divisionId || d.locked) return d
          const byId = Object.fromEntries(d.pairs.map(p => [p.id, p]))
          return { ...d, pairs: order.map(id => byId[id]).filter(Boolean) }
        }),
      }
    }

    case 'LOCK_DIVISION': {
      const { divisionId } = action.payload
      return {
        ...state,
        divisions: state.divisions.map(d => {
          if (d.id !== divisionId) return d
          if (d.pairs.length < 2) return d
          const { matches } = generateSchedule(d.pairs.length)
          return { ...d, matches, locked: true }
        }),
      }
    }

    case 'UNLOCK_DIVISION': {
      const { divisionId } = action.payload
      return {
        ...state,
        divisions: state.divisions.map(d => {
          if (d.id !== divisionId) return d
          return { ...d, matches: [], locked: false }
        }),
      }
    }

    case 'RECORD_SCORE': {
      const { divisionId, matchId, scoreA, scoreB } = action.payload
      return {
        ...state,
        divisions: state.divisions.map(d => {
          if (d.id !== divisionId) return d
          return {
            ...d,
            matches: d.matches.map(m =>
              m.id === matchId
                ? { ...m, scoreA, scoreB, completed: true }
                : m
            ),
          }
        }),
      }
    }

    case 'CLEAR_SCORE': {
      const { divisionId, matchId } = action.payload
      return {
        ...state,
        divisions: state.divisions.map(d => {
          if (d.id !== divisionId) return d
          return {
            ...d,
            matches: d.matches.map(m =>
              m.id === matchId
                ? { ...m, scoreA: null, scoreB: null, completed: false }
                : m
            ),
          }
        }),
      }
    }

    case 'START_LIVE':
      return { ...state, phase: 'live' }

    case 'BACK_TO_SETUP':
      return { ...state, phase: 'setup' }

    case 'SET_ROOM_CODE':
      return { ...state, tournament: { ...state.tournament, roomCode: action.payload } }

    case 'SET_PIN_HASH':
      return { ...state, tournament: { ...state.tournament, pinHash: action.payload } }

    case 'LOAD_STATE':
      return { ...initialState, ...action.payload }

    case 'RESET':
      return { ...initialState }

    default:
      return state
  }
}

function pairLabel(p1, p2) {
  const a = (p1 || '').trim()
  const b = (p2 || '').trim()
  if (a && b) return `${a} / ${b}`
  return a || b || 'Unnamed pair'
}

export function useTournament() {
  const [state, dispatch] = useReducer(reducer, null, () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) return JSON.parse(saved)
    } catch {}
    return initialState
  })

  const saveTimerRef = useRef(null)
  const isFirstRender = useRef(true)
  const stateRef = useRef(state)
  stateRef.current = state

  // dirtyRef: true while the local state has changes that haven't successfully
  // synced to the server. Polling refuses to overwrite local state while this
  // is true, which prevents a stale server snapshot from clobbering edits the
  // user is in the middle of making (the bug where typing a name "flashed"
  // and reset to empty).
  const dirtyRef = useRef(false)
  const [saveStatus, setSaveStatus] = useState('idle') // 'idle'|'saving'|'saved'|'forbidden'|'error'

  // On mount: if URL has a room code, hydrate from server.
  useEffect(() => {
    const code = getRoomCodeFromURL()
    if (!code) return
    loadFromRoom(code).then(loaded => {
      if (loaded) {
        dispatch({
          type: 'LOAD_STATE',
          payload: { ...loaded, tournament: { ...loaded.tournament, roomCode: code } },
        })
        setRoomCodeInURL(code)
      }
    })
  }, [])

  // Persist locally on every change.
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {}
  }, [state])

  // Debounced server save when a room code is set.
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    const code = state.tournament.roomCode
    if (!code) return
    dirtyRef.current = true
    setSaveStatus('saving')
    clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(async () => {
      try {
        const res = await saveToRoom(code, stateRef.current)
        if (res.ok) {
          dirtyRef.current = false
          setSaveStatus('saved')
        } else if (res.status === 403) {
          setSaveStatus('forbidden')
        } else {
          setSaveStatus('error')
        }
      } finally {
        saveTimerRef.current = null
      }
    }, 1200)
    return () => clearTimeout(saveTimerRef.current)
  }, [state])

  // Poll server periodically so other devices see updates within ~5s.
  useEffect(() => {
    const code = state.tournament.roomCode
    if (!code) return
    const id = setInterval(async () => {
      // Don't poll while a debounced save is pending — we'd just race with our
      // own write and clobber unsaved local edits.
      if (saveTimerRef.current) return
      // Don't overwrite local state while it has unsynced changes. Without
      // this, a 403 (wrong PIN) save would silently fail and the next poll
      // would replace the user's typing with the unmodified server snapshot.
      if (dirtyRef.current) return
      const remote = await loadFromRoom(code)
      if (!remote) return
      const current = stateRef.current
      const localStr = JSON.stringify(current)
      const remoteStr = JSON.stringify({
        ...remote,
        tournament: { ...remote.tournament, roomCode: code },
      })
      if (localStr !== remoteStr) {
        dispatch({
          type: 'LOAD_STATE',
          payload: { ...remote, tournament: { ...remote.tournament, roomCode: code } },
        })
      }
    }, 5000)
    return () => clearInterval(id)
  }, [state.tournament.roomCode])

  return { state, dispatch, saveStatus }
}
