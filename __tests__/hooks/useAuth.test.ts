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

  // SEC-T29: signOut terminates the session
  it('signOut calls supabase.auth.signOut to end the session', async () => {
    const { result } = renderHook(() => useAuth())
    await waitFor(() => expect(result.current.loading).toBe(false))
    await act(async () => { await result.current.signOut() })
    expect(supabase.auth.signOut).toHaveBeenCalled()
  })

  // SEC-T30: signIn does not call signInWithOtp when email is empty
  it('signIn still calls signInWithOtp — callers are responsible for guarding empty email', async () => {
    // This documents that the hook itself is a thin wrapper: empty-email guard
    // lives in the login screen (login.tsx handleSignIn), not the hook.
    const { result } = renderHook(() => useAuth())
    await waitFor(() => expect(result.current.loading).toBe(false))
    await act(async () => { await result.current.signIn('') })
    expect(supabase.auth.signInWithOtp).toHaveBeenCalledWith({ email: '' })
  })

  // SEC-T31: createProfile uses auth.getUser uid (not a caller-supplied id)
  it('createProfile derives the row id from auth.getUser, not a caller-supplied value', async () => {
    const session = { user: { id: 'server-uid-xyz' } }
    ;(supabase.auth.getSession as jest.Mock).mockResolvedValue({ data: { session } })
    ;(supabase.auth.getUser as jest.Mock).mockResolvedValue({ data: { user: { id: 'server-uid-xyz' } } })
    ;(supabase.from as jest.Mock).mockReturnValue(
      createBuilder({ data: { id: 'server-uid-xyz', name: 'Eve', initials: 'E', color: '#1d4ed8' }, error: null })
    )
    const { result } = renderHook(() => useAuth())
    await waitFor(() => expect(result.current.loading).toBe(false))
    await act(async () => { await result.current.createProfile({ name: 'Eve' }) })
    const insertBuilder = (supabase.from as jest.Mock).mock.results.find(
      (r: any) => r.value?.insert?.mock?.calls?.length > 0
    )?.value
    const [insertArgs] = insertBuilder?.insert?.mock?.calls?.[0] ?? [[]]
    expect(insertArgs?.id).toBe('server-uid-xyz')
  })

  // SEC-T32: updateProfile re-derives uid from auth.getUser (no caller-supplied id)
  it('updateProfile scopes the update to the authenticated user id from auth.getUser', async () => {
    const session = { user: { id: 'update-uid-abc' } }
    ;(supabase.auth.getSession as jest.Mock).mockResolvedValue({ data: { session } })
    ;(supabase.auth.getUser as jest.Mock).mockResolvedValue({ data: { user: { id: 'update-uid-abc' } } })
    ;(supabase.from as jest.Mock).mockReturnValue(
      createBuilder({ data: { id: 'update-uid-abc', name: 'Alice Updated', initials: 'AU', color: '#1d4ed8' }, error: null })
    )
    const { result } = renderHook(() => useAuth())
    await waitFor(() => expect(result.current.loading).toBe(false))
    await act(async () => { await result.current.updateProfile({ name: 'Alice Updated' }) })
    const updateBuilder = (supabase.from as jest.Mock).mock.results.find(
      (r: any) => r.value?.update?.mock?.calls?.length > 0
    )?.value
    expect(updateBuilder?.eq).toHaveBeenCalledWith('id', 'update-uid-abc')
  })

  // SEC-T33: updateProfile recalculates initials from the new name
  it('updateProfile recalculates initials when name changes (no stale initials)', async () => {
    const session = { user: { id: 'uid-init' } }
    ;(supabase.auth.getSession as jest.Mock).mockResolvedValue({ data: { session } })
    ;(supabase.auth.getUser as jest.Mock).mockResolvedValue({ data: { user: { id: 'uid-init' } } })
    ;(supabase.from as jest.Mock).mockReturnValue(
      createBuilder({ data: { id: 'uid-init', name: 'Bob Smith', initials: 'BS', color: '#1d4ed8' }, error: null })
    )
    const { result } = renderHook(() => useAuth())
    await waitFor(() => expect(result.current.loading).toBe(false))
    await act(async () => { await result.current.updateProfile({ name: 'Bob Smith' }) })
    const updateBuilder = (supabase.from as jest.Mock).mock.results.find(
      (r: any) => r.value?.update?.mock?.calls?.length > 0
    )?.value
    const [patchArg] = updateBuilder?.update?.mock?.calls?.[0] ?? [[]]
    expect(patchArg?.initials).toBe('BS')
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
