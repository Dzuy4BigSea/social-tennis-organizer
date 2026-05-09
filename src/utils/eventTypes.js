/**
 * Catalog of every event the pro can run through the app.
 *
 * Each entry's `engine` field tells the renderer which Setup/Live
 * screens to use. `'roundRobin'` and `'singleElim'` are fully
 * implemented; the rest fall through to the generic "captures
 * metadata, scoring UI coming soon" placeholder so a coach can park
 * an event on the schedule today and we can flesh out the run UI
 * later without changing the saved data.
 *
 * `entrantKind` distinguishes whether entries are individual players
 * (singles) or pairs (doubles). Setup/Live screens use this to know
 * if they need one or two name fields per entrant.
 */
export const EVENT_TYPES = [
  {
    id: 'feedIn',
    label: 'Feed-In Tournament',
    blurb: 'Round-robin draw where everyone plays everyone in their division.',
    engine: 'roundRobin',
    entrantKind: 'doubles',
  },
  {
    id: 'roundRobinSingles',
    label: 'Round Robin (Singles)',
    blurb: 'Every player plays every other player in their division.',
    engine: 'roundRobin',
    entrantKind: 'singles',
  },
  {
    id: 'roundRobinDoubles',
    label: 'Round Robin (Doubles)',
    blurb: 'Every pair plays every other pair in their division.',
    engine: 'roundRobin',
    entrantKind: 'doubles',
  },
  {
    id: 'singlesSingleElim',
    label: 'Singles — Single Elimination',
    blurb: 'Standard knockout draw. One loss and you’re out.',
    engine: 'singleElim',
    entrantKind: 'singles',
  },
  {
    id: 'doublesSingleElim',
    label: 'Doubles — Single Elimination',
    blurb: 'Standard knockout draw for pairs.',
    engine: 'singleElim',
    entrantKind: 'doubles',
  },
  {
    id: 'singlesDoubleElim',
    label: 'Singles — Double Elimination',
    blurb: 'Two losses to be eliminated. Winner’s and loser’s brackets.',
    engine: 'doubleElim',
    entrantKind: 'singles',
  },
  {
    id: 'doublesDoubleElim',
    label: 'Doubles — Double Elimination',
    blurb: 'Two losses to be eliminated, for pairs.',
    engine: 'doubleElim',
    entrantKind: 'doubles',
  },
  {
    id: 'teamTennis',
    label: 'Team Tennis',
    blurb: 'Mix of singles and doubles matches scored as one team contest.',
    engine: 'comingSoon',
    entrantKind: 'team',
  },
  {
    id: 'league',
    label: 'League',
    blurb: 'Multi-week recurring play. Format options coming soon.',
    engine: 'comingSoon',
    entrantKind: 'team',
  },
  {
    id: 'social',
    label: 'Social Event',
    blurb: 'Casual play, no formal scoring required.',
    engine: 'comingSoon',
    entrantKind: 'singles',
  },
  {
    id: 'memberOrganized',
    label: 'Member Organized',
    blurb: 'Members run their own play. Pros track participation.',
    engine: 'comingSoon',
    entrantKind: 'singles',
  },
]

export function getEventType(id) {
  return EVENT_TYPES.find(t => t.id === id) || EVENT_TYPES[0]
}

export const VARIANTS = [
  { id: 'all', label: 'All' },
  { id: 'mens', label: "Men's" },
  { id: 'womens', label: "Women's" },
  { id: 'mixed', label: 'Mixed' },
]

export function getVariant(id) {
  return VARIANTS.find(v => v.id === id) || VARIANTS[0]
}

/**
 * Standard NTRP rating bands plus the less-common combo-rating bands
 * (sum of the two pair ratings, used in some doubles events). Listed
 * separately so the picker can group them; either set produces a
 * single `rating` string on the saved event.
 */
export const RATINGS_STANDARD = [
  { id: 'open', label: 'Open' },
  { id: '4.5', label: '4.5' },
  { id: '4.0', label: '4.0' },
  { id: '3.5', label: '3.5' },
  { id: '3.0', label: '3.0' },
]

export const RATINGS_COMBO = [
  { id: 'combo-open', label: 'Combo Open' },
  { id: 'combo-9.0', label: 'Combo 9.0' },
  { id: 'combo-8.5', label: 'Combo 8.5' },
  { id: 'combo-8.0', label: 'Combo 8.0' },
  { id: 'combo-7.0', label: 'Combo 7.0' },
  { id: 'combo-6.5', label: 'Combo 6.5' },
  { id: 'combo-6.0', label: 'Combo 6.0' },
]

export function getRatingLabel(id) {
  if (!id) return ''
  const all = [...RATINGS_STANDARD, ...RATINGS_COMBO]
  const found = all.find(r => r.id === id)
  return found ? found.label : id
}
