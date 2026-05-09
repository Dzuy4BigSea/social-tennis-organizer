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
