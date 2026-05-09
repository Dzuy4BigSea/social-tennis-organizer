import React from 'react'

/**
 * Vinoy Club ornamental separator: two thin gold lines flanking a
 * small diamond. Lifted from the club's marketing site where it
 * appears under section headings ("Upcoming Events", etc.). Works
 * across whatever width the parent allows since the lines are
 * flex-1.
 *
 * Decorative — `aria-hidden` keeps it out of the screen-reader flow.
 */
export default function OrnamentalRule({ className = '' }) {
  return (
    <div
      className={`flex items-center justify-center gap-2 ${className}`}
      aria-hidden
    >
      <div className="h-px flex-1 bg-gradient-to-r from-transparent to-vinoy-gold/70" />
      <svg
        width="8"
        height="8"
        viewBox="0 0 8 8"
        className="shrink-0 text-vinoy-gold"
      >
        <polygon points="4,0 8,4 4,8 0,4" fill="currentColor" />
      </svg>
      <div className="h-px flex-1 bg-gradient-to-l from-transparent to-vinoy-gold/70" />
    </div>
  )
}
