import React from 'react'

/**
 * Decorative line-art sketch of the Vinoy Park Hotel silhouette,
 * stylized after the 1940s S-141 postcard. Used as a subtle
 * footer background — never as a focal element. The viewBox is
 * deliberately wide (3.75:1) so the building reads as a horizon
 * line behind the page chrome.
 *
 * Single-color, single-stroke. The wrapper passes color via
 * `currentColor`, so the parent can tint it with a `text-*`
 * class and control opacity at the layer level.
 *
 * No interior fills — that's what gives it the architect's-pencil
 * feel rather than a logo. Everything is open paths so the
 * viewer's eye fills in the rest.
 */
export default function VinoyHotelSilhouette({ className = '' }) {
  return (
    <svg
      viewBox="0 0 1200 340"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="presentation"
      aria-hidden="true"
      preserveAspectRatio="xMidYEnd meet"
    >
      <g
        stroke="currentColor"
        strokeWidth="1.1"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Ground line — soft horizon, breaks where palms and
            building meet it so it doesn't read as a hard rule. */}
        <path d="M 0 320 L 90 320" opacity="0.6" />
        <path d="M 200 320 L 1180 320" opacity="0.6" />

        {/* ----- Left wing (lower, pulls back from main block) ----- */}
        <path d="M 200 320 L 200 215 L 460 215 L 460 320" />
        {/* Lower wing floor courses */}
        <path d="M 200 250 L 460 250" opacity="0.55" />
        <path d="M 200 285 L 460 285" opacity="0.55" />
        {/* Suggestion of arched openings on the wing's ground floor */}
        <path d="M 220 320 Q 230 305 240 320" opacity="0.5" />
        <path d="M 260 320 Q 270 305 280 320" opacity="0.5" />
        <path d="M 300 320 Q 310 305 320 320" opacity="0.5" />
        <path d="M 340 320 Q 350 305 360 320" opacity="0.5" />
        <path d="M 380 320 Q 390 305 400 320" opacity="0.5" />
        <path d="M 420 320 Q 430 305 440 320" opacity="0.5" />

        {/* ----- Main central + right block (taller) ----- */}
        <path d="M 460 215 L 460 175 L 1080 175 L 1080 320 L 460 320" />
        {/* Floor courses on the main block — five stories suggested */}
        <path d="M 460 200 L 1080 200" opacity="0.55" />
        <path d="M 460 225 L 1080 225" opacity="0.4" />
        <path d="M 460 252 L 1080 252" opacity="0.4" />
        <path d="M 460 280 L 1080 280" opacity="0.4" />
        <path d="M 460 305 L 1080 305" opacity="0.4" />

        {/* Window-column verticals on the main block. Sparse on
            purpose — too many marks turn the watermark into noise. */}
        <g opacity="0.38">
          {Array.from({ length: 16 }, (_, i) => 480 + i * 38).map(x => (
            <path key={x} d={`M ${x} 200 L ${x} 305`} />
          ))}
        </g>

        {/* Ground floor arches on the main block */}
        <g opacity="0.5">
          {Array.from({ length: 14 }, (_, i) => 490 + i * 42).map(x => (
            <path key={x} d={`M ${x - 8} 320 Q ${x} 302 ${x + 8} 320`} />
          ))}
        </g>

        {/* ----- Central tower ----- */}
        {/* Tower base — rises above the main roofline */}
        <path d="M 600 175 L 600 100 L 720 100 L 720 175" />
        {/* Tower interior course (cornice line) */}
        <path d="M 600 115 L 720 115" opacity="0.5" />
        {/* Tower windows — paired arched openings */}
        <g opacity="0.5">
          <path d="M 624 175 Q 632 162 640 175" />
          <path d="M 656 175 Q 664 162 672 175" />
          <path d="M 688 175 Q 696 162 704 175" />
          <path d="M 624 153 Q 632 140 640 153" />
          <path d="M 656 153 Q 664 140 672 153" />
          <path d="M 688 153 Q 696 140 704 153" />
        </g>

        {/* Stepped attic */}
        <path d="M 624 100 L 624 70 L 696 70 L 696 100" />

        {/* Small cupola / dome */}
        <path d="M 632 70 L 632 56 L 688 56 L 688 70" />
        <path d="M 636 56 Q 660 32 684 56" />

        {/* Finial + flag pole */}
        <path d="M 660 32 L 660 10" />
        <circle cx="660" cy="8" r="2.4" />

        {/* ----- Palm trees ----- */}
        <PalmTree x={120} baseY={320} height={170} lean={-6} />
        <PalmTree x={170} baseY={320} height={130} lean={4} />

        <PalmTree x={1110} baseY={320} height={155} lean={5} />
        <PalmTree x={1155} baseY={320} height={185} lean={-4} />

        {/* Stray hedge / shrub line in the foreground — soft,
            broken so it doesn't compete with the building edge. */}
        <path
          d="M 470 320 q 18 -8 36 0 q 18 -8 36 0 q 18 -8 36 0"
          opacity="0.4"
        />
        <path
          d="M 720 320 q 18 -8 36 0 q 18 -8 36 0 q 18 -8 36 0"
          opacity="0.4"
        />

        {/* Curving entry road suggestion in the foreground —
            mostly off-canvas, just a hint at the bottom. */}
        <path
          d="M 200 338 Q 660 350 1080 338"
          opacity="0.3"
        />
      </g>
    </svg>
  )
}

/**
 * Single palm: curved trunk + a small spray of fronds at the top.
 * `lean` skews the tip horizontally so paired palms don't look
 * cloned — real palms always lean a touch.
 */
function PalmTree({ x, baseY, height, lean = 0 }) {
  const tipX = x + lean
  const tipY = baseY - height
  const ctrlX = x + lean * 0.4
  const ctrlY = baseY - height * 0.5
  return (
    <g>
      {/* trunk (slightly curved) */}
      <path d={`M ${x} ${baseY} Q ${ctrlX} ${ctrlY} ${tipX} ${tipY}`} />
      {/* fronds — six radiating arcs, none symmetric */}
      <path d={`M ${tipX} ${tipY} q -8 -3 -22 -1`} />
      <path d={`M ${tipX} ${tipY} q 8 -3 22 -1`} />
      <path d={`M ${tipX} ${tipY} q -4 -10 -10 -22`} />
      <path d={`M ${tipX} ${tipY} q 4 -10 10 -22`} />
      <path d={`M ${tipX} ${tipY} q -14 1 -26 9`} />
      <path d={`M ${tipX} ${tipY} q 14 1 26 9`} />
    </g>
  )
}
