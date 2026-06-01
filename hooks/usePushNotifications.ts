import { useEffect, useRef } from 'react'
import * as Notifications from 'expo-notifications'
import { Platform } from 'react-native'
import { supabase } from '../lib/supabase'

/**
 * Registers the device APNs token with Supabase for the given user.
 * Safe to call on every app launch — uses upsert on the unique (user_id, token) constraint.
 *
 * apns_env: development builds (expo run:ios, dev EAS) use APNs sandbox;
 * release/preview/production EAS builds use APNs production.
 */
export async function registerPushToken(userId: string) {
  if (Platform.OS !== 'ios') return

  const { status } = await Notifications.requestPermissionsAsync()
  if (status !== 'granted') return

  let token: string
  try {
    const result = await Notifications.getDevicePushTokenAsync()
    token = result.data
  } catch {
    return
  }

  // __DEV__ is true for Metro dev-server builds (development provisioning → APNs sandbox).
  // Release/preview/production EAS builds have __DEV__ = false (ad-hoc/App Store → APNs production).
  const apnsEnv = __DEV__ ? 'sandbox' : 'production'

  await supabase.from('device_tokens').upsert(
    { user_id: userId, token, platform: 'ios', apns_env: apnsEnv },
    { onConflict: 'user_id,token' }
  )
}

/**
 * Hook that wires up foreground notification display and response handling.
 * Call once in the root layout (_layout.tsx).
 */
export function usePushNotifications(onNotificationTap?: (data: Record<string, string>) => void) {
  const responseListenerRef = useRef<Notifications.Subscription>()
  const receivedListenerRef = useRef<Notifications.Subscription>()

  useEffect(() => {
    // Show banners even while app is foregrounded
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge:  true,
      }),
    })

    receivedListenerRef.current = Notifications.addNotificationReceivedListener(() => {
      // Badge is incremented by the Edge Function; nothing extra needed here
    })

    responseListenerRef.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as Record<string, string>
      onNotificationTap?.(data)
    })

    return () => {
      receivedListenerRef.current?.remove()
      responseListenerRef.current?.remove()
    }
  }, [onNotificationTap])
}
