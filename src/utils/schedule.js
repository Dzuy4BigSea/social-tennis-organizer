/**
 * Round-robin schedule generation using the circle method.
 *
 * Each "team" is a tournament pair (1..N). For odd N we add a phantom
 * "bye" slot so every round still produces a well-formed pairing.
 *
 * Returns a flat queue of matches in playing order. Round 1 matches first,
 * then round 2, etc. Each match references the round it belongs to and the
 * 1-indexed pair numbers, so the UI can show "now / next / on deck" for a
 * single court running matches sequentially.
 */
export function generateSchedule(numPairs) {
  if (numPairs < 2) return { rounds: [], matches: [] }

  const teams = Array.from({ length: numPairs }, (_, i) => i + 1)
  const hasBye = teams.length % 2 === 1
  if (hasBye) teams.push(0) // 0 = bye slot

  const totalRounds = teams.length - 1
  const half = teams.length / 2

  const rounds = []
  let arr = [...teams]

  for (let r = 0; r < totalRounds; r++) {
    const matches = []
    let bye = null
    for (let i = 0; i < half; i++) {
      const a = arr[i]
      const b = arr[arr.length - 1 - i]
      if (a === 0) bye = b
      else if (b === 0) bye = a
      else matches.push([a, b])
    }
    rounds.push({ round: r + 1, matches, bye })
    // rotate: keep first fixed, move last to slot 1
    arr = [arr[0], arr[arr.length - 1], ...arr.slice(1, arr.length - 1)]
  }

  // Flat queue: every match in the order it should be played
  const matches = []
  rounds.forEach(({ round, matches: pairings, bye }) => {
    pairings.forEach(([a, b], idx) => {
      matches.push({
        id: `r${round}-m${idx + 1}`,
        round,
        slot: idx + 1, // playing order within the round
        pairA: a,
        pairB: b,
        bye,
        scoreA: null,
        scoreB: null,
        completed: false,
      })
    })
  })

  return { rounds, matches }
}

/**
 * Build a fresh standings matrix: a 2D map indexed by pair number,
 * where matrix[a][b] = the score pair `a` recorded vs pair `b`.
 * Empty cells stay null.
 */
export function buildStandings(numPairs, matches) {
  const grid = {}
  for (let i = 1; i <= numPairs; i++) {
    grid[i] = {}
    for (let j = 1; j <= numPairs; j++) {
      grid[i][j] = i === j ? 'X' : null
    }
  }
  matches.forEach(m => {
    if (!m.completed) return
    grid[m.pairA][m.pairB] = m.scoreA
    grid[m.pairB][m.pairA] = m.scoreB
  })

  // Totals: total games won across all matches played
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
 * Pop the next N upcoming (not-yet-completed) matches. The pro can use this
 * to call out "now playing", "on deck", and "in the hole".
 */
export function upcomingMatches(matches, count = 3) {
  return matches.filter(m => !m.completed).slice(0, count)
}
