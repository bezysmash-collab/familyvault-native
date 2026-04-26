import { useEffect, useState } from 'react'
import { View, Text, ActivityIndicator } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import * as SecureStore from 'expo-secure-store'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useInvite } from '../../hooks/useInvite'
import { useAuth } from '../../hooks/useAuth'

export const PENDING_INVITE_KEY = 'pending_invite_token'

export default function JoinScreen() {
  const { token }            = useLocalSearchParams<{ token: string }>()
  const { validateToken, markUsed } = useInvite()
  const { session }          = useAuth()
  const [status, setStatus]  = useState<'checking' | 'valid' | 'invalid'>('checking')

  useEffect(() => {
    if (!token) { router.replace('/auth/login'); return }
    check()
  }, [token])

  async function check() {
    const { valid } = await validateToken(token)
    if (!valid) { setStatus('invalid'); return }

    setStatus('valid')

    if (session) {
      // Already signed in — mark the invite used and go to the feed
      await markUsed(token)
      router.replace('/(tabs)/feed')
    } else {
      // Stash the token so the login/profile-setup flow can consume it
      await SecureStore.setItemAsync(PENDING_INVITE_KEY, token)
      router.replace('/auth/login')
    }
  }

  if (status === 'invalid') {
    return (
      <SafeAreaView className="flex-1 bg-slate-50 items-center justify-center px-6">
        <Text style={{ fontSize: 48 }}>🚫</Text>
        <Text className="text-xl font-bold text-slate-900 mt-4 text-center">Invite expired</Text>
        <Text className="text-slate-500 mt-2 text-center">
          This invite link is no longer valid. Ask a family member for a new one.
        </Text>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50 items-center justify-center">
      <ActivityIndicator size="large" color="#0f172a" />
      <Text className="text-slate-500 mt-4">Validating invite…</Text>
    </SafeAreaView>
  )
}
