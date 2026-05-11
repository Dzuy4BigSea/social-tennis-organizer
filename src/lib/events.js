import { supabase } from './supabase.js'

// Supabase-backed equivalents of the old tennis-save.php endpoints.
// The store keeps using 6-char room codes as the user-facing identity;
// internally we map code → event uuid via event_join_codes, and the
// canonical state blob lives in event_state.state (jsonb).

let _clubIdCache = null
async function getCurrentClubId() {
  if (_clubIdCache) return _clubIdCache
  const { data: userRes } = await supabase.auth.getUser()
  if (!userRes?.user) return null
  const { data } = await supabase
    .from('roles')
    .select('club_id')
    .eq('user_id', userRes.user.id)
    .limit(1)
    .maybeSingle()
  _clubIdCache = data?.club_id ?? null
  return _clubIdCache
}

async function eventIdForCode(code) {
  const { data } = await supabase
    .from('event_join_codes')
    .select('event_id')
    .eq('code', code)
    .maybeSingle()
  return data?.event_id ?? null
}

// Reset the cached club id when the session changes; otherwise a
// sign-out / sign-in as a different user would still see the
// previous user's club. The Supabase client emits SIGNED_IN /
// SIGNED_OUT events on auth state transitions.
supabase.auth.onAuthStateChange(() => {
  _clubIdCache = null
})

export async function loadEventByCode(code) {
  if (!code) return null
  const id = await eventIdForCode(code)
  if (!id) return null
  const { data, error } = await supabase
    .from('event_state')
    .select('state')
    .eq('event_id', id)
    .maybeSingle()
  if (error) return null
  return data?.state ?? null
}

// First-time save creates the events row, the event_state row, and the
// event_join_codes row in three sequential inserts. Not transactional
// today — if the second or third fails we'd leave an orphan row. That's
// acceptable for Phase 3 (the most common path is the happy one);
// Phase 4 will move this behind a single Postgres RPC.
export async function saveEventByCode(code, state) {
  if (!code) return { ok: false, status: 400 }
  const { data: userRes } = await supabase.auth.getUser()
  const user = userRes?.user
  if (!user) return { ok: false, status: 401 }

  let id = await eventIdForCode(code)

  if (!id) {
    const clubId = await getCurrentClubId()
    if (!clubId) return { ok: false, status: 403 }

    const t = state?.tournament || {}
    const status =
      state?.phase === 'live' ? 'live'
      : state?.phase === 'completed' ? 'completed'
      : 'draft'

    const { data: ev, error: evErr } = await supabase
      .from('events')
      .insert({
        club_id: clubId,
        owner_id: user.id,
        name: t.name || 'Untitled event',
        // The detailed kind lives per-division inside state; events.event_type
        // is just a tag for cross-event queries. "mixed" until we add UI.
        event_type: 'mixed',
        status,
      })
      .select('id')
      .single()
    if (evErr) return { ok: false, status: 500 }
    id = ev.id

    const { error: codeErr } = await supabase
      .from('event_join_codes')
      .insert({ code, event_id: id, created_by: user.id })
    if (codeErr) return { ok: false, status: 500 }
  }

  const { error: stateErr } = await supabase
    .from('event_state')
    .upsert(
      { event_id: id, state, updated_at: new Date().toISOString() },
      { onConflict: 'event_id' }
    )
  if (stateErr) {
    // 42501 = insufficient_privilege from RLS. Surface it like the old
    // PHP 403 so the store's saveStatus reaches 'forbidden' and the
    // user gets a real error chip instead of a silent failure.
    if (stateErr.code === '42501') return { ok: false, status: 403 }
    return { ok: false, status: 500 }
  }
  return { ok: true, status: 200 }
}

// Fire-and-forget save on tab unload. The supabase-js client uses
// fetch under the hood and doesn't take a `keepalive` option, so we
// just kick the normal save and let the browser deliver it on a best-
// effort basis. Most events are caught by the debounced save before
// unload anyway; this is the last line of defense.
export function saveEventByCodeBeacon(code, state) {
  saveEventByCode(code, state).catch(() => {})
}
