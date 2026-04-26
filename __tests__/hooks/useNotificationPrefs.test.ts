import { renderHook, act, waitFor } from '@testing-library/react-native'


import { supabase, createBuilder } from '../../lib/supabase'
import { useNotificationPrefs } from '../../hooks/useNotificationPrefs'

const defaultPrefs = {
  user_id:          'user-1',
  new_post:         true,
  reaction_on_post: true,
  comment_on_post:  true,
  task_assigned:    true,
  task_completed:   false,
  updated_at:       new Date().toISOString(),
}

beforeEach(() => {
  jest.clearAllMocks()
  ;(supabase.from as jest.Mock).mockReturnValue(createBuilder({ data: defaultPrefs, error: null }))
})

describe('useNotificationPrefs', () => {
  // RN-T48
  it('loads the user preferences on mount', async () => {
    const { result } = renderHook(() => useNotificationPrefs('user-1'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.prefs?.new_post).toBe(true)
    expect(result.current.prefs?.task_completed).toBe(false)
  })

  // RN-T49
  it('does not fetch when userId is undefined', () => {
    renderHook(() => useNotificationPrefs(undefined))
    expect(supabase.from).not.toHaveBeenCalled()
  })

  // RN-T50 — optimistic update
  it('update applies an optimistic value before the upsert resolves', async () => {
    ;(supabase.from as jest.Mock)
      .mockReturnValueOnce(createBuilder({ data: defaultPrefs, error: null }))  // initial fetch
      .mockReturnValue(createBuilder({ data: null, error: null }))              // upsert

    const { result } = renderHook(() => useNotificationPrefs('user-1'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    act(() => {
      result.current.update('task_completed', true)
    })

    // Optimistic update should be immediate
    expect(result.current.prefs?.task_completed).toBe(true)
  })

  // RN-T51 — reverts on error
  it('reverts the optimistic value if the upsert returns an error', async () => {
    ;(supabase.from as jest.Mock)
      .mockReturnValueOnce(createBuilder({ data: defaultPrefs, error: null }))    // initial fetch
      .mockReturnValue(createBuilder({ data: null, error: { message: 'DB error' } })) // upsert fails

    const { result } = renderHook(() => useNotificationPrefs('user-1'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.update('task_completed', true)
    })

    // Should have reverted after the error
    expect(result.current.prefs?.task_completed).toBe(false)
  })

  // RN-T52 — all five preference keys are present
  it('loads all five preference keys', async () => {
    const { result } = renderHook(() => useNotificationPrefs('user-1'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    const prefs = result.current.prefs!
    expect(prefs).toHaveProperty('new_post')
    expect(prefs).toHaveProperty('reaction_on_post')
    expect(prefs).toHaveProperty('comment_on_post')
    expect(prefs).toHaveProperty('task_assigned')
    expect(prefs).toHaveProperty('task_completed')
  })
})
