import React, { useState } from 'react'
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

/**
 * The "bubble" — extra entrants the pro keeps on hand for
 * substitutions. Each division has its own list, since wait-list
 * candidates are typically scoped to a category (Men's 4.0 subs vs.
 * Women's 3.5 subs).
 *
 * Behavior:
 * - Always allows adding new entries.
 * - When the division is unlocked, "Add to draw" promotes the entry
 *   straight into the main pair / entrant list.
 * - When the division is locked, dragging an entry onto a pair /
 *   entrant slot substitutes — see SubstituteDialog for the click
 *   path. The dragId is exposed via dnd-kit's data so the parent
 *   draw card knows which wait-list entry is being dropped.
 *
 * Drag IDs are prefixed `wait:<id>` so the consuming sortable can
 * tell the difference between draws on the main list and drags from
 * the bubble.
 */
export default function WaitListPanel({
  divisionId,
  waitList,
  isDoubles,
  locked,
  dispatch,
  ifAuthed,
  promoteAction,
}) {
  const [open, setOpen] = useState(false)
  const [p1, setP1] = useState('')
  const [p2, setP2] = useState('')

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  )

  function add() {
    const a = p1.trim()
    const b = isDoubles ? p2.trim() : ''
    if (!a && !b) return
    ifAuthed(() => {
      dispatch({
        type: 'ADD_WAITLIST_ENTRY',
        payload: { divisionId, p1: a, p2: b },
      })
      setP1('')
      setP2('')
    })
  }

  function remove(id) {
    ifAuthed(() =>
      dispatch({
        type: 'REMOVE_WAITLIST_ENTRY',
        payload: { divisionId, id },
      })
    )
  }

  function promote(id) {
    ifAuthed(() =>
      dispatch({
        type: promoteAction,
        payload: { divisionId, waitListId: id },
      })
    )
  }

  const count = waitList?.length || 0

  return (
    <div className="border-t border-vinoy-border pt-3 mt-3">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-2 text-left"
      >
        <div>
          <div className="text-sm font-semibold text-vinoy-ink/80">
            Wait list / Bubble
            {count > 0 && (
              <span className="ml-2 text-xs font-normal text-vinoy-ink/60">
                · {count}
              </span>
            )}
          </div>
          <div className="text-xs text-vinoy-ink/60">
            {locked
              ? 'Drag a waiting entry onto a pair to sub them in.'
              : 'Park extras here. "Add to draw" promotes them into the main list.'}
          </div>
        </div>
        <span className="text-vinoy-ink/40 text-lg">{open ? '▾' : '▸'}</span>
      </button>

      {open && (
        <div className="mt-3">
          <DndContext sensors={sensors}>
            <SortableContext
              items={(waitList || []).map(e => `wait:${e.id}`)}
              strategy={verticalListSortingStrategy}
            >
              <ul className="space-y-2 mb-3">
                {(waitList || []).map(entry => (
                  <WaitListRow
                    key={entry.id}
                    entry={entry}
                    isDoubles={isDoubles}
                    locked={locked}
                    onChangeP1={(v) =>
                      ifAuthed(() =>
                        dispatch({
                          type: 'UPDATE_WAITLIST_ENTRY',
                          payload: { divisionId, id: entry.id, patch: { p1: v } },
                        })
                      )
                    }
                    onChangeP2={(v) =>
                      ifAuthed(() =>
                        dispatch({
                          type: 'UPDATE_WAITLIST_ENTRY',
                          payload: { divisionId, id: entry.id, patch: { p2: v } },
                        })
                      )
                    }
                    onRemove={() => remove(entry.id)}
                    onPromote={!locked ? () => promote(entry.id) : null}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>

          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
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
                <span className="hidden sm:inline text-vinoy-ink/30 shrink-0">/</span>
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
            <button
              onClick={add}
              className="shrink-0 px-3 py-1.5 rounded-lg border border-vinoy-green text-vinoy-green text-sm font-semibold"
            >
              Add to bubble
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function WaitListRow({ entry, isDoubles, locked, onChangeP1, onChangeP2, onRemove, onPromote }) {
  // The drag id is prefixed so the dropping list (pairs/entrants in
  // the parent card) can tell a wait-list drop from a reorder.
  const dragId = `wait:${entry.id}`
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: dragId })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 30 : undefined,
    opacity: isDragging ? 0.85 : 1,
  }

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 rounded-xl bg-white border border-dashed border-vinoy-gold/60 px-3 py-2 ${
        isDragging ? 'shadow-lg ring-2 ring-vinoy-gold' : ''
      }`}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="text-vinoy-gold cursor-grab active:cursor-grabbing touch-none px-1"
        title={locked ? 'Drag onto a pair to substitute' : 'Drag to reorder'}
        aria-label="Drag handle"
      >
        ⋮⋮
      </button>
      <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center gap-2">
        <input
          type="text"
          value={entry.p1}
          onChange={(ev) => onChangeP1(ev.target.value)}
          placeholder={isDoubles ? 'Player 1' : 'Player'}
          className="flex-1 min-w-0 bg-white border border-vinoy-border rounded-lg px-2 py-1 text-sm"
        />
        {isDoubles && (
          <>
            <span className="hidden sm:inline text-vinoy-ink/30 shrink-0">/</span>
            <input
              type="text"
              value={entry.p2}
              onChange={(ev) => onChangeP2(ev.target.value)}
              placeholder="Player 2"
              className="flex-1 min-w-0 bg-white border border-vinoy-border rounded-lg px-2 py-1 text-sm"
            />
          </>
        )}
      </div>
      {onPromote && (
        <button
          onClick={onPromote}
          className="shrink-0 text-xs px-2 py-1 rounded-lg border border-vinoy-green text-vinoy-green hover:bg-vinoy-green hover:text-white transition"
          title="Add to the main draw list"
        >
          Add to draw
        </button>
      )}
      <button
        onClick={onRemove}
        className="shrink-0 text-vinoy-ink/40 hover:text-red-600 px-1"
        title="Remove from wait list"
      >
        ✕
      </button>
    </li>
  )
}
