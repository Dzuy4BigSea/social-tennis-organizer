import React from 'react'
import { getEventType, getVariant, getRatingLabel } from '../utils/eventTypes.js'

/**
 * Placeholder for event types whose Setup/Live UI hasn't been built
 * yet (double elim, team tennis, league, social, member-organized).
 *
 * The room is real — metadata is saved server-side, the recent list
 * shows it, and a colleague with the link can open it. We just don't
 * have a scoring/bracket UI for these formats yet, so this screen is
 * deliberate: it tells the pro the event is parked and what info we
 * captured.
 */
export default function ComingSoon({ state }) {
  const t = state.tournament
  const evt = getEventType(t.type)
  const variant = getVariant(t.variant)
  return (
    <section className="bg-white rounded-2xl border border-vinoy-border p-6 mb-4 text-center shadow-sm">
      <div className="inline-flex items-center px-3 py-1 rounded-full bg-vinoy-gold/10 border border-vinoy-gold/40 text-vinoy-gold text-xs font-semibold uppercase tracking-wider mb-3">
        Coming soon
      </div>
      <h2 className="font-display text-2xl font-bold text-vinoy-green mb-2">
        {evt.label}
      </h2>
      <p className="text-sm text-vinoy-ink/70 max-w-md mx-auto mb-4">
        Scoring and draw tools for this format aren't built yet. Your event
        is saved to the room — share the link or come back later once the UI
        ships.
      </p>
      <dl className="text-sm grid grid-cols-2 gap-y-1 max-w-sm mx-auto text-left">
        <dt className="text-vinoy-ink/60">Variant</dt>
        <dd className="font-semibold">{variant.label}</dd>
        {t.rating && (
          <>
            <dt className="text-vinoy-ink/60">Rating</dt>
            <dd className="font-semibold">{getRatingLabel(t.rating)}</dd>
          </>
        )}
        {t.ongoing ? (
          <>
            <dt className="text-vinoy-ink/60">Schedule</dt>
            <dd className="font-semibold">Ongoing</dd>
          </>
        ) : t.startDate ? (
          <>
            <dt className="text-vinoy-ink/60">Dates</dt>
            <dd className="font-semibold">
              {t.startDate}
              {t.endDate ? ` – ${t.endDate}` : ''}
            </dd>
          </>
        ) : null}
        {t.roomCode && (
          <>
            <dt className="text-vinoy-ink/60">Room</dt>
            <dd className="font-mono">{t.roomCode}</dd>
          </>
        )}
      </dl>
    </section>
  )
}
