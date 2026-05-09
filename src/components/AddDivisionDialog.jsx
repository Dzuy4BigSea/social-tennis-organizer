import React, { useState } from 'react'
import {
  VARIANTS,
  RATINGS_STANDARD,
  RATINGS_COMBO,
} from '../utils/eventTypes.js'

const KINDS = [
  { id: 'roundRobin', label: 'Round Robin', blurb: 'Everyone plays everyone in their division.' },
  { id: 'singleElim', label: 'Single Elim', blurb: 'One loss and out. Classic bracket.' },
  { id: 'doubleElim', label: 'Double Elim', blurb: "Loser's bracket gives a second life." },
]

const ENTRANT_KINDS = [
  { id: 'singles', label: 'Singles', blurb: 'One player per side.' },
  { id: 'doubles', label: 'Doubles', blurb: 'Two players per side.' },
]

/**
 * Modal the pro opens from the Setup screen to add a new division.
 * Each division has a participant variant (Men's / Women's / etc.),
 * a rating band, a draw format (RR / SE / DE) and a singles-vs-doubles
 * toggle. Defaults pre-fill from the most recently added division so
 * adding "Men's 3.5 / Men's 4.0 / Men's 4.5" in sequence only takes a
 * single tap each.
 */
export default function AddDivisionDialog({ defaults, onCreate, onClose }) {
  const [form, setForm] = useState({
    kind: defaults.kind || 'roundRobin',
    variant: defaults.variant || 'all',
    rating: defaults.rating || '',
    entrantKind: defaults.entrantKind || 'singles',
    name: '',
  })

  function set(patch) {
    setForm(f => ({ ...f, ...patch }))
  }

  function submit(e) {
    e?.preventDefault?.()
    onCreate(form)
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-white w-full sm:max-w-2xl sm:rounded-2xl shadow-xl max-h-[95vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b border-vinoy-border px-5 py-3 flex items-center justify-between">
          <div>
            <h2 className="font-display text-xl font-bold text-vinoy-green">
              Add division
            </h2>
            <p className="text-xs text-vinoy-ink/60 mt-0.5">
              Pick the category and format. You'll add players next.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-vinoy-ink/40 hover:text-vinoy-ink text-2xl leading-none px-2"
            title="Close"
          >
            ×
          </button>
        </div>

        <form onSubmit={submit} className="p-5 space-y-4">
          <ChipPicker
            label="Variant"
            options={VARIANTS}
            value={form.variant}
            onChange={(v) => set({ variant: v })}
          />

          <ChipPicker
            label="Format"
            options={ENTRANT_KINDS}
            value={form.entrantKind}
            onChange={(v) => set({ entrantKind: v })}
          />

          <div>
            <div className="text-xs font-semibold text-vinoy-ink/70 mb-1">Rating</div>
            <div className="space-y-2">
              <ChipPicker
                options={RATINGS_STANDARD}
                value={form.rating}
                onChange={(v) => set({ rating: form.rating === v ? '' : v })}
                small
              />
              <details className="text-xs">
                <summary className="cursor-pointer text-vinoy-ink/60 hover:text-vinoy-green select-none">
                  Combo ratings
                </summary>
                <div className="mt-2">
                  <ChipPicker
                    options={RATINGS_COMBO}
                    value={form.rating}
                    onChange={(v) => set({ rating: form.rating === v ? '' : v })}
                    small
                  />
                </div>
              </details>
            </div>
          </div>

          <div className="border-t border-vinoy-border pt-4">
            <div className="text-xs font-semibold text-vinoy-ink/70 mb-2">Draw format</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {KINDS.map(k => {
                const active = form.kind === k.id
                return (
                  <button
                    key={k.id}
                    type="button"
                    onClick={() => set({ kind: k.id })}
                    className={[
                      'text-left rounded-xl border-2 p-3 transition',
                      active
                        ? 'bg-vinoy-green border-vinoy-green text-white'
                        : 'bg-white border-vinoy-border text-vinoy-ink/80 hover:border-vinoy-green',
                    ].join(' ')}
                  >
                    <div className="font-semibold">{k.label}</div>
                    <div className={`text-xs mt-1 ${active ? 'text-white/80' : 'text-vinoy-ink/60'}`}>
                      {k.blurb}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          <label className="block">
            <span className="text-xs font-semibold text-vinoy-ink/70">
              Name <span className="font-normal text-vinoy-ink/40">(optional, auto-filled if blank)</span>
            </span>
            <input
              type="text"
              value={form.name}
              onChange={(e) => set({ name: e.target.value })}
              placeholder="e.g. Men's 4.0"
              className="mt-1 w-full border-2 border-vinoy-border rounded-xl px-3 py-2 focus:border-vinoy-green focus:outline-none"
            />
          </label>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full px-5 py-3 rounded-xl bg-vinoy-green text-white font-bold"
            >
              Add division
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ChipPicker({ label, options, value, onChange, small }) {
  return (
    <div>
      {label && (
        <div className="text-xs font-semibold text-vinoy-ink/70 mb-1">{label}</div>
      )}
      <div className="flex flex-wrap gap-2">
        {options.map(opt => {
          const active = value === opt.id
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onChange(opt.id)}
              className={[
                'rounded-full border-2 transition font-semibold',
                small ? 'px-3 py-1 text-xs' : 'px-4 py-1.5 text-sm',
                active
                  ? 'bg-vinoy-green border-vinoy-green text-white'
                  : 'bg-white border-vinoy-border text-vinoy-ink/70 hover:border-vinoy-green hover:text-vinoy-green',
              ].join(' ')}
            >
              {opt.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
