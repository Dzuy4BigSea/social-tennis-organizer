import React from 'react'

/**
 * Compact sync-state badge. Lives in the page header so the pro can tell at
 * a glance whether their edits are persisting to the shared room. The
 * "forbidden" and "error" states are the actionable ones — the user almost
 * certainly needs to re-enter their PIN.
 */
export default function SaveStatus({ status, onFix, hasRoomCode }) {
  if (!hasRoomCode) {
    return (
      <Badge tone="muted">Local only · create an event code to share</Badge>
    )
  }

  if (status === 'forbidden') {
    return (
      <button
        onClick={onFix}
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-100 border border-red-300 text-red-800 text-xs font-semibold hover:bg-red-200"
      >
        <Dot tone="bg-red-500" pulse />
        Saves blocked — tap to re-enter PIN
      </button>
    )
  }

  if (status === 'error') {
    return <Badge tone="warn">Network error · retrying</Badge>
  }
  if (status === 'saving') return <Badge tone="muted">Saving…</Badge>
  if (status === 'saved') return <Badge tone="ok">Saved</Badge>
  return <Badge tone="muted">Live</Badge>
}

function Badge({ tone, children }) {
  const cls = {
    ok: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    warn: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    muted: 'bg-gray-100 text-gray-600 border-gray-200',
  }[tone]
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium ${cls}`}>
      <Dot tone={tone === 'ok' ? 'bg-emerald-500' : tone === 'warn' ? 'bg-yellow-500' : 'bg-gray-400'} />
      {children}
    </span>
  )
}

function Dot({ tone, pulse }) {
  return (
    <span className={`relative inline-block w-2 h-2 rounded-full ${tone}`}>
      {pulse && (
        <span className={`absolute inset-0 rounded-full ${tone} animate-ping opacity-75`} />
      )}
    </span>
  )
}
