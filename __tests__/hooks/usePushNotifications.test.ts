import * as Notifications from 'expo-notifications'

jest.mock('expo-notifications')

import { supabase, createBuilder } from '../../lib/supabase'
import { registerPushToken } from '../../hooks/usePushNotifications'

beforeEach(() => {
  jest.clearAllMocks()
  ;(Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' })
  ;(Notifications.getDevicePushTokenAsync as jest.Mock).mockResolvedValue({ data: 'mock-apns-token-abc123' })
  ;(supabase.from as jest.Mock).mockReturnValue(createBuilder({ data: null, error: null }))
})

describe('registerPushToken', () => {
  // RN-T53
  it('requests notification permissions before fetching the token', async () => {
    await registerPushToken('user-1')
    expect(Notifications.requestPermissionsAsync).toHaveBeenCalled()
  })

  // RN-T54
  it('calls getDevicePushTokenAsync to obtain the APNs token', async () => {
    await registerPushToken('user-1')
    expect(Notifications.getDevicePushTokenAsync).toHaveBeenCalled()
  })

  // RN-T55
  it('upserts the device token into device_tokens with the user_id', async () => {
    await registerPushToken('user-1')
    const upsertBuilder = (supabase.from as jest.Mock).mock.results[0].value
    expect(upsertBuilder.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 'user-1', token: 'mock-apns-token-abc123', platform: 'ios' }),
      expect.objectContaining({ onConflict: 'user_id,token' })
    )
  })

  // RN-T56
  it('does not upsert if permission is denied', async () => {
    ;(Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'denied' })
    await registerPushToken('user-1')
    expect(supabase.from).not.toHaveBeenCalled()
  })

  // RN-T57
  it('does not upsert if getDevicePushTokenAsync throws', async () => {
    ;(Notifications.getDevicePushTokenAsync as jest.Mock).mockRejectedValue(new Error('No token'))
    await registerPushToken('user-1')
    expect(supabase.from).not.toHaveBeenCalled()
  })
})
