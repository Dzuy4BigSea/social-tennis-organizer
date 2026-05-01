/**
 * Up and Down the River shuffle algorithm.
 *
 * Winners move UP (lower court number = better court).
 * Losers move DOWN (higher court number).
 *
 * @param {Array} courts - Array of court objects with teams and winnerId
 * @param {string} format - 'singles' or 'doubles'
 * @returns {{ newCourts: Array, byePlayers: Array }}
 */
export function shuffleCourts(courts, format = 'doubles') {
  const n = courts.length
  if (n === 0) return { newCourts: [], byePlayers: [] }

  // Extract winner and loser teams for each court
  const winners = [] // winners[i] = [playerId, ...] from court i
  const losers = []  // losers[i]  = [playerId, ...] from court i

  for (let i = 0; i < n; i++) {
    const court = courts[i]
    const winIdx = court.winnerId !== null && court.winnerId !== undefined ? court.winnerId : 0
    const loseIdx = 1 - winIdx
    winners.push([...(court.teams[winIdx] || [])])
    losers.push([...(court.teams[loseIdx] || [])])
  }

  // Build new teams per court
  // Court 0: winners[0] + winners[1]  (both top winners stay / come down from court 1)
  // Court k (middle): losers[k-1] + winners[k+1]
  // Court N-1: losers[N-2] + losers[N-1]

  const newCourts = courts.map((court, i) => {
    let groupA, groupB

    if (n === 1) {
      // Only one court — keep everyone, re-split
      groupA = winners[0]
      groupB = losers[0]
    } else if (i === 0) {
      groupA = winners[0]
      groupB = winners[1]
    } else if (i === n - 1) {
      groupA = losers[n - 2]
      groupB = losers[n - 1]
    } else {
      groupA = losers[i - 1]
      groupB = winners[i + 1]
    }

    // Split logic: [A,B] from groupA, [C,D] from groupB
    // Team 1: [A, C], Team 2: [B, D]
    const teams = splitIntoTeams(groupA, groupB, format)

    return {
      ...court,  // preserves id, number, label
      teams,
      winnerId: null,
    }
  })

  // Collect any players that ended up without a slot (bye pool)
  // For standard even numbers this should be empty
  const byePlayers = []

  return { newCourts, byePlayers }
}

/**
 * Split two groups into two teams for the next round.
 * For doubles: groupA=[A,B], groupB=[C,D] → Team1=[A,C], Team2=[B,D]
 * For singles: groupA=[A], groupB=[B] → Team1=[A], Team2=[B]
 */
function splitIntoTeams(groupA, groupB, format) {
  const slotsPerTeam = format === 'singles' ? 1 : 2

  const allPlayers = [...groupA, ...groupB]

  // Ensure we have enough players; pad with nulls if short
  while (allPlayers.length < slotsPerTeam * 2) {
    allPlayers.push(null)
  }

  if (format === 'singles') {
    return [[allPlayers[0]], [allPlayers[1]]]
  }

  // Doubles: interleave — A,C on team1, B,D on team2
  const [a, b] = groupA
  const [c, d] = groupB
  return [
    [a ?? null, c ?? null],
    [b ?? null, d ?? null],
  ]
}

/**
 * Generate initial courts from a list of checked-in players.
 * Players are sorted by skill desc, then distributed snake-draft style.
 *
 * @param {Array} players - All checked-in players
 * @param {number} numCourts - Number of courts
 * @param {string} format - 'singles' | 'doubles'
 * @returns {{ courts: Array, byePlayers: Array }}
 */
export function generateInitialCourts(players, numCourts, format = 'doubles') {
  const playersPerCourt = format === 'singles' ? 2 : 4
  const totalSlots = numCourts * playersPerCourt

  // Sort by skill desc, then name
  const sorted = [...players].sort((a, b) => {
    if (b.skill !== a.skill) return b.skill - a.skill
    return a.name.localeCompare(b.name)
  })

  const assigned = sorted.slice(0, totalSlots)
  const byePlayers = sorted.slice(totalSlots).map(p => p.id)

  // Snake-draft distribution across courts
  // Court 1 (index 0) is the best court
  const courtPlayers = Array.from({ length: numCourts }, () => [])

  for (let i = 0; i < assigned.length; i++) {
    const round = Math.floor(i / numCourts)
    const pos = round % 2 === 0 ? i % numCourts : numCourts - 1 - (i % numCourts)
    courtPlayers[pos].push(assigned[i].id)
  }

  const courts = courtPlayers.map((playerIds, idx) => {
    let teams
    if (format === 'singles') {
      teams = [[playerIds[0] ?? null], [playerIds[1] ?? null]]
    } else {
      teams = [
        [playerIds[0] ?? null, playerIds[2] ?? null],
        [playerIds[1] ?? null, playerIds[3] ?? null],
      ]
    }
    return {
      id: `court-${idx + 1}`,
      number: idx + 1,
      teams,
      winnerId: null,
    }
  })

  return { courts, byePlayers }
}
