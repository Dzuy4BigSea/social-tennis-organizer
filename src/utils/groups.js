import { buildStandings } from './schedule.js'

/**
 * Per-group standings for a multi-group RR/feed-in division.
 *
 * Matches stored on the division reference division-wide (1-based)
 * pair indices. To reuse buildStandings without changes, we filter
 * down to the target group's matches and remap pairA/pairB/bye to
 * the local 1..groupSize index space the standings algorithm
 * expects. Lookups back to the original pair ride on the group's
 * `memberIndices` array.
 */
export function buildGroupStandings(division, groupIndex) {
  if (!Array.isArray(division.groups)) {
    return buildStandings(division.pairs.length, division.matches || [])
  }
  const group = division.groups[groupIndex]
  if (!group) return null
  const indexOfMember = (globalOneBased) =>
    group.memberIndices.indexOf(globalOneBased - 1) + 1
  const localMatches = (division.matches || [])
    .filter(m => m.groupIndex === groupIndex)
    .map(m => ({
      ...m,
      pairA: indexOfMember(m.pairA),
      pairB: indexOfMember(m.pairB),
      bye: m.bye ? indexOfMember(m.bye) : null,
    }))
  const standings = buildStandings(group.memberIndices.length, localMatches)
  return { group, localMatches, standings }
}

/**
 * Resolve a finals "placeholder" slot ({ kind, groupIndex, place })
 * to the actual pair in division.pairs once the source group's
 * standings are stable. Returns null if the group hasn't completed
 * (so the live UI can show "1st of Group A" until then).
 *
 * "Stable" = every match in the group is completed. We don't try
 * to break ties for non-final placements because most clubs use
 * head-to-head + games-won which buildStandings already orders.
 */
export function resolveFinalsSlot(division, slot) {
  if (!slot || slot.kind !== 'placeholder') return null
  const data = buildGroupStandings(division, slot.groupIndex)
  if (!data) return null
  const allDone = data.localMatches.every(m => m.completed || m.bye)
  if (!allDone) return null
  // standings is sorted; standings[place - 1].pairIdx gives a 1-based
  // local index. Map to division.pairs via memberIndices.
  const row = data.standings[slot.place - 1]
  if (!row) return null
  const localOneBased = row.pairIdx
  const memberIdx = data.group.memberIndices[localOneBased - 1]
  if (memberIdx == null) return null
  return division.pairs[memberIdx] || null
}

export function placeholderLabel(slot) {
  if (!slot || slot.kind !== 'placeholder') return ''
  const groupLetter = String.fromCharCode(65 + (slot.groupIndex || 0))
  const ordinal =
    slot.place === 1 ? '1st' : slot.place === 2 ? '2nd' : slot.place === 3 ? '3rd' : `${slot.place}th`
  return `${ordinal} of Group ${groupLetter}`
}
