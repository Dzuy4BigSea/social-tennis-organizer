import { useReducer, useEffect, useRef, useState } from 'react'
import {
  generateRoomCode,
  getRoomCodeFromURL,
  loadFromRoom,
  saveToRoom,
  setRoomCodeInURL,
  trackRoomVisit,
} from '../utils/share.js'
import { generateSchedule } from '../utils/schedule.js'
import { applyWalkoverPropagation } from '../utils/bracket.js'

const STORAGE_KEY = 'feedin-tournament-state'

let _idCounter = 1
function newId(prefix = 'id') {
  return `${prefix}-${_idCounter++}-${Math.random().toString(36).slice(2, 6)}`
}

/**
 * State shape:
 * {
 *   phase: 'home' | 'setup' | 'live',
 *   tournament: {
 *     name,
 *     date,
 *     passes: [{ winningScore }, ...],  // one entry per round; coaches set
 *                                       // a target score per round (e.g.
 *                                       // round 1 to 7, round 2 to 5)
 *     roomCode,
 *     pinHash,
 *   },
 *   divisions: [
 *     {
 *       id, name, courtLabel,
 *       pairs:   [{ id, label, p1, p2 }],
 *       matches: [{ id, pass, round, slot, pairA, pairB, bye, scoreA, scoreB, completed }],
 *       locked,
 *     }
 *   ]
 * }
 */
export const initialState = {
  phase: 'home',
  tournament: {
    // Event identity
    type: 'feedIn',          // see src/utils/eventTypes.js
    variant: 'all',          // 'all' | 'mens' | 'womens' | 'mixed'
    rating: '',              // '' for unset; e.g. '4.0' or 'combo-8.0'
    name: '',
    startDate: '',           // YYYY-MM-DD
    endDate: '',             // YYYY-MM-DD; blank when ongoing or single-day
    startTime: '',           // HH:MM (24h); first ball
    endTime: '',             // HH:MM (24h); optional
    ongoing: false,          // weekly/recurring play; dates ignored
    // Round-robin specific (kept here so existing feed-in events still
    // round-trip cleanly through the same field).
    passes: [{ winningScore: 7 }],
    // Sharing/auth
    roomCode: null,
    pinHash: null,
    // Legacy field, written by older clients. Kept for migration only.
    date: '',
  },
  divisions: [],   // round-robin draws
  brackets: [],    // single/double-elim draws (multiple per event supported)
}

/**
 * Older saved tournaments stored a single `tournament.winningScore`
 * instead of a passes array. Lift them into the new shape so existing
 * rooms keep working after this update.
 */
function migrate(state) {
  if (!state || !state.tournament) return state
  let next = state
  // Older saves stored a single tournament.winningScore instead of a
  // passes array. Lift them into the new shape so existing rooms keep
  // working after the multi-round update.
  const t = next.tournament
  if (!Array.isArray(t.passes) || t.passes.length === 0) {
    const ws = typeof t.winningScore === 'number' ? t.winningScore : 7
    const { winningScore: _ws, ...rest } = t
    next = { ...next, tournament: { ...rest, passes: [{ winningScore: ws }] } }
  }
  // Backfill the new event-identity fields. Pre-existing tournaments
  // were always feed-in style, so default to that. `date` becomes
  // `startDate` since the old single-date field was treated as the
  // event's day.
  const tt = next.tournament
  if (!tt.type || !tt.variant) {
    next = {
      ...next,
      tournament: {
        type: tt.type || 'feedIn',
        variant: tt.variant || 'all',
        rating: tt.rating || '',
        startDate: tt.startDate || tt.date || '',
        endDate: tt.endDate || '',
        startTime: tt.startTime || '',
        endTime: tt.endTime || '',
        ongoing: typeof tt.ongoing === 'boolean' ? tt.ongoing : false,
        ...tt,
      },
    }
  }
  // Bracket events used to store a single `bracket` field. Lift it
  // into the `brackets` array so the rest of the app can assume
  // many-per-event from now on.
  if (!Array.isArray(next.brackets)) {
    if (next.bracket && (next.bracket.entrants?.length || next.bracket.matches?.length)) {
      const legacy = next.bracket
      const seedName = next.tournament?.name || 'Bracket'
      const { bracket: _drop, ...rest } = next
      next = {
        ...rest,
        brackets: [{ id: 'br-legacy', name: seedName, ...legacy }],
      }
    } else {
      const { bracket: _drop, ...rest } = next
      next = { ...rest, brackets: [] }
    }
  }
  // Home-screen migration: if state has no anchoring room code, the
  // user can't share or recover it from another device — route them
  // to the home screen so they can either continue the draft or pick
  // an existing tournament. The /feedin/#room=XXX deep-link path
  // populates roomCode before this runs, so mid-event refreshes are
  // unaffected.
  if (!next.tournament.roomCode && next.phase !== 'home') {
    next = { ...next, phase: 'home' }
  }
  return next
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
      const passCount = state.tournament.passes?.length || 1
      return {
        ...state,
        divisions: state.divisions.map(d => {
          if (d.id !== divisionId) return d
          if (d.pairs.length < 2) return d
          const { matches } = generateSchedule(d.pairs.length, passCount)
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

    case 'SET_MATCH_SCHEDULE': {
      const { divisionId, matchId, scheduledAt } = action.payload
      return {
        ...state,
        divisions: state.divisions.map(d => {
          if (d.id !== divisionId) return d
          return {
            ...d,
            matches: d.matches.map(m =>
              m.id === matchId ? { ...m, scheduledAt: scheduledAt || null } : m
            ),
          }
        }),
      }
    }

    case 'START_LIVE':
      return { ...state, phase: 'live' }

    case 'BACK_TO_SETUP':
      return { ...state, phase: 'setup' }

    // ----- Brackets (single/double elimination) -----
    // All bracket actions target a specific bracket by id, since one
    // event can now hold multiple brackets (Men's 4.0, Women's 3.5,
    // Mixed Open, etc.). The helper `mapBracket` keeps the per-action
    // bodies focused on their state shape.

    case 'ADD_BRACKET': {
      const { kind, name } = action.payload
      const bracket = {
        id: newId('br'),
        name: name || (kind === 'doubleElim' ? 'Double Elim Draw' : 'Single Elim Draw'),
        type: kind === 'doubleElim' ? 'doubleElim' : 'singleElim',
        variant: '',
        rating: '',
        entrants: [],
        matches: [],
        locked: false,
      }
      return { ...state, brackets: [...(state.brackets || []), bracket] }
    }

    case 'UPDATE_BRACKET': {
      const { id, patch } = action.payload
      return mapBracket(state, id, b => ({ ...b, ...patch }))
    }

    case 'REMOVE_BRACKET': {
      const { id } = action.payload
      return {
        ...state,
        brackets: (state.brackets || []).filter(b => b.id !== id),
      }
    }

    case 'ADD_BRACKET_ENTRANT': {
      const { bracketId, p1, p2, isBye } = action.payload
      return mapBracket(state, bracketId, b => {
        const entrant = {
          id: newId('ent'),
          p1: p1 || '',
          p2: p2 || '',
          isBye: !!isBye,
          seed: (b.entrants?.length || 0) + 1,
        }
        return { ...b, entrants: [...(b.entrants || []), entrant] }
      })
    }

    case 'UPDATE_BRACKET_ENTRANT': {
      const { bracketId, id, patch } = action.payload
      return mapBracket(state, bracketId, b => ({
        ...b,
        entrants: b.entrants.map(e => (e.id === id ? { ...e, ...patch } : e)),
      }))
    }

    case 'REMOVE_BRACKET_ENTRANT': {
      const { bracketId, id } = action.payload
      return mapBracket(state, bracketId, b => {
        const filtered = (b.entrants || []).filter(e => e.id !== id)
        const reseeded = filtered.map((e, i) => ({ ...e, seed: i + 1 }))
        return { ...b, entrants: reseeded }
      })
    }

    case 'REORDER_BRACKET_ENTRANTS': {
      const { bracketId, order } = action.payload
      return mapBracket(state, bracketId, b => {
        const byId = Object.fromEntries(b.entrants.map(e => [e.id, e]))
        const reordered = order
          .map(id => byId[id])
          .filter(Boolean)
          .map((e, i) => ({ ...e, seed: i + 1 }))
        return { ...b, entrants: reordered }
      })
    }

    case 'RECORD_BRACKET_SCORE': {
      const { bracketId, matchId, scoreA, scoreB } = action.payload
      const winnerSlot = scoreA > scoreB ? 'A' : scoreB > scoreA ? 'B' : null
      return mapBracket(state, bracketId, b => {
        const nextMatches = b.matches.map(m =>
          m.id === matchId
            ? { ...m, scoreA, scoreB, completed: winnerSlot != null, winnerSlot }
            : { ...m }
        )
        applyWalkoverPropagation(nextMatches)
        return { ...b, matches: nextMatches }
      })
    }

    case 'CLEAR_BRACKET_SCORE': {
      const { bracketId, matchId } = action.payload
      return mapBracket(state, bracketId, b => ({
        ...b,
        matches: b.matches.map(m =>
          m.id === matchId
            ? { ...m, scoreA: null, scoreB: null, completed: false, winnerSlot: null }
            : m
        ),
      }))
    }

    case 'SET_BRACKET_MATCH_SCHEDULE': {
      const { bracketId, matchId, scheduledAt } = action.payload
      return mapBracket(state, bracketId, b => ({
        ...b,
        matches: b.matches.map(m =>
          m.id === matchId ? { ...m, scheduledAt: scheduledAt || null } : m
        ),
      }))
    }

    case 'GO_HOME':
      // Preserve in-memory state so the home screen can offer
      // "Continue draft" if work was abandoned mid-setup. The URL
      // hash is cleared by the caller so a refresh lands on home.
      return { ...state, phase: 'home' }

    case 'START_NEW_TOURNAMENT': {
      // Fresh tournament rooted to a brand-new room code so the
      // hash-based deep link works from the very first keystroke.
      // The picker passes type/variant/rating/dates as part of the
      // payload — none are required, but supplying them up-front
      // means the Setup screen lands in the right configuration.
      //
      // For bracket-type events we auto-create the first bracket so
      // the Setup page has somewhere to add entrants right away;
      // additional brackets can be added from the Setup screen.
      const code = action.payload?.code || generateRoomCode()
      const meta = action.payload?.meta || {}
      const tournament = {
        ...initialState.tournament,
        ...meta,
        roomCode: code,
      }
      const brackets = []
      const t = tournament.type
      if (t === 'singlesSingleElim' || t === 'doublesSingleElim') {
        brackets.push({
          id: newId('br'),
          name: tournament.name || 'Main draw',
          type: 'singleElim',
          variant: tournament.variant || '',
          rating: tournament.rating || '',
          entrants: [],
          matches: [],
          locked: false,
        })
      } else if (t === 'singlesDoubleElim' || t === 'doublesDoubleElim') {
        brackets.push({
          id: newId('br'),
          name: tournament.name || 'Main draw',
          type: 'doubleElim',
          variant: tournament.variant || '',
          rating: tournament.rating || '',
          entrants: [],
          matches: [],
          locked: false,
        })
      }
      return {
        ...initialState,
        phase: 'setup',
        tournament,
        brackets,
      }
    }

    case 'CONTINUE_DRAFT': {
      // Existing local-only setup work gets a room code so it can be
      // saved to the server and recovered from any device. Pairs,
      // divisions, and tournament metadata are preserved.
      if (state.tournament.roomCode) return { ...state, phase: 'setup' }
      const code = action.payload?.code || generateRoomCode()
      return {
        ...state,
        phase: 'setup',
        tournament: { ...state.tournament, roomCode: code },
      }
    }

    case 'SET_ROOM_CODE':
      return { ...state, tournament: { ...state.tournament, roomCode: action.payload } }

    case 'SET_PIN_HASH':
      return { ...state, tournament: { ...state.tournament, pinHash: action.payload } }

    case 'LOAD_STATE':
      return migrate({ ...initialState, ...action.payload })

    case 'SET_PASSES': {
      const passes = (action.payload || [])
        .map(p => ({ winningScore: Math.max(1, p?.winningScore | 0 || 7) }))
      const safe = passes.length > 0 ? passes : [{ winningScore: 7 }]
      return { ...state, tournament: { ...state.tournament, passes: safe } }
    }

    case 'RESET':
      return { ...initialState }

    default:
      return state
  }
}

/**
 * Bracket-action helper: replace one bracket-by-id in state.brackets
 * with the result of `fn(bracket)`. Bracket reducers used to read
 * `state.bracket` directly; once the model went many-per-event each
 * action needs to find the right bracket first, and this keeps the
 * per-action logic focused on the state shape rather than the lookup.
 */
function mapBracket(state, bracketId, fn) {
  if (!state.brackets) return state
  return {
    ...state,
    brackets: state.brackets.map(b => (b.id === bracketId ? fn(b) : b)),
  }
}

function pairLabel(p1, p2) {
  const a = (p1 || '').trim()
  const b = (p2 || '').trim()
  if (a && b) return `${a} / ${b}`
  return a || b || 'Unnamed pair'
}

/**
 * Pull just the bits the home screen needs to label a recent entry.
 * Stored alongside the room code so the recent list can render the
 * type/variant/rating chips without round-tripping to the server.
 */
function buildVisit(code, snapshot) {
  const t = snapshot?.tournament || {}
  return {
    code,
    name: t.name || '',
    date: t.startDate || t.date || '',
    typeId: t.type || 'feedIn',
    variantId: t.variant || 'all',
    ratingId: t.rating || '',
    startDate: t.startDate || '',
    endDate: t.endDate || '',
    ongoing: !!t.ongoing,
  }
}

export function useTournament() {
  const [state, dispatch] = useReducer(reducer, null, () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) return migrate(JSON.parse(saved))
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

  // On mount: if URL has a room code, hydrate from server and record
  // the visit so it appears in the home screen's recent list.
  useEffect(() => {
    const code = getRoomCodeFromURL()
    if (!code) return
    loadFromRoom(code).then(loaded => {
      if (loaded) {
        // Same coercion as joinRoom — landing on a /feedin/#room=XXX
        // URL means "open this event", not "show the home screen".
        const nextPhase = loaded.phase === 'live' ? 'live' : 'setup'
        dispatch({
          type: 'LOAD_STATE',
          payload: {
            ...loaded,
            phase: nextPhase,
            tournament: { ...loaded.tournament, roomCode: code },
          },
        })
        setRoomCodeInURL(code)
        trackRoomVisit(buildVisit(code, loaded))
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
    // `phase: 'home'` means the pro stepped away from this event on
    // their device — it isn't a state change for the event itself.
    // Pushing it to the server would overwrite the saved 'setup' or
    // 'live' phase, and the next device joining the code would also
    // land on Home (which looks like the join did nothing).
    if (state.phase === 'home') return
    dirtyRef.current = true
    setSaveStatus('saving')
    clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(async () => {
      try {
        const res = await saveToRoom(code, stateRef.current)
        if (res.ok) {
          dirtyRef.current = false
          setSaveStatus('saved')
          // Refresh the recent-rooms entry on every successful save
          // so the event metadata shown on the home screen stays in
          // sync as the pro edits it.
          trackRoomVisit(buildVisit(code, stateRef.current))
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

  // Imperative navigation helpers exposed to the home screen and the
  // back-to-home buttons. They wrap the dispatch + URL mirror so the
  // address bar always reflects the active room (or the bare /feedin/
  // path when at home), keeping refresh and bookmarking deterministic.

  async function joinRoom(code) {
    if (!code) return false
    const upper = code.toUpperCase()
    const loaded = await loadFromRoom(upper)
    if (!loaded) return false
    // Joining always means the pro wants to engage with the event;
    // landing them on Home would feel broken. Honor the saved 'live'
    // phase when present (so other devices see the live board too)
    // and otherwise default to 'setup'. Older rooms that accidentally
    // saved phase='home' before the save guard landed get coerced
    // into setup here.
    const nextPhase = loaded.phase === 'live' ? 'live' : 'setup'
    dispatch({
      type: 'LOAD_STATE',
      payload: {
        ...loaded,
        phase: nextPhase,
        tournament: { ...loaded.tournament, roomCode: upper },
      },
    })
    setRoomCodeInURL(upper)
    trackRoomVisit(buildVisit(upper, loaded))
    return true
  }

  function startNew(meta) {
    const code = generateRoomCode()
    dispatch({
      type: 'START_NEW_TOURNAMENT',
      payload: { code, meta: meta || undefined },
    })
    setRoomCodeInURL(code)
  }

  function continueDraft() {
    const code = state.tournament.roomCode || generateRoomCode()
    dispatch({ type: 'CONTINUE_DRAFT', payload: { code } })
    setRoomCodeInURL(code)
  }

  function goHome() {
    dispatch({ type: 'GO_HOME' })
    if (window.location.hash) {
      history.replaceState(null, '', window.location.pathname)
    }
  }

  return {
    state,
    dispatch,
    saveStatus,
    joinRoom,
    startNew,
    continueDraft,
    goHome,
  }
}
