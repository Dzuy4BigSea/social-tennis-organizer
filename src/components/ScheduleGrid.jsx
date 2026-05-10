import React, { useMemo, useState } from 'react'
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  DragOverlay,
} from '@dnd-kit/core'
import {
  resolveSlot,
  entrantLabel as bracketEntrantLabel,
} from '../utils/bracket.js'
import { resolveFinalsSlot, placeholderLabel } from '../utils/groups.js'

/**
 * Court × time scheduling grid for the whole event. The pro picks a
 * day, courts run as rows, time slots as columns, and matches are
 * draggable chips placed in cells. Unscheduled matches park in a
 * tray below the grid; dragging a chip out of the grid puts it
 * back there.
 *
 * Rendering notes:
 *   - Courts come from `tournament.courts`. Divisions don't have
 *     to use any particular court — they just own matches; the
 *     match's `court` field decides which row it lands in.
 *   - Time range comes from `tournament.startTime` / `endTime`
 *     when set, with a sensible default (08:00-21:00) otherwise.
 *   - Slot width is `tournament.slotMinutes`. Auto-fill places
 *     matches at this spacing.
 *
 * Conflict cues:
 *   - Two matches in the same cell → both chips render with a red
 *     ring so the pro sees the double-booking.
 *   - A pair / entrant scheduled in two cells at the same time on
 *     different courts → both chips warn (yellow ring).
 *
 * Data flow: each chip is `match-<divisionId>-<matchId>` (or
 * `match-<divisionId>-finals-<matchId>` for finals stage). On drop
 * we dispatch SET_MATCH_SCHEDULE / SET_FINALS_MATCH_SCHEDULE with
 * the cell's court and computed scheduledAt.
 */
export default function ScheduleGrid({ state, dispatch, ifAuthed }) {
  const tournament = state.tournament || {}
  const courts = useMemo(
    () => (tournament.courts && tournament.courts.length > 0 ? tournament.courts : ['Court 1']),
    [tournament.courts]
  )
  const slotMinutes = tournament.slotMinutes || 30

  // Day dimension. Default to event start date if set, else today.
  const [dayIso, setDayIso] = useState(
    tournament.startDate || todayIsoLocal()
  )

  // Time window to render. Pulls from event start/end if those are
  // set; otherwise a generous default that covers most club hours.
  const startHHMM = tournament.startTime || '08:00'
  const endHHMM = tournament.endTime || '21:00'
  const slots = useMemo(
    () => buildSlots(dayIso, startHHMM, endHHMM, slotMinutes),
    [dayIso, startHHMM, endHHMM, slotMinutes]
  )

  // Pull every match across every division into one flat catalog
  // with display metadata attached so we don't have to rebuild
  // labels per render in each cell.
  const catalog = useMemo(
    () => buildMatchCatalog(state.divisions || []),
    [state.divisions]
  )

  // Bucket matches by cell key. We only place a match in a cell
  // when its scheduledAt's date matches the selected day AND it
  // has a court assignment. Anything else goes to the tray.
  const placement = useMemo(
    () => placeMatches(catalog, dayIso, slots, courts),
    [catalog, dayIso, slots, courts]
  )

  const [draggingId, setDraggingId] = useState(null)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  )

  function handleDragEnd({ active, over }) {
    setDraggingId(null)
    if (!active || !over) return
    const m = catalog.byId.get(active.id)
    if (!m) return
    if (over.id === 'tray') {
      ifAuthed(() => dispatchSchedule(dispatch, m, { scheduledAt: null, court: null }))
      return
    }
    // Cell ids are encoded `cell:<court>::<slotIso>` so we can
    // reconstruct the assignment without lookups.
    if (typeof over.id === 'string' && over.id.startsWith('cell:')) {
      const [court, slotIso] = over.id.slice('cell:'.length).split('::')
      ifAuthed(() =>
        dispatchSchedule(dispatch, m, { scheduledAt: slotIso, court })
      )
    }
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={(e) => setDraggingId(e.active?.id || null)}
      onDragCancel={() => setDraggingId(null)}
      onDragEnd={handleDragEnd}
    >
      <section className="bg-white rounded-2xl border border-vinoy-border p-4 mb-4 shadow-sm">
        <header className="flex items-baseline justify-between mb-3 flex-wrap gap-2">
          <h2 className="font-display text-xl font-bold text-vinoy-green">
            Schedule grid
          </h2>
          <div className="flex items-center gap-2 flex-wrap">
            <label className="text-xs text-vinoy-ink/70 font-semibold">
              Day
            </label>
            <input
              type="date"
              value={dayIso}
              onChange={(e) => setDayIso(e.target.value)}
              className="border border-vinoy-border rounded-lg px-2 py-1 text-sm"
            />
          </div>
        </header>

        <AutoFillStrip
          divisions={state.divisions}
          courts={courts}
          slotMinutes={slotMinutes}
          dayIso={dayIso}
          startHHMM={startHHMM}
          dispatch={dispatch}
          ifAuthed={ifAuthed}
        />

        <GridBody
          courts={courts}
          slots={slots}
          placement={placement}
          slotMinutes={slotMinutes}
        />

        <Tray matches={placement.tray} />

        <p className="text-xs text-vinoy-ink/55 mt-3">
          Drag a match chip onto a slot to schedule it; drag back
          to the tray to unschedule. Red ring = two matches on the
          same court at the same time. Yellow ring = a player is
          scheduled in two places at once.
        </p>
      </section>

      <DragOverlay dropAnimation={null}>
        {draggingId ? (
          <MatchChipPresentation
            match={catalog.byId.get(draggingId)}
            isOverlay
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}

// ============================================================
// AUTO-FILL — pro picks a division and a start time, the reducer
// distributes its unscheduled matches across the chosen courts.
// ============================================================

function AutoFillStrip({
  divisions,
  courts,
  slotMinutes,
  dayIso,
  startHHMM,
  dispatch,
  ifAuthed,
}) {
  const eligible = (divisions || []).filter(
    d =>
      d.locked && ((d.matches?.length || 0) + (d.finalsMatches?.length || 0)) > 0
  )
  const [open, setOpen] = useState(false)
  const [divId, setDivId] = useState(eligible[0]?.id || '')
  const [startAt, setStartAt] = useState(`${dayIso}T${startHHMM}`)
  const [courtMask, setCourtMask] = useState(() => new Set(courts))
  const [overwrite, setOverwrite] = useState(false)

  // Refresh defaults if the inputs change (day changed, courts
  // edited, etc.) — but only when the panel is closed so we don't
  // stomp the pro's in-progress selection.
  React.useEffect(() => {
    if (!open) {
      setStartAt(`${dayIso}T${startHHMM}`)
      setCourtMask(new Set(courts))
      if (eligible.length > 0 && !eligible.find(d => d.id === divId)) {
        setDivId(eligible[0].id)
      }
    }
  }, [open, dayIso, startHHMM, courts, eligible, divId])

  if (eligible.length === 0) return null

  function toggleCourt(c) {
    const next = new Set(courtMask)
    if (next.has(c)) next.delete(c)
    else next.add(c)
    setCourtMask(next)
  }

  function run() {
    const selected = courts.filter(c => courtMask.has(c))
    if (selected.length === 0) {
      alert('Pick at least one court for auto-fill.')
      return
    }
    ifAuthed(() => {
      dispatch({
        type: 'AUTO_FILL_DIVISION_SCHEDULE',
        payload: {
          divisionId: divId,
          startAt,
          courts: selected,
          slotMinutes,
          overwrite,
        },
      })
      setOpen(false)
    })
  }

  return (
    <div className="bg-vinoy-cream rounded-xl px-3 py-2 mb-3">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-2 text-left"
      >
        <div>
          <div className="text-sm font-semibold text-vinoy-ink/80">
            Auto-fill schedule
          </div>
          <div className="text-xs text-vinoy-ink/60">
            Distribute a division's matches across courts at fixed
            intervals. Drag exceptions afterwards.
          </div>
        </div>
        <span className="text-vinoy-ink/40 text-lg">{open ? '▾' : '▸'}</span>
      </button>
      {open && (
        <div className="mt-3 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <label className="text-xs font-semibold text-vinoy-ink/70 shrink-0">
              Division
            </label>
            <select
              value={divId}
              onChange={(e) => setDivId(e.target.value)}
              className="flex-1 min-w-0 border border-vinoy-border rounded-lg px-2 py-1 text-sm bg-white"
            >
              {eligible.map(d => (
                <option key={d.id} value={d.id}>
                  {d.name || 'Division'}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <label className="text-xs font-semibold text-vinoy-ink/70 shrink-0">
              Start
            </label>
            <input
              type="datetime-local"
              value={startAt}
              onChange={(e) => setStartAt(e.target.value)}
              className="border border-vinoy-border rounded-lg px-2 py-1 text-sm"
            />
          </div>
          <div>
            <div className="text-xs font-semibold text-vinoy-ink/70 mb-1">
              Courts
            </div>
            <div className="flex flex-wrap gap-1.5">
              {courts.map(c => {
                const active = courtMask.has(c)
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => toggleCourt(c)}
                    className={[
                      'rounded-full border-2 transition font-semibold px-3 py-1 text-xs',
                      active
                        ? 'bg-vinoy-green border-vinoy-green text-white'
                        : 'bg-white border-vinoy-border text-vinoy-ink/70 hover:border-vinoy-green',
                    ].join(' ')}
                  >
                    {c}
                  </button>
                )
              })}
            </div>
          </div>
          <label className="flex items-center gap-2 text-xs text-vinoy-ink/70">
            <input
              type="checkbox"
              checked={overwrite}
              onChange={(e) => setOverwrite(e.target.checked)}
              className="accent-vinoy-green"
            />
            Overwrite matches that are already scheduled
          </label>
          <button
            onClick={run}
            className="w-full px-3 py-2 rounded-xl bg-vinoy-green text-white font-semibold text-sm"
          >
            Run auto-fill
          </button>
        </div>
      )}
    </div>
  )
}

// ============================================================
// GRID — courts on rows, time slots on columns. Each cell is
// droppable; chips inside cells are draggable.
// ============================================================

function GridBody({ courts, slots, placement, slotMinutes }) {
  return (
    <div className="overflow-x-auto -mx-4 px-4">
      <div
        className="grid gap-px bg-vinoy-border rounded-xl overflow-hidden border border-vinoy-border min-w-[640px]"
        style={{
          gridTemplateColumns: `9rem repeat(${slots.length}, minmax(7rem, 1fr))`,
        }}
      >
        {/* corner */}
        <div className="bg-vinoy-cream px-3 py-2 text-[11px] uppercase tracking-wider font-semibold text-vinoy-ink/60 sticky left-0 z-10">
          Court / time
        </div>
        {/* time headers */}
        {slots.map(s => (
          <div
            key={s.iso}
            className="bg-vinoy-cream px-2 py-2 text-[11px] font-mono text-center text-vinoy-ink/70"
          >
            {s.label}
          </div>
        ))}
        {/* one row per court */}
        {courts.map(court => (
          <React.Fragment key={court}>
            <div className="bg-white px-3 py-2 text-sm font-semibold text-vinoy-green sticky left-0 z-10 border-r border-vinoy-border">
              {court}
            </div>
            {slots.map(s => {
              const cellKey = `cell:${court}::${s.iso}`
              const matches = placement.cells.get(cellKey) || []
              return (
                <Cell
                  key={cellKey}
                  cellKey={cellKey}
                  matches={matches}
                  conflictPairs={placement.playerConflicts}
                />
              )
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  )
}

function Cell({ cellKey, matches, conflictPairs }) {
  const { setNodeRef, isOver } = useDroppable({ id: cellKey })
  const courtConflict = matches.length > 1
  return (
    <div
      ref={setNodeRef}
      className={[
        'bg-white min-h-[3.25rem] p-1 flex flex-col gap-1 transition',
        isOver ? 'ring-2 ring-vinoy-green ring-inset' : '',
      ].join(' ')}
    >
      {matches.map(m => (
        <MatchChip
          key={m.id}
          match={m}
          courtConflict={courtConflict}
          playerConflict={conflictPairs.has(m.id)}
        />
      ))}
    </div>
  )
}

function Tray({ matches }) {
  const { setNodeRef, isOver } = useDroppable({ id: 'tray' })
  return (
    <div
      ref={setNodeRef}
      className={[
        'mt-3 rounded-xl border-2 border-dashed p-3 transition',
        isOver
          ? 'border-vinoy-green bg-vinoy-cream'
          : 'border-vinoy-border bg-white',
      ].join(' ')}
    >
      <div className="text-xs font-semibold text-vinoy-ink/70 mb-2 flex items-center justify-between">
        <span>Unscheduled matches</span>
        <span className="text-vinoy-ink/50">{matches.length}</span>
      </div>
      {matches.length === 0 ? (
        <p className="text-xs text-vinoy-ink/50 italic">
          Everything's placed. Drag a chip out of the grid here to
          unschedule it.
        </p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {matches.map(m => (
            <MatchChip key={m.id} match={m} />
          ))}
        </div>
      )}
    </div>
  )
}

// ============================================================
// MATCH CHIP — draggable, renders sides + division pill.
// ============================================================

function MatchChip({ match, courtConflict = false, playerConflict = false }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: match.id,
  })
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={{ opacity: isDragging ? 0.4 : 1 }}
      className="touch-none"
    >
      <MatchChipPresentation
        match={match}
        courtConflict={courtConflict}
        playerConflict={playerConflict}
      />
    </div>
  )
}

function MatchChipPresentation({
  match,
  courtConflict = false,
  playerConflict = false,
  isOverlay = false,
}) {
  if (!match) return null
  const ring = courtConflict
    ? 'ring-2 ring-red-500'
    : playerConflict
      ? 'ring-2 ring-yellow-500'
      : ''
  return (
    <div
      className={[
        'rounded-lg bg-vinoy-green text-white px-2 py-1 leading-tight cursor-grab active:cursor-grabbing select-none',
        'text-[11px] font-medium shadow-sm',
        ring,
        isOverlay ? 'shadow-xl scale-105' : '',
      ].join(' ')}
    >
      <div className="text-[9px] uppercase tracking-wider opacity-80 truncate">
        {match.divisionName} · {match.label}
      </div>
      <div className="truncate">
        {match.sideA}
      </div>
      <div className="truncate opacity-90">
        vs {match.sideB}
      </div>
    </div>
  )
}

// ============================================================
// MATCH CATALOG + PLACEMENT — flatten all matches and decide
// where each goes for the current day.
// ============================================================

function buildMatchCatalog(divisions) {
  const list = []
  const byId = new Map()
  for (const d of divisions) {
    if (!d.locked) continue
    for (const m of d.matches || []) {
      const enriched = enrichRegular(d, m)
      if (enriched) {
        list.push(enriched)
        byId.set(enriched.id, enriched)
      }
    }
    for (const m of d.finalsMatches || []) {
      const enriched = enrichFinals(d, m)
      if (enriched) {
        list.push(enriched)
        byId.set(enriched.id, enriched)
      }
    }
  }
  return { list, byId }
}

function enrichRegular(division, m) {
  const id = `match:${division.id}:${m.id}`
  // Round-robin / feed-in: pairA / pairB are 1-based pair indices.
  // Bracket: matches use sideA / sideB { kind, entrant | matchId }.
  let sideA = '—'
  let sideB = '—'
  let label = ''
  let participants = []
  if (division.kind === 'roundRobin' || division.kind === 'feedIn') {
    const pa = division.pairs?.[m.pairA - 1]
    const pb = division.pairs?.[m.pairB - 1]
    sideA = pa?.label || `Pair ${m.pairA}`
    sideB = pb?.label || `Pair ${m.pairB}`
    label = `R${m.pass || 1}.${m.round}`
    participants = [pa?.id, pb?.id].filter(Boolean)
  } else {
    // Bracket
    const a = resolveSlot(division, m.sideA)
    const b = resolveSlot(division, m.sideB)
    sideA = a?.kind === 'entrant' ? bracketEntrantLabel(a.entrant) : '—'
    sideB = b?.kind === 'entrant' ? bracketEntrantLabel(b.entrant) : '—'
    label = `R${m.round} · M${m.slot || ''}`
    participants = [
      a?.kind === 'entrant' ? a.entrant.id : null,
      b?.kind === 'entrant' ? b.entrant.id : null,
    ].filter(Boolean)
  }
  return {
    id,
    divisionId: division.id,
    matchId: m.id,
    finals: false,
    divisionName: division.name || 'Division',
    label,
    sideA,
    sideB,
    scheduledAt: m.scheduledAt || null,
    court: m.court || null,
    participants,
  }
}

function enrichFinals(division, m) {
  const id = `match:${division.id}:finals:${m.id}`
  const a = resolveFinalsSlot(division, m.slotA)
  const b = resolveFinalsSlot(division, m.slotB)
  const sideA = a ? a.label : placeholderLabel(m.slotA)
  const sideB = b ? b.label : placeholderLabel(m.slotB)
  return {
    id,
    divisionId: division.id,
    matchId: m.id,
    finals: true,
    divisionName: division.name || 'Division',
    label: 'Finals',
    sideA,
    sideB,
    scheduledAt: m.scheduledAt || null,
    court: m.court || null,
    participants: [a?.id, b?.id].filter(Boolean),
  }
}

function placeMatches(catalog, dayIso, slots, courts) {
  const cells = new Map()
  const tray = []
  const courtSet = new Set(courts)
  const slotKeys = new Set(slots.map(s => s.iso))
  // For player-conflict detection: time -> set of participant ids.
  // If the same participant appears in two cells with the same iso
  // but on different courts, every chip involving them flags.
  const timeBuckets = new Map() // iso -> Map(participantId -> matchIds[])

  for (const m of catalog.list) {
    const inCell =
      m.scheduledAt &&
      m.court &&
      courtSet.has(m.court) &&
      slotKeys.has(m.scheduledAt) &&
      m.scheduledAt.startsWith(dayIso)
    if (!inCell) {
      tray.push(m)
      continue
    }
    const key = `cell:${m.court}::${m.scheduledAt}`
    const list = cells.get(key) || []
    list.push(m)
    cells.set(key, list)
    // Track participant scheduling at this time
    const bucket = timeBuckets.get(m.scheduledAt) || new Map()
    for (const p of m.participants || []) {
      const arr = bucket.get(p) || []
      arr.push(m.id)
      bucket.set(p, arr)
    }
    timeBuckets.set(m.scheduledAt, bucket)
  }

  const playerConflicts = new Set()
  for (const bucket of timeBuckets.values()) {
    for (const arr of bucket.values()) {
      if (arr.length > 1) {
        for (const id of arr) playerConflicts.add(id)
      }
    }
  }

  return { cells, tray, playerConflicts }
}

// ============================================================
// HELPERS
// ============================================================

function dispatchSchedule(dispatch, m, payload) {
  dispatch({
    type: m.finals ? 'SET_FINALS_MATCH_SCHEDULE' : 'SET_MATCH_SCHEDULE',
    payload: {
      divisionId: m.divisionId,
      matchId: m.matchId,
      ...payload,
    },
  })
}

function buildSlots(dayIso, startHHMM, endHHMM, slotMinutes) {
  const out = []
  if (!dayIso) return out
  const [sH, sM] = (startHHMM || '08:00').split(':').map(Number)
  const [eH, eM] = (endHHMM || '21:00').split(':').map(Number)
  let cur = new Date(dayIso + 'T00:00:00')
  cur.setHours(sH, sM, 0, 0)
  const end = new Date(dayIso + 'T00:00:00')
  end.setHours(eH, eM, 0, 0)
  // Guard: at most 96 columns (24h at 15min) so a misconfigured
  // window can't lock the page rendering.
  let safety = 96
  while (cur < end && safety-- > 0) {
    out.push({
      iso: formatLocal(cur),
      label: cur.toLocaleTimeString(undefined, {
        hour: 'numeric',
        minute: '2-digit',
      }),
    })
    cur = new Date(cur.getTime() + slotMinutes * 60000)
  }
  return out
}

function formatLocal(d) {
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function todayIsoLocal() {
  return formatLocal(new Date()).slice(0, 10)
}
