import { useReducer, useEffect, useRef, useState } from 'react'
import {
  generateRoomCode,
  getRoomCodeFromURL,
  loadFromRoom,
  saveToRoom,
  saveToRoomBeacon,
  setRoomCodeInURL,
  trackRoomVisit,
} from '../utils/share.js'
import { generateSchedule } from '../utils/schedule.js'
import {
  applyWalkoverPropagation,
  generateSingleElimBracket,
  generateDoubleElimBracket,
} from '../utils/bracket.js'
import { getVariant, getRatingLabel } from '../utils/eventTypes.js'

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
 *     name, dates/times, ongoing,
 *     passes: [{ winningScore }, ...],  // event-level default for new RR divs
 *     roomCode, pinHash,
 *     defaults: { variant, rating, entrantKind },  // pre-fill the
 *                                                  // Add Division dialog
 *   },
 *   divisions: [
 *     // Each division is one draw. The `kind` discriminator decides
 *     // which fields are populated:
 *     {
 *       id, name,
 *       kind: 'roundRobin' | 'singleElim' | 'doubleElim',
 *       variant: 'all' | 'mens' | 'womens' | 'mixed',
 *       rating, entrantKind: 'singles' | 'doubles',
 *       courtLabel, locked,
 *       // roundRobin only:
 *       pairs:   [{ id, label, p1, p2 }],
 *       matches: [{ id, pass, round, slot, pairA, pairB, bye, scoreA, scoreB, completed }],
 *       // singleElim/doubleElim only:
 *       entrants: [{ id, p1, p2, isBye, seed }],
 *       matches:  [{ id, round, slot, bracket, pA, pB, scoreA, scoreB, completed, winnerSlot }],
 *       size, rounds,
 *     }
 *   ]
 * }
 */
export const initialState = {
  phase: 'home',
  tournament: {
    name: '',
    startDate: '',           // YYYY-MM-DD
    endDate: '',             // YYYY-MM-DD; blank when ongoing or single-day
    startTime: '',           // HH:MM (24h); first ball
    endTime: '',             // HH:MM (24h); optional
    ongoing: false,          // weekly/recurring play; dates ignored
    // Per-division settings used to pre-fill the Add Division dialog.
    // Each division stores its own kind/passes/scoring on itself.
    defaults: { variant: 'all', rating: '', entrantKind: 'singles' },
    // Event-wide scheduling. Courts are defined once here so the
    // schedule grid has a stable list of rows (instead of inferring
    // court rows from per-division courtLabel, which jitters as
    // assignments change). slotMinutes is the grid's column width.
    courts: ['Court 1'],
    slotMinutes: 30,
    // Sharing/auth
    roomCode: null,
    pinHash: null,
    // Legacy fields, kept only so the migrator can read them.
    type: undefined, variant: undefined, rating: undefined, date: '',
  },
  divisions: [],
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
  // Pull the old event-level identity fields (type/variant/rating)
  // out of `tournament` and into `tournament.defaults`, which is
  // what the Add Division dialog reads to pre-fill new divisions.
  // We hold on to the values rather than dropping them so the first
  // division added to a migrated event still feels like the same
  // event (e.g. "Men's 4.0" continues to be Men's 4.0).
  const tt = next.tournament
  if (!tt.defaults) {
    const oldType = tt.type || 'feedIn'
    const entrantKind = oldType.startsWith('doubles') ? 'doubles' : 'singles'
    next = {
      ...next,
      tournament: {
        ...tt,
        startDate: tt.startDate || tt.date || '',
        defaults: {
          variant: tt.variant || 'all',
          rating: tt.rating || '',
          entrantKind,
        },
      },
    }
  }
  // Unify divisions[] (round-robin) and brackets[] (elimination) into
  // a single divisions[] array. Each entry gets a `kind` discriminator
  // and inherits the event-level variant/rating/entrantKind so it
  // round-trips cleanly. After this PR, brackets[] is gone.
  const oldDefaults = next.tournament.defaults || { variant: 'all', rating: '', entrantKind: 'singles' }
  const oldBrackets = Array.isArray(next.brackets) ? next.brackets : null
  const needsDivisionMigration =
    oldBrackets !== null ||
    (next.divisions || []).some(d => !d.kind)
  if (needsDivisionMigration) {
    const fromDivisions = (next.divisions || []).map(d => ({
      ...d,
      kind: d.kind || 'roundRobin',
      variant: d.variant || oldDefaults.variant,
      rating: d.rating ?? oldDefaults.rating,
      entrantKind: d.entrantKind || oldDefaults.entrantKind,
    }))
    const fromBrackets = (oldBrackets || []).map(b => ({
      id: b.id || newId('div'),
      name: b.name || 'Bracket',
      courtLabel: b.courtLabel || '',
      kind: b.type === 'doubleElim' ? 'doubleElim' : 'singleElim',
      variant: b.variant || oldDefaults.variant,
      rating: b.rating ?? oldDefaults.rating,
      entrantKind: b.entrantKind || oldDefaults.entrantKind,
      entrants: b.entrants || [],
      matches: b.matches || [],
      size: b.size || 0,
      rounds: b.rounds || 0,
      locked: !!b.locked,
    }))
    const { brackets: _drop, ...rest } = next
    next = { ...rest, divisions: [...fromDivisions, ...fromBrackets] }
  }
  // Drop the legacy bracket field if it's still hanging around from
  // the very old single-bracket save shape.
  if ('bracket' in next) {
    const { bracket: _b, ...rest } = next
    next = rest
  }
  // Per-division passes + scoring config. Round-robin used to share
  // one pass list at the event level; multi-pass play is now the
  // dedicated 'feedIn' kind, while plain 'roundRobin' uses standard
  // tennis scoring (sets/games). Migrate based on the old event-level
  // tournament.passes — if it had more than one entry, that division
  // was effectively running feed-in.
  const eventPasses = Array.isArray(next.tournament.passes)
    ? next.tournament.passes
    : null
  const needsScoringMigration = (next.divisions || []).some(
    d => !d.scoring && (d.kind === 'roundRobin' || d.kind === 'singleElim' || d.kind === 'doubleElim' || !d.kind)
  ) || (next.divisions || []).some(d => d.kind === 'roundRobin' && !d.passes)
  if (needsScoringMigration) {
    next = {
      ...next,
      divisions: next.divisions.map(d => {
        if (d.kind === 'roundRobin') {
          // Multi-pass round-robin from the old model becomes feedIn;
          // single-pass becomes plain roundRobin with standard scoring.
          const inherited = eventPasses && eventPasses.length > 0
            ? eventPasses
            : [{ winningScore: 7 }]
          if (inherited.length > 1) {
            return {
              ...d,
              kind: 'feedIn',
              passes: d.passes || inherited,
              scoring: d.scoring || null,
            }
          }
          return {
            ...d,
            passes: undefined,
            scoring: d.scoring || { ...STANDARD_SCORING },
          }
        }
        if (d.kind === 'feedIn') {
          return {
            ...d,
            passes: d.passes || eventPasses || DEFAULT_FEED_IN_PASSES,
            scoring: null,
          }
        }
        // singleElim / doubleElim get standard scoring by default.
        return {
          ...d,
          scoring: d.scoring || { ...STANDARD_SCORING },
        }
      }),
    }
  }
  // tournament.passes is no longer event-level. Strip it but leave
  // the rest of tournament intact so we don't disturb anything else.
  if ('passes' in (next.tournament || {})) {
    const { passes: _p, ...trest } = next.tournament
    next = { ...next, tournament: trest }
  }
  // Each division gains a wait list (the "bubble") so coaches can
  // park extra entrants and sub them in when someone no-shows or
  // gets sick. Migration just attaches an empty array.
  if ((next.divisions || []).some(d => !Array.isArray(d.waitList))) {
    next = {
      ...next,
      divisions: next.divisions.map(d =>
        Array.isArray(d.waitList) ? d : { ...d, waitList: [] }
      ),
    }
  }
  // Multi-group round-robin defaults — every existing RR / feed-in
  // division is a single group so the addition is transparent.
  if ((next.divisions || []).some(d => isPairBased(d) && d.groupCount == null)) {
    next = {
      ...next,
      divisions: next.divisions.map(d => {
        if (!isPairBased(d) || d.groupCount != null) return d
        return { ...d, groupCount: 1 }
      }),
    }
  }
  // Event-level courts list + slot granularity for the schedule grid.
  // For events created before scheduling existed, seed the courts
  // array from any per-division courtLabel values the pro had set
  // (de-duped), falling back to "Court 1" so the grid always has at
  // least one row.
  if (!Array.isArray(next.tournament?.courts)) {
    const fromDivisions = (next.divisions || [])
      .map(d => (d.courtLabel || '').trim())
      .filter(Boolean)
    const seeded = Array.from(new Set(fromDivisions))
    next = {
      ...next,
      tournament: {
        ...next.tournament,
        courts: seeded.length > 0 ? seeded : ['Court 1'],
      },
    }
  }
  if (typeof next.tournament?.slotMinutes !== 'number') {
    next = {
      ...next,
      tournament: { ...next.tournament, slotMinutes: 30 },
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
      // Each division is one draw of one kind. The dialog passes kind
      // / variant / rating / entrantKind explicitly so the new entry
      // doesn't have to inherit from the event-level fields (those are
      // just defaults for pre-filling the dialog now).
      const {
        kind = 'roundRobin',
        name,
        courtLabel,
        variant,
        rating,
        entrantKind,
        groupCount,
        advancePerGroup,
        finalsEnabled,
      } = action.payload || {}
      const defaults = state.tournament?.defaults || {}
      const isBracket = kind === 'singleElim' || kind === 'doubleElim'
      const isFeedIn = kind === 'feedIn'
      const division = {
        id: newId('div'),
        name: name || autoName({ kind, variant, rating, entrantKind }, defaults),
        courtLabel: courtLabel || '',
        kind,
        variant: variant || defaults.variant || 'all',
        rating: rating ?? defaults.rating ?? '',
        entrantKind: entrantKind || defaults.entrantKind || 'singles',
        locked: false,
        // Bubble / wait list — extra entrants the pro keeps on hand
        // for substitutions (no-shows, late additions). Lives on every
        // division regardless of kind.
        waitList: [],
        // Feed-in stores per-pass target scores; everything else uses
        // standard tennis scoring (sets/games/tiebreak rules).
        passes: isFeedIn ? [...DEFAULT_FEED_IN_PASSES] : undefined,
        scoring: isFeedIn ? null : { ...STANDARD_SCORING },
        // Multi-group RR / feed-in knobs. groupCount = 1 keeps the
        // simpler single-group shape (no groups[] metadata).
        groupCount: isBracket ? 1 : Math.max(1, Math.min(4, groupCount || 1)),
        advancePerGroup: isBracket ? 1 : Math.max(1, Math.min(2, advancePerGroup || 1)),
        finalsEnabled: !!finalsEnabled,
        finalsMatches: [],
        ...(isBracket
          ? { entrants: [], matches: [], size: 0, rounds: 0 }
          : { pairs: [], matches: [] }),
      }
      return {
        ...state,
        divisions: [...state.divisions, division],
        tournament: {
          ...state.tournament,
          // Track the most recent settings so the Add Division dialog
          // pre-fills the next round with the same shape.
          defaults: {
            variant: division.variant,
            rating: division.rating,
            entrantKind: division.entrantKind,
          },
        },
      }
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
          if (d.id !== divisionId || d.locked) return d
          if (d.kind === 'roundRobin' || d.kind === 'feedIn') {
            if ((d.pairs || []).length < 2) return d
            const passCount =
              d.kind === 'feedIn'
                ? (d.passes || DEFAULT_FEED_IN_PASSES).length || 1
                : 1
            const groupCount = Math.max(1, d.groupCount || 1)
            // Single group keeps the simpler shape (no groups[]
            // metadata) so existing single-group tournaments don't
            // suddenly grow a structural field they never asked for.
            if (groupCount === 1) {
              const { matches } = generateSchedule(d.pairs.length, passCount)
              return {
                ...d,
                matches,
                groups: undefined,
                finalsMatches: buildFinals(d, null, [{ memberIndices: d.pairs.map((_, i) => i) }]),
                locked: true,
              }
            }
            const groups = distributePairsIntoGroups(d.pairs.length, groupCount)
            const matches = buildGroupedMatches(d.pairs, groups, passCount)
            return {
              ...d,
              matches,
              groups,
              finalsMatches: buildFinals(d, groups, groups),
              locked: true,
            }
          }
          if (d.kind === 'singleElim' || d.kind === 'doubleElim') {
            const entrants = d.entrants || []
            if (entrants.length < 2) return d
            const built =
              d.kind === 'doubleElim'
                ? generateDoubleElimBracket(entrants)
                : generateSingleElimBracket(entrants)
            return {
              ...d,
              matches: built.matches,
              rounds: built.rounds,
              size: built.size,
              locked: true,
            }
          }
          return d
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

    case 'ADD_ENTRANT': {
      // Used by elimination-kind divisions. RR uses ADD_PAIR.
      const { divisionId, p1, p2, isBye } = action.payload
      return {
        ...state,
        divisions: state.divisions.map(d => {
          if (d.id !== divisionId || d.locked) return d
          if (d.kind === 'roundRobin') return d
          const entrant = {
            id: newId('ent'),
            p1: p1 || '',
            p2: p2 || '',
            isBye: !!isBye,
            seed: (d.entrants?.length || 0) + 1,
          }
          return { ...d, entrants: [...(d.entrants || []), entrant] }
        }),
      }
    }

    case 'UPDATE_ENTRANT': {
      const { divisionId, id, patch } = action.payload
      return {
        ...state,
        divisions: state.divisions.map(d => {
          if (d.id !== divisionId || d.locked) return d
          return {
            ...d,
            entrants: (d.entrants || []).map(e =>
              e.id === id ? { ...e, ...patch } : e
            ),
          }
        }),
      }
    }

    case 'REMOVE_ENTRANT': {
      const { divisionId, id } = action.payload
      return {
        ...state,
        divisions: state.divisions.map(d => {
          if (d.id !== divisionId || d.locked) return d
          const filtered = (d.entrants || []).filter(e => e.id !== id)
          const reseeded = filtered.map((e, i) => ({ ...e, seed: i + 1 }))
          return { ...d, entrants: reseeded }
        }),
      }
    }

    case 'REORDER_ENTRANTS': {
      const { divisionId, order } = action.payload
      return {
        ...state,
        divisions: state.divisions.map(d => {
          if (d.id !== divisionId || d.locked) return d
          const byId = Object.fromEntries((d.entrants || []).map(e => [e.id, e]))
          const reordered = order
            .map(id => byId[id])
            .filter(Boolean)
            .map((e, i) => ({ ...e, seed: i + 1 }))
          return { ...d, entrants: reordered }
        }),
      }
    }

    // ----- Wait list (the bubble) -----

    case 'ADD_WAITLIST_ENTRY': {
      const { divisionId, p1, p2 } = action.payload
      return {
        ...state,
        divisions: state.divisions.map(d => {
          if (d.id !== divisionId) return d
          const entry = {
            id: newId('wait'),
            p1: p1 || '',
            p2: p2 || '',
          }
          return { ...d, waitList: [...(d.waitList || []), entry] }
        }),
      }
    }

    case 'UPDATE_WAITLIST_ENTRY': {
      const { divisionId, id, patch } = action.payload
      return {
        ...state,
        divisions: state.divisions.map(d => {
          if (d.id !== divisionId) return d
          return {
            ...d,
            waitList: (d.waitList || []).map(e =>
              e.id === id ? { ...e, ...patch } : e
            ),
          }
        }),
      }
    }

    case 'REMOVE_WAITLIST_ENTRY': {
      const { divisionId, id } = action.payload
      return {
        ...state,
        divisions: state.divisions.map(d => {
          if (d.id !== divisionId) return d
          return {
            ...d,
            waitList: (d.waitList || []).filter(e => e.id !== id),
          }
        }),
      }
    }

    // ----- Substitutes -----
    // Replace the names on a pair (RR/feed-in) or an entrant (bracket)
    // while preserving its id so the schedule, completed matches, and
    // standings entries continue to reference the same slot. Optional
    // `fromWaitListId` lets the caller consume the wait-list entry that
    // sourced the substitute in one atomic dispatch.

    case 'SUBSTITUTE_PAIR': {
      const { divisionId, pairId, p1, p2, fromWaitListId } = action.payload
      return {
        ...state,
        divisions: state.divisions.map(d => {
          if (d.id !== divisionId) return d
          const nextWait = fromWaitListId
            ? (d.waitList || []).filter(e => e.id !== fromWaitListId)
            : d.waitList
          return {
            ...d,
            pairs: (d.pairs || []).map(p =>
              p.id === pairId
                ? {
                    ...p,
                    p1: p1 || '',
                    p2: p2 || '',
                    label: pairLabel(p1 || '', p2 || ''),
                  }
                : p
            ),
            waitList: nextWait,
          }
        }),
      }
    }

    case 'SUBSTITUTE_ENTRANT': {
      const { divisionId, entrantId, p1, p2, fromWaitListId } = action.payload
      return {
        ...state,
        divisions: state.divisions.map(d => {
          if (d.id !== divisionId) return d
          const nextWait = fromWaitListId
            ? (d.waitList || []).filter(e => e.id !== fromWaitListId)
            : d.waitList
          return {
            ...d,
            entrants: (d.entrants || []).map(e =>
              e.id === entrantId
                ? { ...e, p1: p1 || '', p2: p2 || '' }
                : e
            ),
            waitList: nextWait,
          }
        }),
      }
    }

    // ----- Promote from wait list (unlocked-only) -----
    // For divisions that aren't locked yet, dragging from the bubble
    // onto the main list adds the entrant directly. The wait-list
    // source is removed in the same step.

    case 'PROMOTE_WAITLIST_TO_PAIR': {
      const { divisionId, waitListId } = action.payload
      return {
        ...state,
        divisions: state.divisions.map(d => {
          if (d.id !== divisionId || d.locked) return d
          const entry = (d.waitList || []).find(e => e.id === waitListId)
          if (!entry) return d
          const pair = {
            id: newId('pair'),
            p1: entry.p1 || '',
            p2: entry.p2 || '',
            label: pairLabel(entry.p1, entry.p2),
          }
          return {
            ...d,
            pairs: [...(d.pairs || []), pair],
            waitList: (d.waitList || []).filter(e => e.id !== waitListId),
          }
        }),
      }
    }

    // ----- Multi-group helpers -----

    case 'MOVE_PAIR_TO_GROUP': {
      // Move a single pair (by 0-based index in division.pairs) from
      // its current group to `targetGroupIndex`. Only valid on a
      // locked multi-group division. The group's matches re-generate
      // because the pair set changed; existing scores within the
      // moved pair's old group are kept but its own matches reset.
      const { divisionId, pairIndex, targetGroupIndex } = action.payload
      return {
        ...state,
        divisions: state.divisions.map(d => {
          if (
            d.id !== divisionId ||
            !d.locked ||
            !Array.isArray(d.groups) ||
            d.groups.length < 2
          )
            return d
          const fromIdx = d.groups.findIndex(g =>
            g.memberIndices.includes(pairIndex)
          )
          if (fromIdx < 0 || fromIdx === targetGroupIndex) return d
          const groups = d.groups.map((g, i) => {
            if (i === fromIdx) {
              return {
                ...g,
                memberIndices: g.memberIndices.filter(x => x !== pairIndex),
              }
            }
            if (i === targetGroupIndex) {
              return {
                ...g,
                memberIndices: [...g.memberIndices, pairIndex],
              }
            }
            return g
          })
          // Regenerate matches for the two affected groups (and
          // others stay the same). Easiest path: regenerate ALL
          // group matches since the schedule generator is cheap.
          const passCount =
            d.kind === 'feedIn'
              ? (d.passes || DEFAULT_FEED_IN_PASSES).length || 1
              : 1
          const matches = buildGroupedMatches(d.pairs, groups, passCount)
          // Finals refresh too — placeholders may shift if groups
          // reshape (e.g. an empty group). Resolution happens at
          // display time so this is safe to rebuild eagerly.
          const finalsMatches = buildFinals(
            { ...d, finalsEnabled: d.finalsEnabled },
            groups,
            groups
          )
          return { ...d, groups, matches, finalsMatches }
        }),
      }
    }

    case 'RECORD_FINALS_SCORE': {
      const { divisionId, matchId, scoreA, scoreB } = action.payload
      return {
        ...state,
        divisions: state.divisions.map(d => {
          if (d.id !== divisionId) return d
          return {
            ...d,
            finalsMatches: (d.finalsMatches || []).map(m =>
              m.id === matchId
                ? { ...m, scoreA, scoreB, completed: true }
                : m
            ),
          }
        }),
      }
    }

    case 'CLEAR_FINALS_SCORE': {
      const { divisionId, matchId } = action.payload
      return {
        ...state,
        divisions: state.divisions.map(d => {
          if (d.id !== divisionId) return d
          return {
            ...d,
            finalsMatches: (d.finalsMatches || []).map(m =>
              m.id === matchId
                ? { ...m, scoreA: null, scoreB: null, completed: false }
                : m
            ),
          }
        }),
      }
    }

    case 'PROMOTE_WAITLIST_TO_ENTRANT': {
      const { divisionId, waitListId } = action.payload
      return {
        ...state,
        divisions: state.divisions.map(d => {
          if (d.id !== divisionId || d.locked) return d
          const entry = (d.waitList || []).find(e => e.id === waitListId)
          if (!entry) return d
          const entrant = {
            id: newId('ent'),
            p1: entry.p1 || '',
            p2: entry.p2 || '',
            isBye: false,
            seed: (d.entrants?.length || 0) + 1,
          }
          return {
            ...d,
            entrants: [...(d.entrants || []), entrant],
            waitList: (d.waitList || []).filter(e => e.id !== waitListId),
          }
        }),
      }
    }

    case 'RECORD_BRACKET_SCORE': {
      // Bracket scores can come in two shapes:
      //   - Aggregate: { scoreA, scoreB } — sets-won totals for
      //     legacy callers / quick score entry.
      //   - Per-set:   { setsA: [6,4,6], setsB: [3,6,2] } — full
      //     per-set games breakdown. We derive the aggregates by
      //     counting which side took each set.
      // Persist whatever the caller sent; store the derived totals
      // so the bracket UI keeps working unchanged downstream.
      const { divisionId, matchId, scoreA, scoreB, setsA, setsB } = action.payload
      let aggA = scoreA
      let aggB = scoreB
      if (Array.isArray(setsA) && Array.isArray(setsB)) {
        aggA = 0
        aggB = 0
        for (let i = 0; i < Math.max(setsA.length, setsB.length); i++) {
          const a = Number(setsA[i])
          const b = Number(setsB[i])
          if (!Number.isFinite(a) || !Number.isFinite(b)) continue
          if (a > b) aggA++
          else if (b > a) aggB++
        }
      }
      const winnerSlot = aggA > aggB ? 'A' : aggB > aggA ? 'B' : null
      return {
        ...state,
        divisions: state.divisions.map(d => {
          if (d.id !== divisionId) return d
          const nextMatches = (d.matches || []).map(m =>
            m.id === matchId
              ? {
                  ...m,
                  scoreA: aggA,
                  scoreB: aggB,
                  setsA: Array.isArray(setsA) ? setsA : m.setsA,
                  setsB: Array.isArray(setsB) ? setsB : m.setsB,
                  completed: winnerSlot != null,
                  winnerSlot,
                }
              : { ...m }
          )
          applyWalkoverPropagation(nextMatches)
          return { ...d, matches: nextMatches }
        }),
      }
    }

    case 'CLEAR_BRACKET_SCORE': {
      const { divisionId, matchId } = action.payload
      return {
        ...state,
        divisions: state.divisions.map(d => {
          if (d.id !== divisionId) return d
          return {
            ...d,
            matches: (d.matches || []).map(m =>
              m.id === matchId
                ? { ...m, scoreA: null, scoreB: null, completed: false, winnerSlot: null }
                : m
            ),
          }
        }),
      }
    }

    case 'SET_BRACKET_MATCH_SCHEDULE': {
      const { divisionId, matchId, scheduledAt } = action.payload
      return {
        ...state,
        divisions: state.divisions.map(d => {
          if (d.id !== divisionId) return d
          return {
            ...d,
            matches: (d.matches || []).map(m =>
              m.id === matchId ? { ...m, scheduledAt: scheduledAt || null } : m
            ),
          }
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
      // Single source of truth for setting a match's time + court.
      // Both fields are optional; passing `undefined` leaves the
      // existing value alone (use `null` to explicitly clear).
      const { divisionId, matchId, scheduledAt, court } = action.payload
      return {
        ...state,
        divisions: state.divisions.map(d => {
          if (d.id !== divisionId) return d
          return {
            ...d,
            matches: d.matches.map(m => {
              if (m.id !== matchId) return m
              const next = { ...m }
              if (scheduledAt !== undefined) {
                next.scheduledAt = scheduledAt || null
              }
              if (court !== undefined) {
                next.court = court || null
              }
              return next
            }),
          }
        }),
      }
    }

    case 'SET_FINALS_MATCH_SCHEDULE': {
      // Same as SET_MATCH_SCHEDULE but for the per-division
      // finalsMatches[] array (multi-group / 1v2 final). Kept as a
      // separate action because the matches live on a different
      // collection — saves a "is this a finals match?" lookup at
      // dispatch time.
      const { divisionId, matchId, scheduledAt, court } = action.payload
      return {
        ...state,
        divisions: state.divisions.map(d => {
          if (d.id !== divisionId) return d
          return {
            ...d,
            finalsMatches: (d.finalsMatches || []).map(m => {
              if (m.id !== matchId) return m
              const next = { ...m }
              if (scheduledAt !== undefined) next.scheduledAt = scheduledAt || null
              if (court !== undefined) next.court = court || null
              return next
            }),
          }
        }),
      }
    }

    case 'ADD_EVENT_COURT': {
      const name = (action.payload?.name || '').trim()
      if (!name) return state
      const courts = state.tournament.courts || []
      if (courts.includes(name)) return state
      return {
        ...state,
        tournament: { ...state.tournament, courts: [...courts, name] },
      }
    }

    case 'RENAME_EVENT_COURT': {
      // Renaming a court has to also update every match that
      // referenced the old name — otherwise the schedule grid
      // would orphan those matches into a phantom row.
      const { from, to } = action.payload
      const oldName = (from || '').trim()
      const newName = (to || '').trim()
      if (!oldName || !newName || oldName === newName) return state
      const courts = (state.tournament.courts || []).map(c =>
        c === oldName ? newName : c
      )
      return {
        ...state,
        tournament: { ...state.tournament, courts },
        divisions: state.divisions.map(d => ({
          ...d,
          courtLabel: d.courtLabel === oldName ? newName : d.courtLabel,
          matches: (d.matches || []).map(m =>
            m.court === oldName ? { ...m, court: newName } : m
          ),
          finalsMatches: (d.finalsMatches || []).map(m =>
            m.court === oldName ? { ...m, court: newName } : m
          ),
        })),
      }
    }

    case 'REMOVE_EVENT_COURT': {
      // Removing a court clears the court reference on any matches
      // that pointed at it. The matches themselves stay scheduled
      // (just unassigned to a court) so the pro doesn't lose times.
      const name = (action.payload?.name || '').trim()
      if (!name) return state
      const courts = (state.tournament.courts || []).filter(c => c !== name)
      return {
        ...state,
        tournament: { ...state.tournament, courts },
        divisions: state.divisions.map(d => ({
          ...d,
          matches: (d.matches || []).map(m =>
            m.court === name ? { ...m, court: null } : m
          ),
          finalsMatches: (d.finalsMatches || []).map(m =>
            m.court === name ? { ...m, court: null } : m
          ),
        })),
      }
    }

    case 'REORDER_EVENT_COURTS': {
      // Drag-and-drop reorder of the court list. Pure metadata
      // change — no match references need touching.
      const order = action.payload?.order || []
      const valid = order.filter(c =>
        (state.tournament.courts || []).includes(c)
      )
      // Only commit if the new order covers every existing court
      // (prevents a malformed payload from silently dropping rows).
      if (valid.length !== (state.tournament.courts || []).length) return state
      return {
        ...state,
        tournament: { ...state.tournament, courts: valid },
      }
    }

    case 'SET_SLOT_MINUTES': {
      const v = parseInt(action.payload?.minutes, 10)
      if (![15, 20, 30, 60].includes(v)) return state
      return {
        ...state,
        tournament: { ...state.tournament, slotMinutes: v },
      }
    }

    case 'AUTO_FILL_DIVISION_SCHEDULE': {
      // Sequential one-court-at-a-time fill: each match takes the
      // next available slot on the assigned court starting from
      // `startAt`. Matches that already have a `scheduledAt` are
      // left alone unless `overwrite` is true. Courts cycle through
      // `courts` so a 4-match RR with two courts spreads pairs of
      // matches across the two courts in parallel. Plays nicely
      // with the manual schedule grid — pros run auto-fill to seed,
      // then drag exceptions where they want them.
      const {
        divisionId,
        startAt,
        courts,
        slotMinutes,
        overwrite = false,
      } = action.payload || {}
      if (!startAt || !Array.isArray(courts) || courts.length === 0) return state
      const slot = parseInt(slotMinutes, 10) || 30
      const baseDate = parseLocalDateTime(startAt)
      if (!baseDate) return state
      let cursor = 0
      return {
        ...state,
        divisions: state.divisions.map(d => {
          if (d.id !== divisionId) return d
          // Build a per-court "next free" pointer so matches
          // distribute across courts in parallel rather than
          // stacking up on court 1.
          const perCourtSlot = courts.map(() => 0)
          const place = (m) => {
            if (m.scheduledAt && !overwrite) return m
            const courtIdx = cursor % courts.length
            const slotIdx = perCourtSlot[courtIdx]
            perCourtSlot[courtIdx] = slotIdx + 1
            cursor += 1
            const t = new Date(baseDate)
            t.setMinutes(t.getMinutes() + slotIdx * slot)
            return {
              ...m,
              scheduledAt: formatLocalDateTime(t),
              court: courts[courtIdx],
            }
          }
          return {
            ...d,
            matches: (d.matches || []).map(place),
            finalsMatches: (d.finalsMatches || []).map(place),
          }
        }),
      }
    }

    case 'START_LIVE':
      return { ...state, phase: 'live' }

    case 'BACK_TO_SETUP':
      return { ...state, phase: 'setup' }

    case 'GO_HOME':
      // Preserve in-memory state so the home screen can offer
      // "Continue draft" if work was abandoned mid-setup. The URL
      // hash is cleared by the caller so a refresh lands on home.
      return { ...state, phase: 'home' }

    case 'START_NEW_TOURNAMENT': {
      // Fresh event rooted to a brand-new room code so the hash deep
      // link works from the first keystroke. No divisions are added
      // automatically anymore — the Setup page exposes "+ Add
      // division" so the pro picks variant/rating/format per draw.
      const code = action.payload?.code || generateRoomCode()
      const meta = action.payload?.meta || {}
      const tournament = {
        ...initialState.tournament,
        ...meta,
        roomCode: code,
      }
      // Hold any defaults the New Event dialog passed up so the first
      // Add Division dialog pre-fills with the same shape.
      if (meta.defaults) {
        tournament.defaults = {
          ...initialState.tournament.defaults,
          ...meta.defaults,
        }
      }
      return {
        ...initialState,
        phase: 'setup',
        tournament,
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

    case 'RESET':
      return { ...initialState }

    default:
      return state
  }
}

/**
 * Default scoring config used by every non-feed-in division. The
 * "standard scoring" mental model: best-of-3 sets, six games to win
 * a set, set tiebreak at 6-6, ad scoring, full third set when
 * needed. Pros override individual fields per-division when an event
 * uses a non-default format (pro set, match tiebreak in lieu of
 * third, no-ad, etc.).
 */
export const STANDARD_SCORING = Object.freeze({
  setsToWin: 2,
  gamesPerSet: 6,
  tiebreakAtGames: 6,
  adScoring: true,
  // 'fullSet' = play out the deciding set normally
  // 'matchTiebreak' = play a 10-point match tiebreak instead
  finalSetMode: 'fullSet',
  finalSetTiebreakTo: 10,
})

/**
 * Default pass list for newly-added feed-in divisions: two rounds,
 * first to 7. Pros add or remove passes per division.
 */
export const DEFAULT_FEED_IN_PASSES = [
  { winningScore: 7 },
  { winningScore: 7 },
]

/**
 * True when the given division uses pairs[] (round-robin / feed-in)
 * rather than entrants[] (bracket draws). Several reducer cases and
 * the migrator branch on this — pulled out so the predicate stays
 * consistent.
 */
function isPairBased(d) {
  return d && (d.kind === 'roundRobin' || d.kind === 'feedIn')
}

/**
 * Parse the format the HTML datetime-local input emits
 * (`YYYY-MM-DDTHH:MM`) into a local-time Date. Native `new Date(s)`
 * works on most modern browsers but treats the string as UTC in
 * older ones — explicit parsing avoids that timezone footgun.
 */
function parseLocalDateTime(s) {
  if (!s || typeof s !== 'string') return null
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/)
  if (!m) return null
  return new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], 0)
}

/**
 * Inverse of parseLocalDateTime — Date back to the
 * `YYYY-MM-DDTHH:MM` format the datetime-local input expects.
 */
function formatLocalDateTime(d) {
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/**
 * Snake-draft distribution: stronger pairs (lower index) and weaker
 * pairs balance across groups. With 8 pairs into 2 groups you get
 * Group A = {1,4,5,8}, Group B = {2,3,6,7}. Pros can drag pairs
 * between groups after lock to override the default — see
 * MOVE_PAIR_TO_GROUP for the manual reassignment path.
 *
 * Returns groups as `{ id, name, index, memberIndices }` where
 * memberIndices are 0-based positions into division.pairs[]. The
 * label uses A/B/C/D since most clubs talk about groups by letter.
 */
function distributePairsIntoGroups(pairCount, groupCount) {
  const groups = Array.from({ length: groupCount }, (_, i) => ({
    id: `grp-${i}-${Math.random().toString(36).slice(2, 6)}`,
    name: `Group ${String.fromCharCode(65 + i)}`,
    index: i,
    memberIndices: [],
  }))
  for (let i = 0; i < pairCount; i++) {
    const round = Math.floor(i / groupCount)
    const position = i % groupCount
    const groupIdx = round % 2 === 0 ? position : (groupCount - 1 - position)
    groups[groupIdx].memberIndices.push(i)
  }
  return groups
}

/**
 * Build the per-group match list at lock time. Each group's matches
 * are generated locally (indices 1..groupSize) and then remapped to
 * the division-wide 1-based pair index so a single flat matches[]
 * array can hold every match. Each match carries a `groupIndex` tag
 * so the live board / standings code can filter back out.
 */
/**
 * Build the finals stage matches when the pro has opted in. Three
 * realities:
 *
 *   - division.finalsEnabled === false → no finals.
 *   - One group, finals on → 1st vs 2nd of the group plays a final
 *     match. Common at clubs that want a true champion match.
 *   - Multiple groups → top N from each group advance, where
 *     `advancePerGroup` is 1 by default. If only two pairs advance
 *     in total, they play a single final match. Three or more
 *     advance → another round-robin among them (the "final RR").
 *
 * Match participants are stored as placeholder slots referencing
 * group standings (`{ kind: 'placeholder', groupIndex, place }`).
 * Once a group's matches all complete, helpers in utils/groups.js
 * resolve placeholders to actual pair indices for display.
 */
function buildFinals(division, groups, _allGroups) {
  if (!division.finalsEnabled) return []
  const groupCount = groups ? groups.length : 1
  const advancePerGroup = Math.max(1, Math.min(2, division.advancePerGroup || 1))
  const advancing = []
  if (!groups) {
    // Single group: top advancePerGroup of that one group. Default 2
    // so a single-group event with finals enabled gets 1st vs 2nd.
    const single = Math.max(2, advancePerGroup === 1 ? 2 : advancePerGroup)
    for (let p = 1; p <= single; p++) {
      advancing.push({ kind: 'placeholder', groupIndex: 0, place: p })
    }
  } else {
    for (let g = 0; g < groupCount; g++) {
      for (let p = 1; p <= advancePerGroup; p++) {
        advancing.push({ kind: 'placeholder', groupIndex: g, place: p })
      }
    }
  }
  if (advancing.length < 2) return []
  // Two advancing → one final match.
  // Three or more → mini round-robin.
  if (advancing.length === 2) {
    return [
      {
        id: 'final-m1',
        stage: 'finals',
        round: 1,
        slot: 1,
        finalsFormat: 'match',
        slotA: advancing[0],
        slotB: advancing[1],
        scoreA: null,
        scoreB: null,
        completed: false,
      },
    ]
  }
  const out = []
  let matchNo = 1
  for (let i = 0; i < advancing.length; i++) {
    for (let j = i + 1; j < advancing.length; j++) {
      out.push({
        id: `final-m${matchNo}`,
        stage: 'finals',
        round: 1,
        slot: matchNo,
        finalsFormat: 'roundRobin',
        slotA: advancing[i],
        slotB: advancing[j],
        scoreA: null,
        scoreB: null,
        completed: false,
      })
      matchNo++
    }
  }
  return out
}

function buildGroupedMatches(pairs, groups, passCount) {
  const matches = []
  groups.forEach(g => {
    if (g.memberIndices.length < 2) return
    const { matches: local } = generateSchedule(g.memberIndices.length, passCount)
    local.forEach(m => {
      matches.push({
        ...m,
        id: `g${g.index}-${m.id}`,
        groupIndex: g.index,
        stage: 'group',
        pairA: g.memberIndices[m.pairA - 1] + 1,
        pairB: g.memberIndices[m.pairB - 1] + 1,
        bye: m.bye ? g.memberIndices[m.bye - 1] + 1 : null,
      })
    })
  })
  return matches
}

/**
 * Build a default name for a freshly-added division when the pro
 * hasn't typed one. Combines what's known about the division's
 * variant / rating / format so the card has a meaningful header
 * before any entrants are added (e.g. "Men's 4.0 · Single Elim").
 */
function autoName({ kind, variant, rating, entrantKind }, defaults) {
  const v = variant || defaults.variant || 'all'
  const r = rating ?? defaults.rating ?? ''
  const k = kind || 'roundRobin'
  const ek = entrantKind || defaults.entrantKind || 'singles'
  const variantText = v && v !== 'all' ? getVariant(v).label : ''
  const ratingText = getRatingLabel(r) || ''
  const formatText =
    k === 'doubleElim' ? 'Double Elim'
      : k === 'singleElim' ? 'Single Elim'
      : k === 'feedIn' ? 'Feed-In'
      : 'Round Robin'
  const kindText = ek === 'doubles' ? 'Doubles' : 'Singles'
  return [variantText, ratingText, kindText, formatText]
    .filter(Boolean)
    .join(' · ')
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
  const divisions = snapshot?.divisions || []
  return {
    code,
    name: t.name || '',
    date: t.startDate || t.date || '',
    startDate: t.startDate || '',
    endDate: t.endDate || '',
    ongoing: !!t.ongoing,
    divisionCount: divisions.length,
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
      } else if (stateRef.current?.tournament?.roomCode === code) {
        // The server has no record of this code but the device does
        // (likely the pro just created the event and refreshed before
        // the 1200ms debounced save fired). Push our local copy now
        // so the event is recoverable from any other device.
        saveToRoom(code, stateRef.current).catch(() => {})
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
      // Don't poll once the pro has stepped away to Home. Otherwise the
      // 5-second tick re-fetches the remote phase and dispatches a
      // LOAD_STATE that yanks them back into the event they just left.
      if (stateRef.current?.phase === 'home') return
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

  // Last-line-of-defense flush on tab close / mobile background.
  // Without this, a freshly-created event sitting in the 1200ms
  // debounce window would be lost if the pro closed the tab. The
  // `keepalive` POST runs even after the page is gone.
  useEffect(() => {
    function flush() {
      if (!saveTimerRef.current) return
      clearTimeout(saveTimerRef.current)
      saveTimerRef.current = null
      const s = stateRef.current
      const code = s?.tournament?.roomCode
      if (!code || s.phase === 'home') return
      saveToRoomBeacon(code, s)
    }
    window.addEventListener('pagehide', flush)
    window.addEventListener('beforeunload', flush)
    return () => {
      window.removeEventListener('pagehide', flush)
      window.removeEventListener('beforeunload', flush)
    }
  }, [])

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

  async function goHome() {
    // Flush any debounced save before stepping away. Going home
    // intentionally suspends future server saves (phase='home'), so
    // anything still sitting in the 1200ms debounce window would be
    // lost without this. Most often this is the just-created event
    // — the pro hits Create then taps Home before the first save
    // fires.
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current)
      saveTimerRef.current = null
      const code = stateRef.current.tournament.roomCode
      if (code) {
        try {
          await saveToRoom(code, stateRef.current)
        } catch {}
      }
    }
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
