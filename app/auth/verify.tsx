import { useEffect, useState } from 'react'
import { View, Text, ActivityIndicator } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import * as Linking from 'expo-linking'
import { SafeAreaView } from 'react-native-safe-area-context'
import { supabase } from '../../lib/supabase'

/**
 * Landing screen for magic link redirects.
 *
 * When the user taps the email magic link, iOS opens:
 *   https://familyvault.app/auth/verify#access_token=...&refresh_token=...
 *
 * The root layout routes this universal link to this screen.
 * We parse the fragment, hand the tokens to Supabase, then navigate to the app.
 */
export default function VerifyScreen() {
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Try to get the URL that opened the app (universal link contains the hash)
    Linking.getInitialURL().then((url) => {
      if (url) extractAndApply(url)
    })

    // Also listen for URLs while the app is already open
    const sub = Linking.addEventListener('url', ({ url }) => extractAndApply(url))
    return () => sub.remove()
  }, [])

  async function extractAndApply(url: string) {
    const fragment = url.split('#')[1]
    if (!fragment) return

    const params = new URLSearchParams(fragment)
    const access_token  = params.get('access_token')
    const refresh_token = params.get('refresh_token')

    if (!access_token || !refresh_token) {
      setError('Invalid magic link. Please request a new one.')
      return
    }

    const { error } = await supabase.auth.setSession({ access_token, refresh_token })
    if (error) {
      setError(error.message)
      return
    }

    // Auth state change in useAuth will handle the redirect, but push explicitly
    router.replace('/(tabs)/feed')
  }

  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50 items-center justify-center px-6">
        <Text style={{ fontSize: 48 }}>⚠️</Text>
        <Text className="text-xl font-bold text-slate-900 mt-4 text-center">Sign-in failed</Text>
        <Text className="text-slate-500 mt-2 text-center">{error}</Text>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50 items-center justify-center">
      <ActivityIndicator size="large" color="#0f172a" />
      <Text className="text-slate-500 mt-4">Signing you in…</Text>
    </SafeAreaView>
  )
}
