import React, { useState } from 'react'

/**
 * Modal for creating a new event. The event itself is just an
 * umbrella — name, dates, and times. Divisions (Men's 4.0, Women's
 * 3.5, Mixed Open) live underneath and each holds its own draw with
 * its own format. The user picks those after the event is created
 * via the "+ Add division" button on Setup.
 *
 * Single screen now — the old type picker is gone, since there is no
 * such thing as "an event's format" anymore.
 */
export default function NewEventDialog({ onCreate, onClose }) {
  const [meta, setMeta] = useState({
    name: '',
    startDate: '',
    endDate: '',
    startTime: '',
    endTime: '',
    ongoing: false,
  })

  function set(patch) {
    setMeta(m => ({ ...m, ...patch }))
  }

  function submit(e) {
    e?.preventDefault?.()
    onCreate(meta)
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
              New event
            </h2>
            <p className="text-xs text-vinoy-ink/60 mt-0.5">
              Just the basics — divisions and draws come next on Setup.
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
          <label className="block">
            <span className="text-xs font-semibold text-vinoy-ink/70">Event name</span>
            <input
              type="text"
              value={meta.name}
              onChange={(e) => set({ name: e.target.value })}
              placeholder="e.g. Spring Mixer 2026"
              autoFocus
              className="mt-1 w-full border-2 border-vinoy-border rounded-xl px-3 py-2 focus:border-vinoy-green focus:outline-none"
            />
          </label>

          <div>
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

          <div className="pt-2">
            <button
              type="submit"
              className="w-full px-5 py-3 rounded-xl bg-vinoy-green text-white font-bold"
            >
              Create event
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
