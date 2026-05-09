/**
 * Round-robin schedule generation across one or more "passes".
 *
 * A *pass* is a complete run-through where every pair plays every other
 * pair once. Coaches think of a pass as one "round" of the tournament,
 * and they may run multiple passes back-to-back with different target
 * scores per pass (e.g. round 1 to 7, round 2 to 5, round 3 to 1).
 *
 * Internally each pass is built with the circle method. For pass 2+ we
 * reverse the rotation direction so the playing order isn't identical to
 * pass 1 — courts feel less repetitive without affecting which pairs face
 * each other.
 *
 * Returns a flat queue of matches in playing order: pass 1's matches
 * first, then pass 2, etc. Each match carries `pass`, `round` (the RR
 * round inside the pass), and `slot` (playing order within that round).
 */
export function generateSchedule(numPairs, passCount = 1) {
  if (numPairs < 2) return { matches: [] }
  const passes = Math.max(1, passCount | 0)

  const matches = []
  for (let p = 1; p <= passes; p++) {
    const reverse = p % 2 === 0 // alternate direction per pass
    matches.push(...buildPass(numPairs, p, reverse))
  }
  return { matches }
}

function buildPass(numPairs, passNum, reverse) {
  const teams = Array.from({ length: numPairs }, (_, i) => i + 1)
  const hasBye = teams.length % 2 === 1
  if (hasBye) teams.push(0) // 0 = bye slot

  const totalRounds = teams.length - 1
  const half = teams.length / 2

  const rounds = []
  let arr = [...teams]

  for (let r = 0; r < totalRounds; r++) {
    const pairings = []
    let bye = null
    for (let i = 0; i < half; i++) {
      const a = arr[i]
      const b = arr[arr.length - 1 - i]
      if (a === 0) bye = b
      else if (b === 0) bye = a
      else pairings.push([a, b])
    }
    rounds.push({ pairings, bye })
    if (reverse) {
      // rotate the other direction: keep first fixed, move slot 1 to last
      arr = [arr[0], ...arr.slice(2), arr[1]]
    } else {
      arr = [arr[0], arr[arr.length - 1], ...arr.slice(1, arr.length - 1)]
    }
  }

  const out = []
  rounds.forEach(({ pairings, bye }, rIdx) => {
    pairings.forEach(([a, b], idx) => {
      out.push({
        id: `p${passNum}-r${rIdx + 1}-m${idx + 1}`,
        pass: passNum,
        round: rIdx + 1,
        slot: idx + 1,
        pairA: a,
        pairB: b,
        bye,
        scoreA: null,
        scoreB: null,
        completed: false,
      })
    })
  })
  return out
}

/**
 * Build a fresh standings matrix.
 *
 * matrix[a][b] holds an array of scores that pair `a` recorded vs pair
 * `b` across all passes — when there's only one pass it's a single
 * value, but for multi-pass tournaments the same matchup happens once
 * per pass and we keep all of them.
 *
 * Wins and totals are aggregated across every played match.
 */
export function buildStandings(numPairs, matches) {
  const grid = {}
  for (let i = 1; i <= numPairs; i++) {
    grid[i] = {}
    for (let j = 1; j <= numPairs; j++) {
      grid[i][j] = i === j ? 'X' : []
    }
  }
  matches.forEach(m => {
    if (!m.completed) return
    grid[m.pairA][m.pairB].push(m.scoreA)
    grid[m.pairB][m.pairA].push(m.scoreB)
  })

  const totals = {}
  const wins = {}
  for (let i = 1; i <= numPairs; i++) {
    totals[i] = 0
    wins[i] = 0
  }
  matches.forEach(m => {
    if (!m.completed) return
    totals[m.pairA] += m.scoreA
    totals[m.pairB] += m.scoreB
    if (m.scoreA > m.scoreB) wins[m.pairA] += 1
    else if (m.scoreB > m.scoreA) wins[m.pairB] += 1
  })

  return { grid, totals, wins }
}

/**
 * Pop the next N upcoming (not-yet-completed) matches in playing order.
 */
export function upcomingMatches(matches, count = 3) {
  return matches.filter(m => !m.completed).slice(0, count)
}
