import React from 'react'

/**
 * Site-wide attribution. Tucked at the bottom of every screen and
 * the printed view so the credit travels with whatever ends up on
 * paper. Intentionally muted — never the focus of the page.
 */
export default function SiteFooter({ className = '' }) {
  return (
    <footer
      className={`text-center text-xs text-vinoy-ink/50 py-6 px-4 print:py-2 ${className}`}
    >
      Purpose Built by{' '}
      <a
        href="https://bigsea.co"
        target="_blank"
        rel="noopener noreferrer"
        className="text-vinoy-green hover:text-vinoy-greenDark underline underline-offset-2"
      >
        Big Sea
      </a>
    </footer>
  )
}
