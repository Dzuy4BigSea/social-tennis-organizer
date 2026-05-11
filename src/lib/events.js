import { supabase } from './supabase.js'

// Supabase-backed equivalents of the old tennis-save.php endpoints.
// The store keeps using 6-char room codes as the user-facing identity;
// internally we map code → event uuid via event_join_codes, and the
// canonical state blob lives in event_state.state (jsonb).

async function eventIdForCode(code) {
  const { data } = await supabase
    .from('event_join_codes')
    .select('event_id')
    .eq('code', code)
    .maybeSingle()
  return data?.event_id ?? null
}

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

// First-time save now goes through the create_event_with_code RPC
// (migration 0003), which inserts events / event_join_codes /
// event_state in one transaction. Subsequent saves are just an upsert
// on event_state. The RPC does the club lookup + pro/head_pro check
// server-side, so the client doesn't need to fetch the club id first.
export async function saveEventByCode(code, state) {
  if (!code) return { ok: false, status: 400 }
  const { data: userRes } = await supabase.auth.getUser()
  const user = userRes?.user
  if (!user) return { ok: false, status: 401 }

  let id = await eventIdForCode(code)

  if (!id) {
    const t = state?.tournament || {}
    const status =
      state?.phase === 'live' ? 'live'
      : state?.phase === 'completed' ? 'completed'
      : 'draft'

    const { data: newId, error: rpcErr } = await supabase.rpc('create_event_with_code', {
      p_code: code,
      p_name: t.name || 'Untitled event',
      // The detailed kind lives per-division inside state; events.event_type
      // is just a tag for cross-event queries. "mixed" until we add UI.
      p_event_type: 'mixed',
      p_status: status,
      p_state: state,
    })
    if (rpcErr) {
      // 42501 = insufficient_privilege. Raised by the RPC when the
      // caller has no club or no pro/head_pro role on it; surface as
      // 403 so the store's saveStatus reaches 'forbidden'.
      if (rpcErr.code === '42501') return { ok: false, status: 403 }
      return { ok: false, status: 500 }
    }
    return { ok: true, status: 200 }
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
