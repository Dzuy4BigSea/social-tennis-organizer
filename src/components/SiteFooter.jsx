import React from 'react'
import VinoyHotelSilhouette from './VinoyHotelSilhouette.jsx'

/**
 * Site-wide attribution. Tucked at the bottom of every screen and
 * the printed view so the credit travels with whatever ends up on
 * paper. Intentionally muted — never the focus of the page.
 *
 * On screen, a faint line-art sketch of the Vinoy Park Hotel sits
 * behind the attribution as a subtle "anchored" detail. It's not
 * meant to be obvious; it's the kind of touch a guest might only
 * notice on the third visit. Hidden in print (the postcard image
 * doesn't render well on toner, and the credit's already small).
 */
export default function SiteFooter({ className = '' }) {
  return (
    <footer
      className={`relative overflow-hidden mt-12 print:mt-0 ${className}`}
    >
      {/* Decorative background — pointer-events disabled so the
          attribution link stays clickable through the SVG layer.
          The wrapper holds the silhouette flush with the footer's
          bottom edge; aspect ratio of the SVG (~3.5:1) drives how
          tall the footer ends up at any given width. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center select-none opacity-[0.22] print:hidden"
      >
        <VinoyHotelSilhouette
          className="w-full max-w-2xl sm:max-w-3xl lg:max-w-4xl text-vinoy-green"
        />
      </div>

      {/* Inner div carries the attribution. The min-height pushes
          the footer tall enough to display the full silhouette
          (incl. tower finial) without overflow-hidden trimming the
          top — the SVG's intrinsic aspect is ~3:1 so width drives
          height directly. */}
      <div className="relative text-center text-xs text-vinoy-ink/55 px-4 min-h-[14rem] sm:min-h-[16rem] lg:min-h-[19rem] flex items-end justify-center pb-5 sm:pb-6 print:min-h-0 print:pt-2 print:pb-2">
        {/* Wrap the attribution in a single inline span so the text
            and the link don't become separate flex items — that's
            what was collapsing the space between "by" and "Big
            Sea" on screen. */}
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
