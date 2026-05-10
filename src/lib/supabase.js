import { createClient } from '@supabase/supabase-js'

// Supabase URL + publishable (anon) key. These end up in the client bundle by
// design — actual access control lives in Row Level Security. Vite env vars
// take precedence so a future staging project can override at build time
// without code changes.
const url =
  import.meta.env.VITE_SUPABASE_URL ||
  'https://qesqaddkqwveyxnlxrgr.supabase.co'

const anonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'sb_publishable_zbK-mLe9y91qc4unCZkyeA_Ukrg0h0H'

export const supabase = createClient(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})
