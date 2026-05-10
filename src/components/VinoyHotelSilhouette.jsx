import React from 'react'

/**
 * Stylized pen-and-ink sketch of the Vinoy Park Hotel facade.
 * Used as a soft footer watermark — never as a focal element.
 *
 * The "sketch" feel comes from three things together:
 *
 *   1. A subtle SVG turbulence + displacement filter that wobbles
 *      every line a little. Straight architectural strokes turn
 *      into something that reads as drawn by hand, not a CAD plot.
 *      Trade-off: the filter rasterizes the layer; on retina the
 *      lines look great, on really old hardware it's a tad
 *      blurrier than vector but still fine. Cheap to render once.
 *
 *   2. Two stroke weights — a heavier outline on the building's
 *      main silhouette and tower mass, and a lighter weight on
 *      window verticals, hatching, palm fronds, and ground
 *      decoration. Gives the drawing an inked-then-detailed feel.
 *
 *   3. Diagonal hatching on the pyramidal tile cap and on the
 *      shadowed left face of the tower. That's what makes the
 *      drawing feel like a sketch rather than an outline.
 *
 * Composition still follows the postcard / modern photo of the
 * east elevation: stepped main mass, central arched porte-
 * cochère under the iconic three-tier tower, palm clusters
 * flanking. The geometry is intentionally still recognizable as
 * the Vinoy — the wobble is what gives it character, not the
 * shapes.
 */
export default function VinoyHotelSilhouette({ className = '' }) {
  return (
    <svg
      viewBox="0 0 1400 460"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="presentation"
      aria-hidden="true"
      preserveAspectRatio="xMidYEnd meet"
    >
      <defs>
        {/* Hand-drawn wobble. Low base frequency keeps the wobble
            broad (fewer, longer waves) so straight lines look
            slightly wavy rather than spiky. Scale 1.4 is enough to
            see, not so much that arches lose their shape. */}
        <filter id="vinoy-sketch" x="-2%" y="-2%" width="104%" height="106%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.022"
            numOctaves="2"
            seed="7"
            result="noise"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="noise"
            scale="1.4"
          />
        </filter>
      </defs>

      <g
        filter="url(#vinoy-sketch)"
        stroke="currentColor"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      >
        {/* ===== Horizon (light) ===== */}
        <g strokeWidth="0.9" opacity="0.55">
          <path d="M 0 420 L 110 420" />
          <path d="M 215 420 L 1330 420" />
          <path d="M 1340 420 L 1400 420" />
        </g>

        {/* ============================================================
            MAIN BUILDING — stepped mass, heavier outline.
           ============================================================ */}
        <g strokeWidth="1.7">
          {/* Left wing (lower) */}
          <path d="M 220 420 L 220 252 L 410 252" />
          {/* Step up to the central + right block */}
          <path d="M 410 252 L 410 196 L 1180 196" />
          {/* East-end return, slight step down */}
          <path d="M 1180 196 L 1180 212 L 1240 212 L 1240 420" />
        </g>

        {/* ===== Cornice + parapet (medium) ===== */}
        <g strokeWidth="1.05" opacity="0.7">
          <path d="M 220 260 L 410 260" />
          <path d="M 410 204 L 1180 204" />
          <path d="M 1180 220 L 1240 220" />
        </g>

        {/* ===== Floor courses — main block, six stories ===== */}
        <g strokeWidth="0.7" opacity="0.45">
          <path d="M 410 240 L 1240 240" />
          <path d="M 410 268 L 1240 268" />
          <path d="M 410 297 L 1240 297" />
          <path d="M 410 326 L 1240 326" />
          <path d="M 410 355 L 1240 355" />
          <path d="M 410 384 L 1240 384" />
        </g>
        {/* Floor courses — left wing */}
        <g strokeWidth="0.7" opacity="0.45">
          <path d="M 220 296 L 410 296" />
          <path d="M 220 326 L 410 326" />
          <path d="M 220 356 L 410 356" />
          <path d="M 220 386 L 410 386" />
        </g>

        {/* ===== Window verticals — main block ===== */}
        <g strokeWidth="0.85" opacity="0.55">
          {centralWindowColumns.map(x => (
            <React.Fragment key={x}>
              <path d={`M ${x} 248 L ${x} 264`} />
              <path d={`M ${x} 277 L ${x} 293`} />
              <path d={`M ${x} 306 L ${x} 322`} />
              <path d={`M ${x} 335 L ${x} 351`} />
              <path d={`M ${x} 364 L ${x} 380`} />
            </React.Fragment>
          ))}
        </g>
        {/* Window verticals — left wing */}
        <g strokeWidth="0.85" opacity="0.55">
          {leftWingWindowColumns.map(x => (
            <React.Fragment key={x}>
              <path d={`M ${x} 304 L ${x} 320`} />
              <path d={`M ${x} 333 L ${x} 349`} />
              <path d={`M ${x} 363 L ${x} 379`} />
            </React.Fragment>
          ))}
        </g>

        {/* ===== Ground-floor arcade ===== */}
        <g strokeWidth="0.95" opacity="0.7">
          {leftWingArches.map(x => (
            <path
              key={`la-${x}`}
              d={`M ${x - 8} 420 L ${x - 8} 410 Q ${x} 396 ${x + 8} 410 L ${x + 8} 420`}
            />
          ))}
          {mainArches.map(x => (
            <path
              key={`ma-${x}`}
              d={`M ${x - 9} 420 L ${x - 9} 405 Q ${x} 388 ${x + 9} 405 L ${x + 9} 420`}
            />
          ))}
        </g>

        {/* ===== Central porte-cochère =====
            The big covered entry visible in modern photos —
            arched portico extending forward of the building line,
            three openings with columns suggested. This is the
            piece that says "Vinoy entrance" instantly. */}
        <g strokeWidth="1.4">
          {/* Portico outer outline — extends below the building
              ground line so it reads as projecting forward. */}
          <path d="M 612 420 L 612 384 Q 655 348 698 384 L 698 420" />
          {/* Column verticals */}
          <path d="M 632 420 L 632 388" opacity="0.85" />
          <path d="M 678 420 L 678 388" opacity="0.85" />
        </g>
        <g strokeWidth="0.9" opacity="0.7">
          {/* Three small arched openings inside the portico */}
          <path d="M 622 420 L 622 410 Q 632 400 642 410 L 642 420" />
          <path d="M 645 420 L 645 408 Q 655 398 665 408 L 665 420" />
          <path d="M 668 420 L 668 410 Q 678 400 688 410 L 688 420" />
        </g>

        {/* ============================================================
            TOWER — three parts: square base, belfry, pyramidal cap.
            Heavier outline since this is the icon.
           ============================================================ */}
        <g strokeWidth="1.7">
          {/* Tower base */}
          <path d="M 600 196 L 600 124 L 712 124 L 712 196" />
          {/* Belfry (slightly inset) */}
          <path d="M 612 124 L 612 94 L 700 94 L 700 124" />
          {/* Pyramidal tile cap */}
          <path d="M 608 94 L 656 50 L 704 94" />
        </g>

        {/* Tower cornice belt */}
        <path d="M 600 144 L 712 144" strokeWidth="0.95" opacity="0.6" />

        {/* Tower base — small upper-floor windows */}
        <g strokeWidth="0.85" opacity="0.55">
          <path d="M 624 196 L 624 178" />
          <path d="M 644 196 L 644 178" />
          <path d="M 668 196 L 668 178" />
          <path d="M 688 196 L 688 178" />
        </g>

        {/* Belfry arched openings */}
        <g strokeWidth="1.05" opacity="0.85">
          <path d="M 624 124 L 624 110 Q 632 100 640 110 L 640 124" />
          <path d="M 652 124 L 652 110 Q 660 100 668 110 L 668 124" />
          <path d="M 680 124 L 680 110 Q 688 100 696 110 L 696 124" />
        </g>

        {/* Tile hatching on the pyramidal cap — diagonal strokes
            running with the slope on each side. This is the
            single biggest "this is a sketch" tell. */}
        <g strokeWidth="0.8" opacity="0.55">
          {/* Left slope hatch lines (perpendicular to slope) */}
          <path d="M 615 88 L 624 78" />
          <path d="M 622 80 L 630 70" />
          <path d="M 630 72 L 637 62" />
          <path d="M 638 64 L 644 54" />
          {/* Right slope hatch lines */}
          <path d="M 668 54 L 674 64" />
          <path d="M 675 62 L 682 72" />
          <path d="M 682 70 L 689 80" />
          <path d="M 690 78 L 697 88" />
          {/* A couple of horizontal tile-course suggestions */}
          <path d="M 625 80 L 687 80" opacity="0.6" />
          <path d="M 635 70 L 677 70" opacity="0.6" />
        </g>

        {/* Lantern + finial */}
        <g strokeWidth="1.3">
          <path d="M 648 50 L 648 38 L 664 38 L 664 50" />
          <path d="M 644 38 Q 656 28 668 38" />
          <path d="M 656 28 L 656 14" />
          <path d="M 651 19 L 661 19" />
        </g>

        {/* Shadow hatching on the building's left face — short
            diagonal strokes suggesting a directional shadow on the
            stepped mass below the cornice. Sketch tell. */}
        <g strokeWidth="0.7" opacity="0.32">
          <path d="M 416 200 L 423 195" />
          <path d="M 416 220 L 425 211" />
          <path d="M 416 240 L 425 231" />
          <path d="M 416 260 L 425 251" />
          <path d="M 416 280 L 425 271" />
          <path d="M 416 300 L 425 291" />
          <path d="M 416 320 L 425 311" />
          <path d="M 416 340 L 425 331" />
          <path d="M 416 360 L 425 351" />
          <path d="M 416 380 L 425 371" />
          <path d="M 416 400 L 425 391" />
        </g>

        {/* Shadow hatching under the tower base — soft depth cue
            tucked beneath the cornice. */}
        <g strokeWidth="0.7" opacity="0.32">
          <path d="M 605 148 L 614 142" />
          <path d="M 615 148 L 624 142" />
          <path d="M 625 148 L 634 142" />
          <path d="M 635 148 L 644 142" />
          <path d="M 645 148 L 654 142" />
          <path d="M 655 148 L 664 142" />
          <path d="M 665 148 L 674 142" />
          <path d="M 675 148 L 684 142" />
          <path d="M 685 148 L 694 142" />
          <path d="M 695 148 L 704 142" />
        </g>

        {/* ============================================================
            FOREGROUND — palms with character.
           ============================================================ */}
        <g strokeWidth="1.25">
          {/* Front-left tight cluster — three palms of varied
              height matching the postcard's left foreground stand. */}
          <PalmTree x={120} baseY={420} height={210} lean={-7} />
          <PalmTree x={158} baseY={420} height={166} lean={5} />
          <PalmTree x={188} baseY={420} height={132} lean={-3} />

          {/* Foreground singletons closer to the entry */}
          <PalmTree x={460} baseY={420} height={92} lean={3} small />
          <PalmTree x={830} baseY={420} height={86} lean={-3} small />

          {/* Right side — taller pair frames the east wing */}
          <PalmTree x={1300} baseY={420} height={195} lean={6} />
          <PalmTree x={1340} baseY={420} height={224} lean={-5} />
        </g>

        {/* Curving entry drive — soft hint at the ground plane */}
        <g strokeWidth="0.7">
          <path d="M 200 446 Q 660 470 1180 446" opacity="0.35" />
          <path d="M 240 460 Q 660 482 1140 460" opacity="0.22" />
        </g>

        {/* Hedge band across the front lawn — broken so the
            building plinth still reads. Sketchy little waves. */}
        <g strokeWidth="0.8" opacity="0.5">
          <path d="M 240 420 q 14 -7 28 0 q 14 -7 28 0 q 14 -7 28 0 q 14 -7 28 0" />
          <path d="M 880 420 q 14 -7 28 0 q 14 -7 28 0 q 14 -7 28 0 q 14 -7 28 0 q 14 -7 28 0" />
        </g>
      </g>
    </svg>
  )
}

/**
 * Single palm: curved trunk, three trunk ring marks, and a six-
 * frond crown plus two hanging tip fronds. `lean` skews the tip
 * horizontally so adjacent palms don't look cloned. `small`
 * shrinks the frond spread for the shorter foreground palms.
 */
function PalmTree({ x, baseY, height, lean = 0, small = false }) {
  const tipX = x + lean
  const tipY = baseY - height
  const ctrlX = x + lean * 0.4
  const ctrlY = baseY - height * 0.5
  const f = small ? 0.65 : 1
  return (
    <g>
      {/* trunk — slight curve gives a wind-leaned feel */}
      <path d={`M ${x} ${baseY} Q ${ctrlX} ${ctrlY} ${tipX} ${tipY}`} />
      {/* three ring marks down the trunk for character */}
      <g opacity="0.45">
        <path d={`M ${x - 2 + lean * 0.85} ${baseY - height * 0.78} l 4 0`} />
        <path d={`M ${x - 2 + lean * 0.55} ${baseY - height * 0.52} l 4 0`} />
        <path d={`M ${x - 2 + lean * 0.25} ${baseY - height * 0.26} l 4 0`} />
      </g>
      {/* crown — six fronds spreading out, asymmetric */}
      <path d={`M ${tipX} ${tipY} q ${-9 * f} ${-3 * f} ${-26 * f} ${-1 * f}`} />
      <path d={`M ${tipX} ${tipY} q ${10 * f} ${-3 * f} ${27 * f} ${-1 * f}`} />
      <path d={`M ${tipX} ${tipY} q ${-4 * f} ${-12 * f} ${-12 * f} ${-29 * f}`} />
      <path d={`M ${tipX} ${tipY} q ${5 * f} ${-12 * f} ${13 * f} ${-30 * f}`} />
      <path d={`M ${tipX} ${tipY} q ${-15 * f} ${1 * f} ${-32 * f} ${10 * f}`} />
      <path d={`M ${tipX} ${tipY} q ${16 * f} ${1 * f} ${33 * f} ${10 * f}`} />
      {/* Two small hanging frond tips for character */}
      <path
        d={`M ${tipX - 22 * f} ${tipY + 8 * f} q -3 4 -4 9`}
        opacity="0.7"
      />
      <path
        d={`M ${tipX + 22 * f} ${tipY + 8 * f} q 3 4 4 9`}
        opacity="0.7"
      />
    </g>
  )
}

// ===== Pre-computed window column positions =====
// Tuned so the grid lines up with the porte-cochère under the
// tower (x ≈ 655) and stops where the tower mass passes through.
const centralWindowColumns = [
  430, 452, 474, 496, 518, 540, 562, 584,
  /* tower mass occupies 600..712 */
  724, 746, 768, 790, 812, 834, 856, 878, 900,
  922, 944, 966, 988, 1010, 1032, 1054, 1076,
  1098, 1120, 1142, 1164, 1196, 1218,
]
const leftWingWindowColumns = [
  236, 258, 280, 302, 324, 346, 368, 390,
]

// ===== Pre-computed arcade arch x-centers =====
const leftWingArches = [
  236, 264, 292, 320, 348, 376,
]
const mainArches = [
  430, 458, 486, 514, 542, 570, 598,
  /* gap for porte-cochère around x=655 */
  712, 740, 768, 796, 824, 852, 880, 908,
  936, 964, 992, 1020, 1048, 1076, 1104, 1132,
  1160, 1188, 1216,
]
