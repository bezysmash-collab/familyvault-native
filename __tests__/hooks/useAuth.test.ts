import { renderHook, act, waitFor } from '@testing-library/react-native'

jest.mock('../../hooks/usePushNotifications', () => ({
  registerPushToken: jest.fn(),
}))

import { supabase, createBuilder } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'

beforeEach(() => {
  jest.clearAllMocks()
  ;(supabase.auth.getSession as jest.Mock).mockResolvedValue({ data: { session: null } })
  ;(supabase.auth.onAuthStateChange as jest.Mock).mockReturnValue({
    data: { subscription: { unsubscribe: jest.fn() } },
  })
  ;(supabase.auth.getUser as jest.Mock).mockResolvedValue({ data: { user: { id: 'test-user-id' } } })
  ;(supabase.from as jest.Mock).mockReturnValue(createBuilder({ data: null, error: null }))
})

describe('useAuth', () => {
  // RN-T44
  it('signIn calls signInWithOtp with the provided email', async () => {
    const { result } = renderHook(() => useAuth())
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.signIn('alice@example.com')
    })

    expect(supabase.auth.signInWithOtp).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'alice@example.com' })
    )
  })

  // RN-T45 — signIn sends only email, no magic link redirect (OTP-only flow)
  it('signIn calls signInWithOtp with only the email', async () => {
    const { result } = renderHook(() => useAuth())
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.signIn('alice@example.com')
    })

    expect(supabase.auth.signInWithOtp).toHaveBeenCalledWith({ email: 'alice@example.com' })
  })

  // RN-T46
  it('createProfile generates two-character uppercase initials from a two-word name', async () => {
    const session = { user: { id: 'uid-1' } }
    ;(supabase.auth.getSession as jest.Mock).mockResolvedValue({ data: { session } })
    ;(supabase.auth.getUser as jest.Mock).mockResolvedValue({ data: { user: { id: 'uid-1' } } })
    ;(supabase.from as jest.Mock).mockReturnValue(
      createBuilder({ data: { id: 'uid-1', name: 'John Doe', initials: 'JD', color: '#1d4ed8' }, error: null })
    )

    const { result } = renderHook(() => useAuth())
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.createProfile({ name: 'John Doe' })
    })

    const insertBuilder = (supabase.from as jest.Mock).mock.results.find(
      (r: any) => r.value?.insert?.mock?.calls?.length > 0
    )?.value
    const [insertArgs] = insertBuilder?.insert?.mock?.calls?.[0] ?? [[]]
    expect(insertArgs?.initials).toBe('JD')
  })

  // RN-T47
  it('createProfile uses the session user id as the profile row id', async () => {
    const session = { user: { id: 'the-real-uid' } }
    ;(supabase.auth.getSession as jest.Mock).mockResolvedValue({ data: { session } })
    ;(supabase.auth.getUser as jest.Mock).mockResolvedValue({ data: { user: { id: 'the-real-uid' } } })
    ;(supabase.from as jest.Mock).mockReturnValue(
      createBuilder({ data: { id: 'the-real-uid', name: 'Alice', initials: 'A', color: '#1d4ed8' }, error: null })
    )

    const { result } = renderHook(() => useAuth())
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.createProfile({ name: 'Alice' })
    })

    const insertBuilder = (supabase.from as jest.Mock).mock.results.find(
      (r: any) => r.value?.insert?.mock?.calls?.length > 0
    )?.value
    const [insertArgs] = insertBuilder?.insert?.mock?.calls?.[0] ?? [[]]
    expect(insertArgs?.id).toBe('the-real-uid')
  })
})
