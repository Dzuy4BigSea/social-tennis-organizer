import React from 'react'

/**
 * Two things, rendered together so they can travel as one site-wide
 * footer treatment:
 *
 * 1. A fixed watermark of the Vinoy Park Hotel sketch, anchored to
 *    the viewport bottom and lifted a touch off the edge. It's a
 *    detail, not a hero — opacity 75 % and a negative z-index so
 *    every page's content (the login card, the home modules, the
 *    live board) paints cleanly on top. `mix-blend-multiply` drops
 *    the PNG's white background into the cream parchment so it
 *    doesn't read as a pasted-in rectangle. Hidden in print —
 *    toner doesn't render the sketch well and the parchment is
 *    stripped on paper anyway.
 *
 * 2. The "Purpose Built by Big Sea" attribution, in the normal
 *    document flow so it travels with whatever's printed.
 */
export default function SiteFooter({ className = '' }) {
  const src = `${import.meta.env.BASE_URL}vinoy-hotel-sketch.png`
  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 bottom-4 sm:bottom-6 flex justify-center -z-10 print:hidden"
      >
        <img
          src={src}
          alt=""
          className="w-full max-w-md sm:max-w-lg mix-blend-multiply opacity-75 select-none"
          draggable={false}
        />
      </div>
      <footer className={`mt-12 print:mt-0 ${className}`}>
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
    </>
  )
}
