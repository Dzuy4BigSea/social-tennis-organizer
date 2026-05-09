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
 *   { kind: 'bye' }                    — opponent has a walkover
 */
export function resolveSlot(bracket, slot) {
  if (!slot) return { kind: 'bye' }
  if (slot.kind === 'seed') {
    const e = bracket.entrants.find(x => x.seed === slot.value)
    if (!e) return { kind: 'bye' }
    return { kind: 'entrant', entrant: e }
  }
  // 'winner' references another match by id.
  const upstream = bracket.matches.find(m => m.id === slot.value)
  if (!upstream) return { kind: 'pendingWinner', matchId: slot.value }
  if (!upstream.completed) return { kind: 'pendingWinner', matchId: slot.value }
  const winningSlot = upstream.winnerSlot === 'A' ? upstream.pA : upstream.pB
  return resolveSlot(bracket, winningSlot)
}

export function entrantLabel(entrant) {
  if (!entrant) return ''
  const a = (entrant.p1 || '').trim()
  const b = (entrant.p2 || '').trim()
  if (a && b) return `${a} / ${b}`
  return a || b || `Entrant ${entrant.seed}`
}
