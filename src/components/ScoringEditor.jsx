import React, { useState } from 'react'

/**
 * Per-division scoring config editor. Used by Round Robin, Single
 * Elim, and Double Elim divisions — feed-in divisions read
 * pass-based scoring instead via PassesEditor.
 *
 * Default ("Standard scoring") is best-of-3 sets, six games to a
 * set, set tiebreak at 6-6, ad scoring, full third set when
 * needed. Anything other than the default opens the inline form so
 * the pro can tweak without leaving the division card.
 */
export default function ScoringEditor({ scoring, locked, onChange }) {
  const isStandard = scoringIsStandard(scoring)
  const [open, setOpen] = useState(!isStandard)

  function patch(p) {
    onChange({ ...(scoring || {}), ...p })
  }

  return (
    <div className="border-t border-vinoy-border pt-3 mt-3">
      <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
        <div>
          <div className="text-sm font-semibold text-vinoy-ink/80">Scoring</div>
          <div className="text-xs text-vinoy-ink/60">
            {isStandard
              ? 'Standard: best-of-3, six-game sets, ad scoring, set tiebreak at 6-6.'
              : describeScoring(scoring)}
          </div>
        </div>
        {!locked && (
          <button
            type="button"
            onClick={() => setOpen(o => !o)}
            className="text-xs px-3 py-1.5 rounded-lg border border-vinoy-border text-vinoy-ink/70 hover:border-vinoy-green hover:text-vinoy-green"
          >
            {open ? 'Done' : isStandard ? 'Customize' : 'Edit'}
          </button>
        )}
      </div>

      {open && !locked && (
        <div className="bg-vinoy-cream rounded-xl p-3 space-y-3">
          <SegmentedField
            label="Number of sets"
            options={[
              { id: 1, label: '1 set' },
              { id: 2, label: 'Best of 3' },
              { id: 3, label: 'Best of 5' },
            ]}
            value={scoring?.setsToWin === 1 ? 1 : scoring?.setsToWin === 3 ? 3 : 2}
            onChange={(v) => patch({ setsToWin: v })}
          />

          <SegmentedField
            label="Games to win the set"
            options={[
              { id: 4, label: '4 games' },
              { id: 6, label: '6 games' },
              { id: 8, label: '8-game pro set' },
            ]}
            value={scoring?.gamesPerSet ?? 6}
            onChange={(v) => patch({ gamesPerSet: v })}
          />

          <SegmentedField
            label="Set tiebreak at"
            options={[
              { id: 4, label: '4-4' },
              { id: 6, label: '6-6' },
              { id: 8, label: '8-8' },
            ]}
            value={scoring?.tiebreakAtGames ?? 6}
            onChange={(v) => patch({ tiebreakAtGames: v })}
          />

          <SegmentedField
            label="Game scoring"
            options={[
              { id: true, label: 'Ad' },
              { id: false, label: 'No-ad' },
            ]}
            value={scoring?.adScoring !== false}
            onChange={(v) => patch({ adScoring: v })}
          />

          {(scoring?.setsToWin ?? 2) >= 2 && (
            <>
              <SegmentedField
                label="Final set"
                options={[
                  { id: 'fullSet', label: 'Full set' },
                  { id: 'matchTiebreak', label: 'Match tiebreak' },
                ]}
                value={scoring?.finalSetMode || 'fullSet'}
                onChange={(v) => patch({ finalSetMode: v })}
              />
              {scoring?.finalSetMode === 'matchTiebreak' && (
                <label className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-vinoy-ink/70">
                    Match tiebreak to
                  </span>
                  <input
                    type="number"
                    min="5"
                    max="21"
                    value={scoring?.finalSetTiebreakTo ?? 10}
                    onChange={(e) =>
                      patch({ finalSetTiebreakTo: Math.max(5, parseInt(e.target.value) || 10) })
                    }
                    className="w-20 text-center text-base font-bold border-2 border-vinoy-border rounded-lg px-2 py-1"
                  />
                </label>
              )}
            </>
          )}
        </div>
      )}

      {locked && !isStandard && (
        <div className="text-xs text-yellow-700 bg-yellow-50 rounded-lg px-3 py-2">
          Scoring is locked because the draw has been generated.
        </div>
      )}
    </div>
  )
}

function SegmentedField({ label, options, value, onChange }) {
  return (
    <div>
      <div className="text-xs font-semibold text-vinoy-ink/70 mb-1">{label}</div>
      <div className="flex flex-wrap gap-1.5">
        {options.map(opt => {
          const active = opt.id === value
          return (
            <button
              key={String(opt.id)}
              type="button"
              onClick={() => onChange(opt.id)}
              className={[
                'rounded-full border-2 transition font-semibold px-3 py-1 text-xs',
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

function scoringIsStandard(s) {
  if (!s) return true
  return (
    s.setsToWin === 2 &&
    s.gamesPerSet === 6 &&
    s.tiebreakAtGames === 6 &&
    s.adScoring !== false &&
    (s.finalSetMode || 'fullSet') === 'fullSet'
  )
}

/**
 * One-line summary of a customized scoring config so the division
 * card header still tells the pro what's in play without expanding.
 */
function describeScoring(s) {
  if (!s) return 'Standard scoring'
  const parts = []
  if (s.setsToWin === 1) parts.push('1 set')
  else if (s.setsToWin === 3) parts.push('Best of 5')
  else parts.push('Best of 3')
  if (s.gamesPerSet === 8) parts.push('8-game pro set')
  else if (s.gamesPerSet !== 6) parts.push(`${s.gamesPerSet}-game sets`)
  if (s.tiebreakAtGames !== 6) parts.push(`tiebreak at ${s.tiebreakAtGames}-${s.tiebreakAtGames}`)
  if (s.adScoring === false) parts.push('No-ad')
  if ((s.setsToWin ?? 2) >= 2 && s.finalSetMode === 'matchTiebreak') {
    parts.push(`MTB to ${s.finalSetTiebreakTo || 10}`)
  }
  return parts.join(' · ')
}
