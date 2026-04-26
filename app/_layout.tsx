import { useEffect } from 'react'
import { Stack, router } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import * as Notifications from 'expo-notifications'
import * as Linking from 'expo-linking'
import * as SplashScreen from 'expo-splash-screen'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { useAuth } from '../hooks/useAuth'
import { usePushNotifications } from '../hooks/usePushNotifications'
import '../global.css'

SplashScreen.preventAutoHideAsync()

function handleNotificationTap(data: Record<string, string>) {
  if (data.screen === 'feed')   router.push('/(tabs)/feed')
  if (data.screen === 'tasks')  router.push('/(tabs)/tasks')
}

export default function RootLayout() {
  const { session, profile, loading } = useAuth()
  usePushNotifications(handleNotificationTap)

  // Route guard based on auth state
  useEffect(() => {
    if (loading) return
    SplashScreen.hideAsync()
    if (!session)  { router.replace('/auth/login');         return }
    if (!profile)  { router.replace('/auth/profile-setup'); return }
  }, [session, profile, loading])

  // Handle universal link / deep link (e.g. familyvault://join/TOKEN)
  useEffect(() => {
    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink(url)
    })
    const sub = Linking.addEventListener('url', ({ url }) => handleDeepLink(url))
    return () => sub.remove()
  }, [])

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)"      options={{ headerShown: false }} />
          <Stack.Screen name="auth/login"         options={{ presentation: 'modal' }} />
          <Stack.Screen name="auth/verify"        options={{ headerShown: false }} />
          <Stack.Screen name="auth/profile-setup" options={{ headerShown: false }} />
          <Stack.Screen name="join/[token]"       options={{ headerShown: false }} />
          <Stack.Screen name="settings"           options={{ presentation: 'modal', headerShown: false }} />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}

function handleDeepLink(url: string) {
  const parsed = Linking.parse(url)
  if (parsed.path?.startsWith('join/')) {
    const token = parsed.path.replace('join/', '')
    router.push(`/join/${token}`)
  }
  if (parsed.path === 'auth/verify') {
    router.push('/auth/verify')
  }
}
