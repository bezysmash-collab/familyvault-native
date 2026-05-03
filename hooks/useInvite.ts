import { useCallback } from 'react'
import { Share } from 'react-native'
import { supabase } from '../lib/supabase'

const APP_BASE_URL = 'https://familyvault.app'

export function useInvite() {
  const createInvite = useCallback(async (email: string | null = null) => {
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase
      .from('invites')
      .insert({ invited_by: user.id, email })
      .select()
      .single()
    if (error) return { error }
    const link = `${APP_BASE_URL}/join/${data.token}`
    return { link, token: data.token }
  }, [])

  const shareInvite = useCallback(async (email: string | null = null) => {
    const { link, error } = await createInvite(email)
    if (error || !link) return { error }
    await Share.share({
      message: `Join our Family Vault! ${link}`,
      url: link,
    })
    return { link }
  }, [createInvite])

  const validateToken = useCallback(async (token: string) => {
    const { data, error } = await supabase
      .from('invites')
      .select('*')
      .eq('token', token)
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())
      .single()
    if (error || !data) return { valid: false }
    return { valid: true, invite: data }
  }, [])

  const markUsed = useCallback(async (token: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase
      .from('invites')
      .update({ used: true, used_by: user.id })
      .eq('token', token)
      .eq('used', false)
  }, [])

  return { createInvite, shareInvite, validateToken, markUsed }
}
