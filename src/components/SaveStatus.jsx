import React from 'react'

/**
 * Compact sync-state badge. Lives in the page header so the pro can tell at
 * a glance whether their edits are persisting to the shared room. A
 * "forbidden" state means RLS blocked the write — the signed-in user
 * doesn't have a pro/head_pro role on this event's club.
 */
export default function SaveStatus({ status, hasRoomCode }) {
  if (!hasRoomCode) {
    return (
      <Badge tone="muted">Local only · create an event code to share</Badge>
    )
  }

  if (status === 'forbidden') {
    return (
      <Badge tone="danger">
        Saves blocked · your account can't edit this event
      </Badge>
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
    danger: 'bg-red-100 text-red-800 border-red-300',
    muted: 'bg-gray-100 text-gray-600 border-gray-200',
  }[tone]
  const dot =
    tone === 'ok' ? 'bg-emerald-500'
    : tone === 'warn' ? 'bg-yellow-500'
    : tone === 'danger' ? 'bg-red-500'
    : 'bg-gray-400'
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium ${cls}`}>
      <Dot tone={dot} />
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
