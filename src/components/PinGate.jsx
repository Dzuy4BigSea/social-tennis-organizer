import React, { useState } from 'react'
import { hashPin, setStoredPin, getStoredPin } from '../utils/share.js'

/**
 * Inline PIN prompt. Shown when a write action is attempted without a
 * matching stored PIN. Verifies against the tournament's stored hash.
 */
export default function PinGate({ pinHash, onUnlock, onClose, title = 'Enter pro PIN' }) {
  const [pin, setPin] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    if (!pin || busy) return
    setBusy(true)
    const hash = await hashPin(pin)
    if (hash === pinHash) {
      setStoredPin(pin)
      onUnlock?.(pin)
    } else {
      setErr('Wrong PIN')
      setPin('')
    }
    setBusy(false)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <form
        onSubmit={submit}
        className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl"
      >
        <h2 className="text-xl font-bold text-tennis-green mb-1">{title}</h2>
        <p className="text-sm text-gray-600 mb-4">
          Required to enter scores or change the draw.
        </p>
        <input
          type="password"
          inputMode="numeric"
          autoFocus
          value={pin}
          onChange={(e) => { setPin(e.target.value); setErr('') }}
          className="w-full text-center text-2xl tracking-widest border-2 border-gray-300 rounded-xl py-3 mb-2 focus:border-tennis-green focus:outline-none"
          placeholder="••••"
        />
        {err && <p className="text-red-600 text-sm mb-2">{err}</p>}
        <div className="flex gap-2 mt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border-2 border-gray-300 text-gray-700 font-semibold"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy || !pin}
            className="flex-1 py-3 rounded-xl bg-tennis-green text-white font-semibold disabled:opacity-50"
          >
            Unlock
          </button>
        </div>
      </form>
    </div>
  )
}

/**
 * First-time PIN setup: pro picks a PIN that becomes the tournament's
 * shared secret. Stored hashed on the server.
 */
export function PinSetup({ onSet, onClose }) {
  const [pin, setPin] = useState('')
  const [confirm, setConfirm] = useState('')
  const [err, setErr] = useState('')

  async function submit(e) {
    e.preventDefault()
    if (pin.length < 4) return setErr('PIN must be at least 4 digits')
    if (pin !== confirm) return setErr('PINs do not match')
    const hash = await hashPin(pin)
    setStoredPin(pin)
    onSet?.(hash, pin)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <form
        onSubmit={submit}
        className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl"
      >
        <h2 className="text-xl font-bold text-tennis-green mb-1">Set tournament PIN</h2>
        <p className="text-sm text-gray-600 mb-4">
          The pros share this PIN to enter scores. Players can view without it.
        </p>
        <input
          type="password"
          inputMode="numeric"
          autoFocus
          value={pin}
          onChange={(e) => { setPin(e.target.value); setErr('') }}
          className="w-full text-center text-2xl tracking-widest border-2 border-gray-300 rounded-xl py-3 mb-2 focus:border-tennis-green focus:outline-none"
          placeholder="Choose PIN (4+ digits)"
        />
        <input
          type="password"
          inputMode="numeric"
          value={confirm}
          onChange={(e) => { setConfirm(e.target.value); setErr('') }}
          className="w-full text-center text-2xl tracking-widest border-2 border-gray-300 rounded-xl py-3 mb-2 focus:border-tennis-green focus:outline-none"
          placeholder="Confirm"
        />
        {err && <p className="text-red-600 text-sm mb-2">{err}</p>}
        <div className="flex gap-2 mt-2">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl border-2 border-gray-300 text-gray-700 font-semibold"
            >
              Skip
            </button>
          )}
          <button
            type="submit"
            className="flex-1 py-3 rounded-xl bg-tennis-green text-white font-semibold"
          >
            Set PIN
          </button>
        </div>
      </form>
    </div>
  )
}

export function hasStoredPin() {
  return Boolean(getStoredPin())
}
