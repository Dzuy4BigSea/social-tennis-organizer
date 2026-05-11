import React from 'react'

/**
 * Site-wide attribution. Tucked at the bottom of every screen so the
 * credit travels with whatever ends up on paper. Intentionally muted
 * — never the focus of the page.
 *
 * The Vinoy Park Hotel sketch is a hand-drawn PNG served from /public.
 * `mix-blend-multiply` lets its white background blend into the cream
 * parchment page background, which both removes the white box and
 * tints the ink slightly warmer — closer to a watercolour on aged
 * paper than a pasted-in illustration. Hidden in print: the sketch
 * doesn't render well on toner, and the credit is already small.
 */
export default function SiteFooter({ className = '' }) {
  const src = `${import.meta.env.BASE_URL}vinoy-hotel-sketch.png`
  return (
    <footer
      className={`mt-12 flex flex-col items-center print:mt-0 ${className}`}
    >
      <img
        src={src}
        alt="The Vinoy Park Hotel"
        className="w-full max-w-md sm:max-w-lg mix-blend-multiply select-none print:hidden"
        draggable={false}
      />
      <div className="text-center text-xs text-vinoy-ink/55 px-4 pb-5 sm:pb-6 print:pt-2 print:pb-2">
        <span>
          Purpose Built by{' '}
          <a
            href="https://bigsea.co"
            target="_blank"
            rel="noopener noreferrer"
            className="text-vinoy-green hover:text-vinoy-greenDark underline underline-offset-2"
          >
            Big Sea
          </a>
        </span>
      </div>
    </footer>
  )
}
