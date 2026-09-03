import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from './supabaseClient'
import { DEFAULT_ROLE, canAdminister, canTeach, isKnownRole } from './roles'

const AuthContext = createContext(null)

/**
 * Holds the Supabase session plus the matching row from `profiles`, which is
 * where a user's role (see `roles.js`) and display name live.
 */
export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadProfile = useCallback(async (userId) => {
    if (!userId) { setProfile(null); return }

    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, full_name, role, avatar')
      .eq('id', userId)
      .maybeSingle()

    if (error) {
      console.error('Could not load profile:', error.message)
      setProfile(null)
      return
    }
    setProfile(data)
  }, [])

  useEffect(() => {
    let active = true

    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return
      setSession(data.session)
      await loadProfile(data.session?.user?.id)
      if (active) setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, next) => {
      if (!active) return
      setSession(next)
      await loadProfile(next?.user?.id)
      setLoading(false)
    })

    return () => { active = false; subscription.unsubscribe() }
  }, [loadProfile])

  // A role the app no longer knows (renamed, or written straight into the
  // database) must not lock anyone out, so it reads as the default.
  const role = isKnownRole(profile?.role) ? profile.role : DEFAULT_ROLE

  const value = useMemo(() => ({
    session,
    user: session?.user ?? null,
    profile,
    loading,
    role,
    isTeacher: canTeach(role),
    isAdmin: canAdminister(role),
    displayName: profile?.full_name || session?.user?.email?.split('@')[0] || 'there',
    refreshProfile: () => loadProfile(session?.user?.id),
    signOut: () => supabase.auth.signOut()
  }), [session, profile, loading, role, loadProfile])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside an <AuthProvider>')
  return context
}
