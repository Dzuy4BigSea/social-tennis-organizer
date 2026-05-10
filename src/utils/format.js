/**
 * Shared display formatters. Keeping them in one place stops the
 * "everyone re-implements toLocaleString slightly differently" drift
 * across components.
 */

/**
 * `2026-05-15T14:00` (the value HTML datetime-local inputs produce)
 * → "Sat May 15 · 2:00 PM". Returns '' for empty / unparseable input
 * so callers can render conditionally with simple truthiness.
 */
export function formatMatchTime(iso) {
  if (!iso) return ''
  // datetime-local has no zone; treat as local time.
  const d = new Date(iso)
  if (isNaN(d)) return ''
  const dayLabel = d.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
  const timeLabel = d.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  })
  return `${dayLabel} · ${timeLabel}`
}

export function formatTimeOnly(hhmm) {
  if (!hhmm) return ''
  const [h, m] = hhmm.split(':').map(Number)
  if (isNaN(h) || isNaN(m)) return hhmm
  const d = new Date()
  d.setHours(h, m, 0, 0)
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

/**
 * "May 15" style for ISO-date strings (`YYYY-MM-DD`). Used by the
 * Home + All Events list views to render compact date ranges.
 */
export function shortDate(iso) {
  if (!iso) return ''
  const d = new Date(iso + 'T00:00:00')
  if (isNaN(d)) return iso
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

/**
 * Recent-room object → range label like "May 15–17", or "May 15"
 * for single-day events, or "Ongoing" for events without a fixed
 * end date that the pro flagged as still running. Returns null
 * when the room has no date info — so callers can chain with `&&`.
 */
export function formatDateRange(room) {
  if (!room) return null
  if (room.ongoing) return 'Ongoing'
  if (room.startDate && room.endDate && room.startDate !== room.endDate) {
    return `${shortDate(room.startDate)}–${shortDate(room.endDate)}`
  }
  if (room.startDate) return shortDate(room.startDate)
  return null
}
