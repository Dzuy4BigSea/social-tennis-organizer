import React from 'react'


export default function SiteFooter({ className = '' }) {
  const src = `${import.meta.env.BASE_URL}vinoy-hotel-sketch.png`
  return (
    <footer className={`mt-12 print:mt-4 ${className}`}>
      <div
        aria-hidden
        className="pointer-events-none flex justify-center px-4 print:hidden"
      >
        <img
          src={src}
          alt=""
          className="w-full max-w-lg select-none opacity-80"
          draggable={false}
        />
      </div>
      <div className="text-center text-xs text-vinoy-ink/55 px-4 pb-5 sm:pb-6 print:pb-2">
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
