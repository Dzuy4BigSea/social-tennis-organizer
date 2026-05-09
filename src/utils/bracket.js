/**
 * Single-elimination bracket builder.
 *
 * Given an entrants array (already seeded 1..N by setup order), build
 * a power-of-two bracket using standard tennis seeding: top seeds are
 * spread as far apart as possible so they only meet in the final.
 * When the entrants count isn't a power of two, the highest seeds get
 * first-round byes — never a lower seed.
 *
 * `standardSeedingOrder(n)` returns the seed numbers in bracket-slot
 * order. e.g. for n=8: [1, 8, 4, 5, 2, 7, 3, 6] — slots 0/1 face off,
 * 2/3 face off, etc. The pattern is recursive: slot order for size N
 * is interleaved with mirrors of the slot order for size N/2.
 */
function standardSeedingOrder(n) {
  if (n < 2) return [1]
  if (n === 2) return [1, 2]
  const half = standardSeedingOrder(n / 2)
  const out = []
  for (const s of half) {
    out.push(s)
    out.push(n + 1 - s)
  }
  return out
}

function nextPowerOfTwo(n) {
  let p = 1
  while (p < n) p *= 2
  return Math.max(2, p)
}

/**
 * Returns { matches, rounds, size } for a single-elimination bracket.
 *
 * Match shape:
 *   { id, round, slot, bracket: 'main',
 *     pA: { kind: 'seed' | 'winner', value },
 *     pB: { kind: 'seed' | 'winner', value },
 *     scoreA, scoreB, completed, winnerSlot }
 *
 * Round-1 matches reference seed numbers directly. Subsequent rounds
 * reference the match id whose winner advances into that slot. The
 * Live screen resolves these on render so it can show "Winner of
 * R1-M3" or the actual entrant name once that match is decided.
 *
 * Bye handling: when seed > entrantsCount the bye-side is null and
 * the match is auto-completed in favor of the seeded opponent. This
 * keeps the round-2 lookup logic uniform — it only ever asks "who
 * won r1-mX?" and gets a real answer either way.
 */
export function generateSingleElimBracket(entrantsCount) {
  if (entrantsCount < 2) return { matches: [], rounds: 0, size: 0 }
  const size = nextPowerOfTwo(entrantsCount)
  const slotOrder = standardSeedingOrder(size) // length = size
  const rounds = Math.log2(size)
  const matches = []

  // Round 1: pair adjacent slots. A bye seed (> entrantsCount) makes
  // the match an auto-walkover.
  const r1Count = size / 2
  for (let m = 1; m <= r1Count; m++) {
    const seedA = slotOrder[(m - 1) * 2]
    const seedB = slotOrder[(m - 1) * 2 + 1]
    const aBye = seedA > entrantsCount
    const bBye = seedB > entrantsCount
    let scoreA = null
    let scoreB = null
    let completed = false
    let winnerSlot = null
    if (aBye && !bBye) {
      completed = true
      winnerSlot = 'B'
    } else if (bBye && !aBye) {
      completed = true
      winnerSlot = 'A'
    }
    matches.push({
      id: `r1-m${m}`,
      round: 1,
      slot: m,
      bracket: 'main',
      pA: aBye ? null : { kind: 'seed', value: seedA },
      pB: bBye ? null : { kind: 'seed', value: seedB },
      scoreA,
      scoreB,
      completed,
      winnerSlot,
    })
  }

  // Subsequent rounds: each match feeds from the two preceding-round
  // matches whose winners meet here.
  for (let r = 2; r <= rounds; r++) {
    const numMatches = size / Math.pow(2, r)
    for (let m = 1; m <= numMatches; m++) {
      const childA = `r${r - 1}-m${m * 2 - 1}`
      const childB = `r${r - 1}-m${m * 2}`
      matches.push({
        id: `r${r}-m${m}`,
        round: r,
        slot: m,
        bracket: 'main',
        pA: { kind: 'winner', value: childA },
        pB: { kind: 'winner', value: childB },
        scoreA: null,
        scoreB: null,
        completed: false,
        winnerSlot: null,
      })
    }
  }

  return { matches, rounds, size }
}

/**
 * Resolve who plays in a given slot, given the current bracket state.
 * Returns one of:
 *   { kind: 'entrant', entrant }       — known entrant
 *   { kind: 'pendingWinner', matchId } — match upstream not yet decided
 *   { kind: 'pendingLoser', matchId }  — match upstream not yet decided
 *   { kind: 'bye' }                    — opponent has a walkover
 */
export function resolveSlot(bracket, slot) {
  if (!slot) return { kind: 'bye' }
  if (slot.kind === 'seed') {
    const e = bracket.entrants.find(x => x.seed === slot.value)
    if (!e) return { kind: 'bye' }
    return { kind: 'entrant', entrant: e }
  }
  // 'winner' / 'loser' both reference another match by id.
  const upstream = bracket.matches.find(m => m.id === slot.value)
  if (!upstream) {
    return { kind: slot.kind === 'loser' ? 'pendingLoser' : 'pendingWinner', matchId: slot.value }
  }
  if (!upstream.completed) {
    return { kind: slot.kind === 'loser' ? 'pendingLoser' : 'pendingWinner', matchId: slot.value }
  }
  if (slot.kind === 'winner') {
    const winningSlot = upstream.winnerSlot === 'A' ? upstream.pA : upstream.pB
    return resolveSlot(bracket, winningSlot)
  }
  // Loser feed-in: take the side that didn't win.
  const losingSlot = upstream.winnerSlot === 'A' ? upstream.pB : upstream.pA
  if (!losingSlot) return { kind: 'bye' }
  return resolveSlot(bracket, losingSlot)
}

/**
 * Double-elimination bracket builder.
 *
 * Produces three logical sections in a single flat `matches` array:
 *
 *   - Winner's bracket (`bracket: 'main'`, ids `wb-r{R}-m{M}`)
 *   - Loser's bracket  (`bracket: 'losers'`, ids `lb-r{R}-m{M}`)
 *   - Grand final + optional reset (`bracket: 'grandFinal'` / `'reset'`)
 *
 * Loser's-bracket structure for K-round WB (K = log2(size)):
 *   - LB has 2(K-1) rounds.
 *   - LB R1 pairs WB R1 losers with each other (drop-in).
 *   - Even LB rounds drop in WB losers from the corresponding WB
 *     round (LB R2 ⟵ WB R2 losers, LB R4 ⟵ WB R3, …).
 *   - Odd LB rounds (R3, R5, …) consolidate previous LB winners.
 *
 * For now we use sequential pairing of LB inputs (m1 vs m2, etc.).
 * Production brackets sometimes flip the drop pattern between rounds
 * to delay rematches between the same WB-half losers — worth
 * revisiting later if a coach calls it out.
 *
 * Walkovers from byes propagate automatically: if a WB R1 match is a
 * walkover, the LB match expecting its loser also auto-completes,
 * cascading downstream until every reachable bye is absorbed.
 */
export function generateDoubleElimBracket(entrantsCount) {
  if (entrantsCount < 2) return { matches: [], rounds: 0, size: 0 }
  const size = nextPowerOfTwo(entrantsCount)
  const slotOrder = standardSeedingOrder(size)
  const K = Math.log2(size)
  const matches = []

  // ----- Winner's bracket -----
  for (let m = 1; m <= size / 2; m++) {
    const seedA = slotOrder[(m - 1) * 2]
    const seedB = slotOrder[(m - 1) * 2 + 1]
    const aBye = seedA > entrantsCount
    const bBye = seedB > entrantsCount
    let scoreA = null
    let scoreB = null
    let completed = false
    let winnerSlot = null
    if (aBye && !bBye) { completed = true; winnerSlot = 'B' }
    else if (bBye && !aBye) { completed = true; winnerSlot = 'A' }
    matches.push({
      id: `wb-r1-m${m}`,
      round: 1,
      slot: m,
      bracket: 'main',
      pA: aBye ? null : { kind: 'seed', value: seedA },
      pB: bBye ? null : { kind: 'seed', value: seedB },
      scoreA, scoreB, completed, winnerSlot,
    })
  }
  for (let r = 2; r <= K; r++) {
    const numMatches = size / Math.pow(2, r)
    for (let m = 1; m <= numMatches; m++) {
      matches.push({
        id: `wb-r${r}-m${m}`,
        round: r,
        slot: m,
        bracket: 'main',
        pA: { kind: 'winner', value: `wb-r${r - 1}-m${m * 2 - 1}` },
        pB: { kind: 'winner', value: `wb-r${r - 1}-m${m * 2}` },
        scoreA: null, scoreB: null, completed: false, winnerSlot: null,
      })
    }
  }

  // ----- Loser's bracket -----
  const lbRounds = K >= 2 ? 2 * (K - 1) : 0
  if (K >= 2) {
    // LB R1: pair WB R1 losers.
    const r1Count = size / 4
    for (let m = 1; m <= r1Count; m++) {
      matches.push({
        id: `lb-r1-m${m}`,
        round: 1,
        slot: m,
        bracket: 'losers',
        pA: { kind: 'loser', value: `wb-r1-m${m * 2 - 1}` },
        pB: { kind: 'loser', value: `wb-r1-m${m * 2}` },
        scoreA: null, scoreB: null, completed: false, winnerSlot: null,
      })
    }

    for (let r = 2; r <= lbRounds; r++) {
      const isDropIn = r % 2 === 0
      const prevCount = matches.filter(
        x => x.bracket === 'losers' && x.round === r - 1
      ).length
      const count = isDropIn ? prevCount : prevCount / 2
      const wbDropRound = r / 2 + 1 // only meaningful when isDropIn
      for (let m = 1; m <= count; m++) {
        let pA
        let pB
        if (isDropIn) {
          pA = { kind: 'winner', value: `lb-r${r - 1}-m${m}` }
          pB = { kind: 'loser', value: `wb-r${wbDropRound}-m${m}` }
        } else {
          pA = { kind: 'winner', value: `lb-r${r - 1}-m${m * 2 - 1}` }
          pB = { kind: 'winner', value: `lb-r${r - 1}-m${m * 2}` }
        }
        matches.push({
          id: `lb-r${r}-m${m}`,
          round: r,
          slot: m,
          bracket: 'losers',
          pA, pB,
          scoreA: null, scoreB: null, completed: false, winnerSlot: null,
        })
      }
    }
  }

  // ----- Grand final + optional reset -----
  // Grand final pits WB winner against LB winner. The reset only
  // matters if the LB-side wins GF1 (the WB-side has zero losses
  // entering the GF, so they get a second chance). We always emit
  // both matches; LiveBracket suppresses the reset until needed.
  const wbFinalId = `wb-r${K}-m1`
  const lbFinalId = lbRounds > 0 ? `lb-r${lbRounds}-m1` : null
  if (lbFinalId) {
    matches.push({
      id: 'gf-m1',
      round: K + 1,
      slot: 1,
      bracket: 'grandFinal',
      pA: { kind: 'winner', value: wbFinalId },
      pB: { kind: 'winner', value: lbFinalId },
      scoreA: null, scoreB: null, completed: false, winnerSlot: null,
    })
    matches.push({
      id: 'gf-m2',
      round: K + 1,
      slot: 2,
      bracket: 'reset',
      pA: { kind: 'winner', value: wbFinalId },
      pB: { kind: 'winner', value: lbFinalId },
      scoreA: null, scoreB: null, completed: false, winnerSlot: null,
    })
  }

  propagateWalkovers(matches)

  return { matches, rounds: K, size, type: 'doubleElim' }
}

/**
 * After building the bracket, sweep through and auto-complete any
 * match where one side resolves to a bye (typically because a WB R1
 * walkover left a loser-feed slot empty). Repeat until no further
 * changes — bye chains can run several layers deep.
 */
/**
 * Public so the reducer can re-run propagation after every score
 * change. Without this, downstream byes that depended on the just-
 * decided match wouldn't auto-advance.
 */
export function applyWalkoverPropagation(matches) {
  propagateWalkovers(matches)
  return matches
}

function propagateWalkovers(matches) {
  let changed = true
  while (changed) {
    changed = false
    for (const m of matches) {
      if (m.completed) continue
      const a = staticResolve(matches, m.pA)
      const b = staticResolve(matches, m.pB)
      if (a === 'bye' && b === 'entrant') {
        m.completed = true
        m.winnerSlot = 'B'
        changed = true
      } else if (b === 'bye' && a === 'entrant') {
        m.completed = true
        m.winnerSlot = 'A'
        changed = true
      } else if (a === 'bye' && b === 'bye') {
        m.completed = true
        m.winnerSlot = null
        changed = true
      }
    }
  }
}

function staticResolve(matches, slot) {
  if (!slot) return 'bye'
  if (slot.kind === 'seed') return 'entrant'
  const upstream = matches.find(x => x.id === slot.value)
  if (!upstream || !upstream.completed) return 'pending'
  if (slot.kind === 'winner') {
    if (!upstream.winnerSlot) return 'bye'
    const winSide = upstream.winnerSlot === 'A' ? upstream.pA : upstream.pB
    return staticResolve(matches, winSide)
  }
  // loser
  if (!upstream.winnerSlot) return 'bye'
  const loseSide = upstream.winnerSlot === 'A' ? upstream.pB : upstream.pA
  return staticResolve(matches, loseSide)
}

export function entrantLabel(entrant) {
  if (!entrant) return ''
  const a = (entrant.p1 || '').trim()
  const b = (entrant.p2 || '').trim()
  if (a && b) return `${a} / ${b}`
  return a || b || `Entrant ${entrant.seed}`
}
