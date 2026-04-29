import { useState, useEffect, useCallback } from 'react'
import { AppState } from 'react-native'
import { supabase } from '../lib/supabase'
import { registerPushToken } from './usePushNotifications'

export interface Profile {
  id:         string
  name:       string
  initials:   string
  color:      string
  created_at: string
}

export function useAuth() {
  const [session, setSession]   = useState<any>(null)
  const [profile, setProfile]   = useState<Profile | null>(null)
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) fetchProfile(session.user.id)
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) {
        fetchProfile(session.user.id)
        // Register APNs token on every sign-in (token can rotate)
        registerPushToken(session.user.id)
      } else {
        setProfile(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function fetchProfile(userId: string) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    setProfile(data)
    setLoading(false)
  }

  const signIn = useCallback(async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    })
    return { error }
  }, [])

  const createProfile = useCallback(async ({ name, color = '#1d4ed8' }: { name: string; color?: string }) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: new Error('No session') }

    const initials = name.trim().split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)
    const { data, error } = await supabase
      .from('profiles')
      .insert({ id: user.id, name: name.trim(), initials, color })
      .select()
      .single()
    if (!error) setProfile(data)
    return { error }
  }, [])

  const updateProfile = useCallback(async (updates: Partial<Pick<Profile, 'name' | 'color'>>) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: new Error('No session') }

    let patch: Record<string, string> = { ...updates }
    if (updates.name) {
      patch.initials = updates.name.trim().split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)
    }
    const { data, error } = await supabase
      .from('profiles')
      .update(patch)
      .eq('id', user.id)
      .select()
      .single()
    if (!error) setProfile(data)
    return { error }
  }, [])

  const signOut = useCallback(() => supabase.auth.signOut(), [])

  return { session, profile, loading, signIn, createProfile, updateProfile, signOut }
}
