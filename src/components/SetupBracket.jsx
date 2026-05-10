import React, { useState } from 'react'
import ScoringEditor from './ScoringEditor.jsx'
import WaitListPanel from './WaitListPanel.jsx'
import SubstituteDialog from './SubstituteDialog.jsx'
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { restrictToVerticalAxis, restrictToParentElement } from '@dnd-kit/modifiers'

/**
 * Setup card for one elimination draw. Each bracket in the event
 * gets its own card; the parent screen renders them in a list with
 * an "+ Add bracket" affordance.
 *
 * The pro lists entrants (singles get one name, doubles get a pair),
 * drags rows to set seed order, then "Generate draw" to lock the
 * bracket. Driving both single- and double-elim from one component
 * keeps the setup ritual identical — only the generator differs.
 */
export default function SetupBracket({ bracket, dispatch, ifAuthed, onRemove }) {
  const isDoubles = bracket.entrantKind === 'doubles'
  const isDoubleElim = bracket.kind === 'doubleElim'
  const [substituteFor, setSubstituteFor] = useState(null)
  const entrants = bracket.entrants || []
  const drawSize = bracket.size || 0
  const [p1, setP1] = useState('')
  const [p2, setP2] = useState('')

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 5 },
    }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  function add() {
    const a = p1.trim()
    const b = isDoubles ? p2.trim() : ''
    if (!a && !b) return
    ifAuthed(() => {
      dispatch({
        type: 'ADD_ENTRANT',
        payload: { divisionId: bracket.id, p1: a, p2: b },
      })
      setP1('')
      setP2('')
    })
  }

  function generate() {
    if (entrants.length < 2) return
    ifAuthed(() => {
      // The reducer is kind-aware — LOCK_DIVISION builds the bracket
      // shape (single or double elim) based on division.kind.
      dispatch({
        type: 'LOCK_DIVISION',
        payload: { divisionId: bracket.id },
      })
    })
  }

  function unlock() {
    ifAuthed(() => {
      dispatch({
        type: 'UNLOCK_DIVISION',
        payload: { divisionId: bracket.id },
      })
    })
  }

  function addBye() {
    ifAuthed(() => {
      dispatch({
        type: 'ADD_ENTRANT',
        payload: { divisionId: bracket.id, p1: 'BYE', p2: '', isBye: true },
      })
    })
  }

  function handleDragEnd(e) {
    const { active, over } = e
    if (!over || active.id === over.id) return
    ifAuthed(() => {
      const oldIndex = entrants.findIndex(x => x.id === active.id)
      const newIndex = entrants.findIndex(x => x.id === over.id)
      if (oldIndex < 0 || newIndex < 0) return
      const reordered = arrayMove(entrants, oldIndex, newIndex)
      dispatch({
        type: 'REORDER_ENTRANTS',
        payload: { divisionId: bracket.id, order: reordered.map(x => x.id) },
      })
    })
  }

  const locked = !!bracket.locked
  const canLock = entrants.length >= 2

  return (
    <section className="bg-white rounded-2xl border border-vinoy-border p-4 mb-4 shadow-sm">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex-1 min-w-0">
          <input
            type="text"
            value={bracket.name || ''}
            disabled={locked}
            onChange={(e) =>
              ifAuthed(() =>
                dispatch({
                  type: 'UPDATE_DIVISION',
                  payload: { id: bracket.id, patch: { name: e.target.value } },
                })
              )
            }
            placeholder="Draw name (e.g. Men's 4.0)"
            className="font-display text-xl font-bold text-vinoy-green bg-transparent border-b border-transparent focus:border-vinoy-green focus:outline-none w-full"
          />
          <div className="text-xs text-vinoy-ink/60 mt-0.5">
            {isDoubleElim ? 'Double Elimination' : 'Single Elimination'} ·{' '}
            {isDoubles ? 'Doubles' : 'Singles'}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {locked ? (
            <button
              onClick={unlock}
              className="px-3 py-2 rounded-xl border border-yellow-400 text-yellow-700 text-sm font-semibold"
              title="Unlock to edit seeds"
            >
              Unlock draw
            </button>
          ) : (
            <button
              onClick={generate}
              disabled={!canLock}
              className="px-4 py-2 rounded-xl bg-vinoy-green text-white font-semibold text-sm disabled:opacity-40"
            >
              Generate draw
            </button>
          )}
          {!locked && onRemove && (
            <button
              onClick={onRemove}
              className="text-vinoy-ink/40 hover:text-red-600 px-1"
              title="Remove this bracket"
            >
              ✕
            </button>
          )}
        </div>
      </div>
      {locked && (
        <p className="text-xs text-vinoy-ink/70 bg-vinoy-cream rounded-lg px-3 py-2 mb-3">
          Draw locked: {entrants.length} entrants → bracket of {drawSize}.
          Unlock to add or reorder.
        </p>
      )}

      {!locked && entrants.length >= 2 && (
        <p className="text-xs text-vinoy-ink/60 mb-2">
          Drag the seed bubble to reorder — seeds reassign automatically.
        </p>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
        modifiers={[restrictToVerticalAxis, restrictToParentElement]}
      >
        <SortableContext
          items={entrants.map(e => e.id)}
          strategy={verticalListSortingStrategy}
        >
          <ol className="space-y-2 mb-3">
            {entrants.map((e) => (
              <EntrantRow
                key={e.id}
                entrant={e}
                locked={locked}
                isDoubles={isDoubles}
                onChangeP1={(val) =>
                  ifAuthed(() =>
                    dispatch({
                      type: 'UPDATE_ENTRANT',
                      payload: { divisionId: bracket.id, id: e.id, patch: { p1: val } },
                    })
                  )
                }
                onChangeP2={(val) =>
                  ifAuthed(() =>
                    dispatch({
                      type: 'UPDATE_ENTRANT',
                      payload: { divisionId: bracket.id, id: e.id, patch: { p2: val } },
                    })
                  )
                }
                onRemove={() =>
                  ifAuthed(() =>
                    dispatch({
                      type: 'REMOVE_ENTRANT',
                      payload: { divisionId: bracket.id, id: e.id },
                    })
                  )
                }
                onSubstitute={() => setSubstituteFor(e)}
              />
            ))}
          </ol>
        </SortableContext>
      </DndContext>

      {!locked && (
        <>
          <div className="flex items-center gap-2">
            <span className="w-7 shrink-0 text-center font-bold text-gray-300">
              {entrants.length + 1}
            </span>
            <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center gap-2">
              <input
                type="text"
                value={p1}
                onChange={(e) => setP1(e.target.value)}
                placeholder={isDoubles ? 'Player 1' : 'Player'}
                className="flex-1 min-w-0 bg-white border-2 border-vinoy-border rounded-lg px-2 py-1 text-sm"
                onKeyDown={(e) => e.key === 'Enter' && add()}
              />
              {isDoubles && (
                <>
                  <span className="hidden sm:inline text-gray-400 shrink-0">/</span>
                  <input
                    type="text"
                    value={p2}
                    onChange={(e) => setP2(e.target.value)}
                    placeholder="Player 2"
                    className="flex-1 min-w-0 bg-white border-2 border-vinoy-border rounded-lg px-2 py-1 text-sm"
                    onKeyDown={(e) => e.key === 'Enter' && add()}
                  />
                </>
              )}
            </div>
            <button
              onClick={add}
              className="shrink-0 px-3 py-1 rounded-lg bg-vinoy-green text-white text-sm font-semibold"
            >
              Add
            </button>
          </div>
          <button
            onClick={addBye}
            className="mt-2 text-xs text-vinoy-ink/60 hover:text-vinoy-green underline"
            title="Reserve a seed slot as a walkover"
          >
            + Add a bye
          </button>
        </>
      )}

      <ScoringEditor
        scoring={bracket.scoring}
        locked={locked}
        onChange={(scoring) =>
          ifAuthed(() =>
            dispatch({
              type: 'UPDATE_DIVISION',
              payload: { id: bracket.id, patch: { scoring } },
            })
          )
        }
      />

      <WaitListPanel
        divisionId={bracket.id}
        waitList={bracket.waitList || []}
        isDoubles={isDoubles}
        locked={locked}
        dispatch={dispatch}
        ifAuthed={ifAuthed}
        promoteAction="PROMOTE_WAITLIST_TO_ENTRANT"
      />

      {substituteFor && (
        <SubstituteDialog
          title={entrantSummary(substituteFor, isDoubles)}
          isDoubles={isDoubles}
          current={entrantSummary(substituteFor, isDoubles)}
          waitList={bracket.waitList || []}
          onClose={() => setSubstituteFor(null)}
          onSubmit={({ p1, p2, fromWaitListId }) => {
            ifAuthed(() =>
              dispatch({
                type: 'SUBSTITUTE_ENTRANT',
                payload: {
                  divisionId: bracket.id,
                  entrantId: substituteFor.id,
                  p1,
                  p2,
                  fromWaitListId,
                },
              })
            )
            setSubstituteFor(null)
          }}
        />
      )}
    </section>
  )
}

function entrantSummary(entrant, isDoubles) {
  const a = (entrant.p1 || '').trim()
  const b = (entrant.p2 || '').trim()
  if (isDoubles && a && b) return `${a} / ${b}`
  return a || b || '—'
}

function EntrantRow({ entrant, locked, isDoubles, onChangeP1, onChangeP2, onRemove, onSubstitute }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: entrant.id, disabled: locked })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 20 : undefined,
    opacity: isDragging ? 0.85 : 1,
  }

  const seedBadgeClass = entrant.isBye
    ? 'bg-vinoy-ink/30 text-white'
    : 'bg-vinoy-green text-white'

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 rounded-xl px-3 py-2 ${
        entrant.isBye ? 'bg-white border border-dashed border-vinoy-border' : 'bg-vinoy-cream'
      } ${isDragging ? 'shadow-lg ring-2 ring-vinoy-green' : ''}`}
    >
      {locked ? (
        <span className={`w-7 shrink-0 h-7 rounded-full text-xs font-bold flex items-center justify-center ${seedBadgeClass}`}>
          {entrant.seed}
        </span>
      ) : (
        <button
          type="button"
          {...attributes}
          {...listeners}
          className={`w-7 shrink-0 h-7 rounded-full text-xs font-bold flex items-center justify-center cursor-grab active:cursor-grabbing touch-none ${seedBadgeClass}`}
          title="Drag to reorder"
          aria-label={`Reorder seed ${entrant.seed}`}
        >
          {entrant.seed}
        </button>
      )}
      {entrant.isBye ? (
        <span className="flex-1 min-w-0 text-vinoy-ink/60 italic uppercase tracking-wider text-xs">
          BYE — walkover for the paired seed
        </span>
      ) : (
        <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center gap-2">
          <input
            type="text"
            value={entrant.p1}
            disabled={locked}
            onChange={(ev) => onChangeP1(ev.target.value)}
            placeholder={isDoubles ? 'Player 1' : 'Player'}
            className="flex-1 min-w-0 bg-white border border-vinoy-border rounded-lg px-2 py-1 text-sm"
          />
          {isDoubles && (
            <>
              <span className="hidden sm:inline text-gray-400 shrink-0">/</span>
              <input
                type="text"
                value={entrant.p2}
                disabled={locked}
                onChange={(ev) => onChangeP2(ev.target.value)}
                placeholder="Player 2"
                className="flex-1 min-w-0 bg-white border border-vinoy-border rounded-lg px-2 py-1 text-sm"
              />
            </>
          )}
        </div>
      )}
      {locked && !entrant.isBye && onSubstitute && (
        <button
          onClick={onSubstitute}
          className="shrink-0 text-xs px-2 py-1 rounded-lg border border-vinoy-gold/60 text-vinoy-gold hover:bg-vinoy-gold hover:text-white transition"
          title="Sub a player in for this seed"
        >
          Sub
        </button>
      )}
      {!locked && (
        <button
          onClick={onRemove}
          className="shrink-0 text-gray-400 hover:text-red-600 px-1"
          title="Remove entrant"
        >
          ✕
        </button>
      )}
    </li>
  )
}
