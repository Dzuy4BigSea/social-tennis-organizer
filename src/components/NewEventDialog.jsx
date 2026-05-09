import React, { useState } from 'react'
import {
  EVENT_TYPES,
  VARIANTS,
  RATINGS_STANDARD,
  RATINGS_COMBO,
} from '../utils/eventTypes.js'

/**
 * Two-step modal for creating a new event:
 *   1. Pick an event type (Round Robin, Single Elimination, etc.).
 *   2. Fill in metadata (name, variant, rating, dates / ongoing).
 *
 * The split keeps the type picker scannable on mobile — pros at the
 * desk pick the format first, then commit to the specifics.
 */
export default function NewEventDialog({ onCreate, onClose }) {
  const [step, setStep] = useState('type')
  const [typeId, setTypeId] = useState(null)
  const [meta, setMeta] = useState({
    name: '',
    variant: 'all',
    rating: '',
    startDate: '',
    endDate: '',
    ongoing: false,
  })

  function pickType(id) {
    setTypeId(id)
    setStep('meta')
  }

  function submit(e) {
    e?.preventDefault?.()
    onCreate({ type: typeId, ...meta })
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
              {step === 'type' ? 'New event' : selectedTypeLabel(typeId)}
            </h2>
            <p className="text-xs text-vinoy-ink/60 mt-0.5">
              {step === 'type'
                ? 'Pick an event format.'
                : 'Add a few details so it shows up clearly on the schedule.'}
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

        {step === 'type' ? (
          <TypeGrid onPick={pickType} />
        ) : (
          <MetaForm
            meta={meta}
            setMeta={setMeta}
            onBack={() => setStep('type')}
            onSubmit={submit}
          />
        )}
      </div>
    </div>
  )
}

function selectedTypeLabel(id) {
  return EVENT_TYPES.find(t => t.id === id)?.label || 'New event'
}

function TypeGrid({ onPick }) {
  return (
    <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
      {EVENT_TYPES.map(t => (
        <button
          key={t.id}
          onClick={() => onPick(t.id)}
          className="text-left bg-vinoy-cream hover:bg-vinoy-parchment border border-vinoy-border rounded-xl p-3 transition group"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="font-semibold text-vinoy-green group-hover:underline">
              {t.label}
            </div>
            {t.engine === 'comingSoon' && (
              <span className="shrink-0 text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-white text-vinoy-gold border border-vinoy-gold/40">
                Soon
              </span>
            )}
          </div>
          <div className="text-xs text-vinoy-ink/70 mt-1 leading-snug">
            {t.blurb}
          </div>
        </button>
      ))}
    </div>
  )
}

function MetaForm({ meta, setMeta, onBack, onSubmit }) {
  function set(patch) {
    setMeta(m => ({ ...m, ...patch }))
  }

  return (
    <form onSubmit={onSubmit} className="p-5 space-y-4">
      <label className="block">
        <span className="text-xs font-semibold text-vinoy-ink/70">Event name</span>
        <input
          type="text"
          value={meta.name}
          onChange={(e) => set({ name: e.target.value })}
          placeholder="e.g. Spring Mixer 4.0"
          autoFocus
          className="mt-1 w-full border-2 border-vinoy-border rounded-xl px-3 py-2 focus:border-vinoy-green focus:outline-none"
        />
      </label>

      <ChipPicker
        label="Variant"
        options={VARIANTS}
        value={meta.variant}
        onChange={(v) => set({ variant: v })}
      />

      <div>
        <div className="text-xs font-semibold text-vinoy-ink/70 mb-1">Rating</div>
        <div className="space-y-2">
          <ChipPicker
            options={RATINGS_STANDARD}
            value={meta.rating}
            onChange={(v) => set({ rating: meta.rating === v ? '' : v })}
            allowEmpty
            small
          />
          <details className="text-xs">
            <summary className="cursor-pointer text-vinoy-ink/60 hover:text-vinoy-green select-none">
              Combo ratings
            </summary>
            <div className="mt-2">
              <ChipPicker
                options={RATINGS_COMBO}
                value={meta.rating}
                onChange={(v) => set({ rating: meta.rating === v ? '' : v })}
                allowEmpty
                small
              />
            </div>
          </details>
        </div>
      </div>

      <div className="border-t border-vinoy-border pt-4">
        <label className="flex items-center gap-2 mb-3 cursor-pointer">
          <input
            type="checkbox"
            checked={meta.ongoing}
            onChange={(e) => set({ ongoing: e.target.checked })}
            className="w-4 h-4 accent-vinoy-green"
          />
          <span className="text-sm text-vinoy-ink/80">
            Ongoing (recurring weekly play, no fixed end date)
          </span>
        </label>
        {!meta.ongoing && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs font-semibold text-vinoy-ink/70">Start date</span>
              <input
                type="date"
                value={meta.startDate}
                onChange={(e) => set({ startDate: e.target.value })}
                className="mt-1 w-full border-2 border-vinoy-border rounded-xl px-3 py-2 focus:border-vinoy-green focus:outline-none"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-vinoy-ink/70">
                End date <span className="font-normal text-vinoy-ink/40">(optional)</span>
              </span>
              <input
                type="date"
                value={meta.endDate}
                onChange={(e) => set({ endDate: e.target.value })}
                className="mt-1 w-full border-2 border-vinoy-border rounded-xl px-3 py-2 focus:border-vinoy-green focus:outline-none"
              />
            </label>
          </div>
        )}
      </div>

      <div className="flex flex-col-reverse sm:flex-row gap-2 pt-2">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 sm:flex-none px-5 py-3 rounded-xl border-2 border-vinoy-border text-vinoy-ink/70 font-semibold"
        >
          ← Back
        </button>
        <button
          type="submit"
          className="flex-1 px-5 py-3 rounded-xl bg-vinoy-green text-white font-bold"
        >
          Create event
        </button>
      </div>
    </form>
  )
}

function ChipPicker({ label, options, value, onChange, allowEmpty, small }) {
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
