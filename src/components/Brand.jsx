import React from 'react'

/**
 * Vinoy Club masthead. The crest is served from /public so it lives
 * at <BASE_URL>vinoy-logo.png after the Vite build (e.g. /feedin/...).
 *
 * `compact` shrinks the lockup for the live-board header where every
 * vertical pixel competes with the now-playing card.
 *
 * `onClick` makes the whole lockup behave as a return-to-home control
 * — the conventional logo-as-home-link pattern. The element renders
 * as a button when interactive so keyboard navigation works.
 */
export default function Brand({ subtitle, compact = false, onClick }) {
  const logoUrl = `${import.meta.env.BASE_URL}vinoy-logo.png`
  const size = compact ? 'h-10' : 'h-14'
  const titleSize = compact ? 'text-base' : 'text-lg'
  const subSize = compact ? 'text-base sm:text-lg' : 'text-2xl sm:text-3xl'

  const inner = (
    <>
      <img
        src={logoUrl}
        alt="Vinoy Club crest"
        className={`${size} w-auto select-none`}
        draggable={false}
      />
      <div className="min-w-0 text-left">
        <div
          className={`font-display font-bold text-vinoy-green tracking-wide leading-none ${titleSize}`}
        >
          VINOY CLUB
        </div>
        {subtitle && (
          <div
            className={`font-display font-semibold text-vinoy-ink/80 leading-tight truncate ${subSize}`}
          >
            {subtitle}
          </div>
        )}
      </div>
    </>
  )

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="flex items-center gap-3 group"
        title="Back to home"
      >
        {inner}
      </button>
    )
  }
  return <div className="flex items-center gap-3">{inner}</div>
}
