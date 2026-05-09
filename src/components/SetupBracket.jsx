import React, { useState } from 'react'
import {
  generateSingleElimBracket,
  generateDoubleElimBracket,
} from '../utils/bracket.js'
import { getEventType } from '../utils/eventTypes.js'
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
 * Setup screen for elimination events. The pro lists entrants
 * (singles get one name, doubles get a pair), drags rows to set
 * seed order, then "Generate draw" to lock in the bracket.
 *
 * Driving both single- and double-elim from one screen keeps the
 * setup ritual identical — only the generator function differs.
 */
export default function SetupBracket({ state, dispatch, ifAuthed }) {
  const { tournament, bracket } = state
  const evt = getEventType(tournament.type)
  const isDoubles = evt.entrantKind === 'doubles'
  const isDoubleElim = evt.engine === 'doubleElim'
  const entrants = bracket?.entrants || []
  const drawSize = bracket?.size || 0
  const [p1, setP1] = useState('')
  const [p2, setP2] = useState('')

  const sensors = useSensors(
    // Activation distance prevents the row from grabbing focus on a
    // stray tap; the user must intentionally start a drag.
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
      if (!bracket) {
        dispatch({
          type: 'SET_BRACKET',
          payload: { type: isDoubleElim ? 'doubleElim' : 'singleElim', entrants: [], matches: [] },
        })
      }
      dispatch({
        type: 'ADD_BRACKET_ENTRANT',
        payload: { p1: a, p2: b },
      })
      setP1('')
      setP2('')
    })
  }

  function generate() {
    if (entrants.length < 2) return
    ifAuthed(() => {
      const built = isDoubleElim
        ? generateDoubleElimBracket(entrants.length)
        : generateSingleElimBracket(entrants.length)
      dispatch({
        type: 'SET_BRACKET',
        payload: {
          type: isDoubleElim ? 'doubleElim' : 'singleElim',
          entrants,
          matches: built.matches,
          rounds: built.rounds,
          size: built.size,
          locked: true,
        },
      })
    })
  }

  function unlock() {
    ifAuthed(() => {
      dispatch({
        type: 'SET_BRACKET',
        payload: {
          type: isDoubleElim ? 'doubleElim' : 'singleElim',
          entrants,
          matches: [],
          locked: false,
        },
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
        type: 'REORDER_BRACKET_ENTRANTS',
        payload: { order: reordered.map(x => x.id) },
      })
    })
  }

  const locked = !!bracket?.locked
  const canLock = entrants.length >= 2

  return (
    <section className="bg-white rounded-2xl border border-vinoy-border p-4 mb-4 shadow-sm">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h2 className="font-display text-xl font-bold text-vinoy-green">
          Entrants
        </h2>
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
            title={canLock ? 'Generate draw' : 'Add at least 2 entrants'}
          >
            Generate draw
          </button>
        )}
      </div>
      {locked && (
        <p className="text-xs text-vinoy-ink/70 bg-vinoy-cream rounded-lg px-3 py-2 mb-3">
          Draw locked: {entrants.length} entrants → bracket of {drawSize}.
          Unlock to add or reorder.
        </p>
      )}

      {!locked && entrants.length >= 2 && (
        <p className="text-xs text-vinoy-ink/60 mb-2">
          Drag the ☰ handle to reorder — seeds reassign automatically.
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
                      type: 'UPDATE_BRACKET_ENTRANT',
                      payload: { id: e.id, patch: { p1: val } },
                    })
                  )
                }
                onChangeP2={(val) =>
                  ifAuthed(() =>
                    dispatch({
                      type: 'UPDATE_BRACKET_ENTRANT',
                      payload: { id: e.id, patch: { p2: val } },
                    })
                  )
                }
                onRemove={() =>
                  ifAuthed(() =>
                    dispatch({
                      type: 'REMOVE_BRACKET_ENTRANT',
                      payload: { id: e.id },
                    })
                  )
                }
              />
            ))}
          </ol>
        </SortableContext>
      </DndContext>

      {!locked && (
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
      )}

      <p className="text-xs text-vinoy-ink/60 mt-3">
        {isDoubleElim
          ? 'Double elimination: every entrant gets a second life in the loser’s bracket. The loser’s-bracket champion meets the winner’s-bracket champion in the grand final.'
          : 'Top seeds get any first-round byes when the field isn’t a power of two.'}
      </p>
    </section>
  )
}

/**
 * Single entrant row, made sortable via @dnd-kit. The drag handle is
 * the seed bubble on the left so a tap on a name input doesn't
 * accidentally start a drag — important on touch where input focus
 * and pointerdown can race.
 */
function EntrantRow({ entrant, locked, isDoubles, onChangeP1, onChangeP2, onRemove }) {
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

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 bg-vinoy-cream rounded-xl px-3 py-2 ${
        isDragging ? 'shadow-lg ring-2 ring-vinoy-green' : ''
      }`}
    >
      {locked ? (
        <span className="w-7 shrink-0 h-7 rounded-full bg-vinoy-green text-white text-xs font-bold flex items-center justify-center">
          {entrant.seed}
        </span>
      ) : (
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="w-7 shrink-0 h-7 rounded-full bg-vinoy-green text-white text-xs font-bold flex items-center justify-center cursor-grab active:cursor-grabbing touch-none"
          title="Drag to reorder"
          aria-label={`Reorder seed ${entrant.seed}`}
        >
          {entrant.seed}
        </button>
      )}
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
