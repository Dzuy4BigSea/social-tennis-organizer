import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { getSupabase, isSupabaseConfigured } from '../lib/supabase.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const configured = isSupabaseConfigured()
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
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
    return () => {
      mounted = false
    }
  }, [configured, session?.user?.id])

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

  const value = {
    configured,
    loading,
    session,
    user: session?.user ?? null,
    profile,
    signIn,
    signUp,
    signOut,
    saveDisplayName,
  }

  return React.createElement(AuthContext.Provider, { value }, children)
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
