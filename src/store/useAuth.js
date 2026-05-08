import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { getSupabase, isSupabaseConfigured } from '../lib/supabase.js'

const AuthContext = createContext(null)
const CURRENT_ORG_KEY = 'tennis-current-org'

export function AuthProvider({ children }) {
  const configured = isSupabaseConfigured()
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [orgs, setOrgs] = useState([])
  const [currentOrgId, setCurrentOrgId] = useState(null)
  const [loading, setLoading] = useState(configured)

  useEffect(() => {
    if (!configured) return
    const supabase = getSupabase()
    let mounted = true

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return
      setSession(data.session ?? null)
      setLoading(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!mounted) return
      setSession(newSession)
    })

    return () => {
      mounted = false
      sub.subscription.unsubscribe()
    }
  }, [configured])

  useEffect(() => {
    if (!configured || !session?.user) {
      setProfile(null)
      setOrgs([])
      setCurrentOrgId(null)
      return
    }
    let mounted = true
    const supabase = getSupabase()

    supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!mounted) return
        if (error) console.error('[auth] failed to load profile', error)
        setProfile(data ?? null)
      })

    supabase
      .from('orgs')
      .select('id, name, slug, created_at')
      .order('created_at')
      .then(({ data, error }) => {
        if (!mounted) return
        if (error) {
          console.error('[auth] failed to load orgs', error)
          setOrgs([])
          return
        }
        setOrgs(data ?? [])
        const saved = localStorage.getItem(CURRENT_ORG_KEY)
        const valid = saved && (data ?? []).some((o) => o.id === saved)
        setCurrentOrgId(valid ? saved : (data?.[0]?.id ?? null))
      })

    return () => {
      mounted = false
    }
  }, [configured, session?.user?.id])

  const switchOrg = useCallback((orgId) => {
    setCurrentOrgId(orgId)
    if (orgId) localStorage.setItem(CURRENT_ORG_KEY, orgId)
    else localStorage.removeItem(CURRENT_ORG_KEY)
  }, [])

  const refreshOrgs = useCallback(async () => {
    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('orgs')
      .select('id, name, slug, created_at')
      .order('created_at')
    if (error) throw error
    setOrgs(data ?? [])
    return data ?? []
  }, [])

  const signIn = useCallback(async (email, password) => {
    const supabase = getSupabase()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }, [])

  const signUp = useCallback(async (email, password) => {
    const supabase = getSupabase()
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) throw error
    return data
  }, [])

  const signOut = useCallback(async () => {
    const supabase = getSupabase()
    await supabase.auth.signOut()
    setProfile(null)
    setOrgs([])
    setCurrentOrgId(null)
    localStorage.removeItem(CURRENT_ORG_KEY)
  }, [])

  const saveDisplayName = useCallback(
    async (displayName) => {
      if (!session?.user) throw new Error('not signed in')
      const supabase = getSupabase()
      const { data, error } = await supabase
        .from('profiles')
        .upsert({ id: session.user.id, display_name: displayName })
        .select()
        .single()
      if (error) throw error
      setProfile(data)
    },
    [session?.user?.id]
  )

  const createOrg = useCallback(
    async (name, slug) => {
      if (!session?.user) throw new Error('not signed in')
      const supabase = getSupabase()
      const { data, error } = await supabase
        .from('orgs')
        .insert({ name, slug, created_by: session.user.id })
        .select()
        .single()
      if (error) throw error
      const fresh = await refreshOrgs()
      const created = fresh.find((o) => o.id === data.id) ?? data
      setCurrentOrgId(created.id)
      localStorage.setItem(CURRENT_ORG_KEY, created.id)
      return created
    },
    [session?.user?.id, refreshOrgs]
  )

  const redeemInvite = useCallback(
    async (code) => {
      const supabase = getSupabase()
      const { data: orgId, error } = await supabase.rpc('redeem_org_invite', {
        invite_code: code,
      })
      if (error) throw error
      const fresh = await refreshOrgs()
      const joined = fresh.find((o) => o.id === orgId)
      if (joined) {
        setCurrentOrgId(joined.id)
        localStorage.setItem(CURRENT_ORG_KEY, joined.id)
      }
      return joined ?? null
    },
    [refreshOrgs]
  )

  const currentOrg = orgs.find((o) => o.id === currentOrgId) ?? null

  const value = {
    configured,
    loading,
    session,
    user: session?.user ?? null,
    profile,
    orgs,
    currentOrg,
    currentOrgId,
    switchOrg,
    signIn,
    signUp,
    signOut,
    saveDisplayName,
    createOrg,
    redeemInvite,
  }

  return React.createElement(AuthContext.Provider, { value }, children)
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
