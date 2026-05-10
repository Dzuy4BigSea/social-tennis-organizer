import React from 'react'

/**
 * Line-art elevation of the Vinoy Park Hotel after the 1940s S-141
 * postcard. The intent is recognizable architectural likeness — a
 * guest who knows the hotel should pick out the exact building,
 * not just "a Mediterranean resort." Used as a soft footer
 * watermark, never as a focal element.
 *
 * Composition follows the postcard's east elevation:
 *   - Stepped main mass: shorter four-story left wing, six-story
 *     central block, six-story right wing extending further.
 *   - Arched ground-floor loggia running the full façade.
 *   - Distinctive central tower — square base, cornice belt, open
 *     belfry with three arched openings, pyramidal tile cap with
 *     hipped sides, lantern + finial cross.
 *   - Regular grid of small upper-floor windows; pediment-marked
 *     center bay under the tower.
 *   - Foreground palms placed roughly where the postcard frames
 *     them: a tight cluster front-left, taller singles flanking.
 *
 * Single stroke color via `currentColor`. No fills. Linecap round
 * + linejoin round give the slight softness of pencil over hard
 * CAD output.
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
      <g
        stroke="currentColor"
        strokeWidth="1.4"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      >
        {/* ===== Horizon ===== */}
        <path d="M 0 420 L 110 420" opacity="0.55" />
        <path d="M 215 420 L 1330 420" opacity="0.55" />
        <path d="M 1340 420 L 1400 420" opacity="0.55" />

        {/* ============================================================
            MAIN BUILDING — three masses, stepped roofline.
            Left wing lower (4 stories), central+right block tall
            (6 stories), eastern end same height as central, with a
            small attic step at the very east return.
           ============================================================ */}

        {/* Left wing roofline (shorter) */}
        <path d="M 220 420 L 220 252" />
        {/* Step up to central block */}
        <path d="M 220 252 L 410 252 L 410 196" />
        {/* Long central + right cornice */}
        <path d="M 410 196 L 1180 196" />
        {/* Slight east-end step down */}
        <path d="M 1180 196 L 1180 212 L 1240 212 L 1240 420" />
        <path d="M 220 420 L 1240 420" opacity="0" />

        {/* Cornice line under the parapet — runs the full length
            of each mass, sets the eave shadow. */}
        <path d="M 220 260 L 410 260" opacity="0.55" />
        <path d="M 410 204 L 1180 204" opacity="0.55" />
        <path d="M 1180 220 L 1240 220" opacity="0.55" />

        {/* ===== Floor-line courses on the main block =====
            Six stories: ground (loggia), 2-5 (regular), 6 (top)
            Course lines at: y=240 (top of ground arch), y=270,
            y=298, y=325, y=352, y=380. Lighter opacity for a
            drafted feel rather than a hard edge. */}
        <g opacity="0.42">
          <path d="M 410 240 L 1240 240" />
          <path d="M 410 268 L 1240 268" />
          <path d="M 410 297 L 1240 297" />
          <path d="M 410 326 L 1240 326" />
          <path d="M 410 355 L 1240 355" />
          <path d="M 410 384 L 1240 384" />
        </g>
        {/* Same courses on the lower wing */}
        <g opacity="0.42">
          <path d="M 220 296 L 410 296" />
          <path d="M 220 326 L 410 326" />
          <path d="M 220 356 L 410 356" />
          <path d="M 220 386 L 410 386" />
        </g>

        {/* ===== Window grid — central + right block =====
            Windows are paired tall verticals with small caps,
            spaced roughly evenly across each floor. The geometry
            below stamps a column of 5 upper-floor windows at each
            x-position (skipping the loggia floor). */}
        <g opacity="0.5">
          {centralWindowColumns.map(x => (
            <React.Fragment key={x}>
              {/* 5 stacked window slits */}
              <path d={`M ${x} 248 L ${x} 264`} />
              <path d={`M ${x} 277 L ${x} 293`} />
              <path d={`M ${x} 306 L ${x} 322`} />
              <path d={`M ${x} 335 L ${x} 351`} />
              <path d={`M ${x} 364 L ${x} 380`} />
            </React.Fragment>
          ))}
        </g>

        {/* Window grid — lower-left wing, four stories above the
            loggia. */}
        <g opacity="0.5">
          {leftWingWindowColumns.map(x => (
            <React.Fragment key={x}>
              <path d={`M ${x} 304 L ${x} 320`} />
              <path d={`M ${x} 333 L ${x} 349`} />
              <path d={`M ${x} 363 L ${x} 379`} />
            </React.Fragment>
          ))}
        </g>

        {/* ===== Ground-floor arcade / loggia =====
            Long colonnade of arched openings running the full
            façade. Slightly taller arches at the central entry
            bay marked under the tower. */}
        <g opacity="0.6">
          {/* Left wing arcade — shorter arches */}
          {leftWingArches.map(x => (
            <path
              key={`la-${x}`}
              d={`M ${x - 8} 420 L ${x - 8} 410 Q ${x} 396 ${x + 8} 410 L ${x + 8} 420`}
            />
          ))}
          {/* Central + right arcade — taller arches */}
          {mainArches.map(x => (
            <path
              key={`ma-${x}`}
              d={`M ${x - 9} 420 L ${x - 9} 405 Q ${x} 388 ${x + 9} 405 L ${x + 9} 420`}
            />
          ))}
        </g>

        {/* ===== Central entry bay =====
            The bay directly under the tower has a slightly
            grander, taller arched opening framed by a pediment.
            Centered around x=655. */}
        <path
          d="M 632 420 L 632 400 Q 655 372 678 400 L 678 420"
          opacity="0.75"
        />
        {/* Pediment over the entry */}
        <path
          d="M 624 365 L 655 348 L 686 365"
          opacity="0.6"
        />
        <path d="M 624 365 L 686 365" opacity="0.45" />

        {/* ============================================================
            CENTRAL TOWER — three-part composition.
            Base block (square mass rising above main cornice),
            an open belfry (arched openings), then a pyramidal
            tile cap with hipped slopes capped by a small lantern
            and a finial cross.
           ============================================================ */}

        {/* Tower base — sits centered over the entry bay. Rises
            from y=196 (main roofline) to y=124. */}
        <path d="M 600 196 L 600 124 L 712 124 L 712 196" />

        {/* Mid-cornice belt across the tower base */}
        <path d="M 600 144 L 712 144" opacity="0.5" />

        {/* Window pair on the lower tower face (small) */}
        <g opacity="0.5">
          <path d="M 624 196 L 624 178" />
          <path d="M 644 196 L 644 178" />
          <path d="M 668 196 L 668 178" />
          <path d="M 688 196 L 688 178" />
        </g>

        {/* Belfry section — slightly inset, three arched
            openings. y = 94..124. */}
        <path d="M 612 124 L 612 94 L 700 94 L 700 124" />
        {/* Three belfry arches */}
        <g opacity="0.7">
          <path d="M 624 124 L 624 110 Q 632 100 640 110 L 640 124" />
          <path d="M 652 124 L 652 110 Q 660 100 668 110 L 668 124" />
          <path d="M 680 124 L 680 110 Q 688 100 696 110 L 696 124" />
        </g>

        {/* Pyramidal tile-roofed cap — hipped on all four sides;
            the elevation reads as a triangle with a small flat
            ridge platform for the lantern. */}
        <path d="M 608 94 L 656 50 L 704 94" />
        {/* Suggestion of tile courses on the slope (very light,
            three short ticks per side) */}
        <g opacity="0.32">
          <path d="M 622 86 L 690 86" />
          <path d="M 632 78 L 680 78" />
          <path d="M 642 70 L 670 70" />
        </g>

        {/* Lantern — small open kiosk where the pyramid meets a
            ridge — sits above the cap. */}
        <path d="M 648 50 L 648 38 L 664 38 L 664 50" />
        <path d="M 644 38 Q 656 28 668 38" opacity="0.7" />

        {/* Finial — short shaft + cross. Period photographs of
            the Vinoy show a slim cross on top of the small dome. */}
        <path d="M 656 28 L 656 14" />
        <path d="M 651 19 L 661 19" />

        {/* ============================================================
            FOREGROUND — palms positioned per the postcard.
           ============================================================ */}

        {/* Front-left tight cluster */}
        <PalmTree x={120} baseY={420} height={210} lean={-7} />
        <PalmTree x={158} baseY={420} height={166} lean={5} />
        <PalmTree x={188} baseY={420} height={132} lean={-3} />

        {/* Foreground singletons closer to the entry */}
        <PalmTree x={460} baseY={420} height={92} lean={3} small />
        <PalmTree x={830} baseY={420} height={86} lean={-3} small />

        {/* Right-side palms — taller, frame the east wing */}
        <PalmTree x={1300} baseY={420} height={195} lean={6} />
        <PalmTree x={1340} baseY={420} height={224} lean={-5} />

        {/* Curving entry drive — soft hint at the ground plane */}
        <path
          d="M 200 446 Q 660 470 1180 446"
          opacity="0.28"
        />
        <path
          d="M 240 460 Q 660 482 1140 460"
          opacity="0.18"
        />

        {/* Hedge band across the front lawn — broken so the
            building plinth still reads. */}
        <path
          d="M 240 420 q 14 -6 28 0 q 14 -6 28 0 q 14 -6 28 0 q 14 -6 28 0"
          opacity="0.4"
        />
        <path
          d="M 880 420 q 14 -6 28 0 q 14 -6 28 0 q 14 -6 28 0 q 14 -6 28 0 q 14 -6 28 0"
          opacity="0.4"
        />
      </g>
    </svg>
  )
}

/**
 * Single palm: curved trunk + a small spray of fronds at the top.
 * `lean` skews the tip horizontally so paired palms don't look
 * cloned. `small` collapses the frond spread for the shorter
 * foreground palms that punctuate the lawn.
 */
function PalmTree({ x, baseY, height, lean = 0, small = false }) {
  const tipX = x + lean
  const tipY = baseY - height
  const ctrlX = x + lean * 0.4
  const ctrlY = baseY - height * 0.5
  const f = small ? 0.65 : 1
  return (
    <g>
      {/* trunk */}
      <path d={`M ${x} ${baseY} Q ${ctrlX} ${ctrlY} ${tipX} ${tipY}`} />
      {/* trunk segments — three soft ring marks */}
      <g opacity="0.45">
        <path d={`M ${x - 2 + lean * 0.85} ${baseY - height * 0.75} l 4 0`} />
        <path d={`M ${x - 2 + lean * 0.55} ${baseY - height * 0.5} l 4 0`} />
        <path d={`M ${x - 2 + lean * 0.25} ${baseY - height * 0.25} l 4 0`} />
      </g>
      {/* fronds — six radiating arcs, paired spread */}
      <path d={`M ${tipX} ${tipY} q ${-9 * f} ${-3 * f} ${-24 * f} ${-1 * f}`} />
      <path d={`M ${tipX} ${tipY} q ${9 * f} ${-3 * f} ${24 * f} ${-1 * f}`} />
      <path d={`M ${tipX} ${tipY} q ${-4 * f} ${-11 * f} ${-11 * f} ${-26 * f}`} />
      <path d={`M ${tipX} ${tipY} q ${4 * f} ${-11 * f} ${11 * f} ${-26 * f}`} />
      <path d={`M ${tipX} ${tipY} q ${-15 * f} ${1 * f} ${-30 * f} ${10 * f}`} />
      <path d={`M ${tipX} ${tipY} q ${15 * f} ${1 * f} ${30 * f} ${10 * f}`} />
    </g>
  )
}

// ===== Pre-computed window column positions =====
// Hand-tuned so the window grid lines up with the entry-bay
// pediment under the tower (x ≈ 655) and the cornice steps. Skipped
// columns where the tower passes through (x = 600..712).
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
  // central + right ground floor arcade — denser than the wing
  430, 458, 486, 514, 542, 570, 598,
  /* gap for entry bay around x=655 */
  712, 740, 768, 796, 824, 852, 880, 908,
  936, 964, 992, 1020, 1048, 1076, 1104, 1132,
  1160, 1188, 1216,
]
