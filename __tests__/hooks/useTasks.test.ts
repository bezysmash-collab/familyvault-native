import { renderHook, act, waitFor } from '@testing-library/react-native'


import { supabase, createBuilder, channelHandlers } from '../../lib/supabase'
import { useTasks } from '../../hooks/useTasks'

const task = {
  id: 'task-1', title: 'Buy milk', done: false, done_at: null,
  created_by: 'user-1', assigned_to: null, space_id: null,
  created_at: new Date().toISOString(),
  created_by_profile: null, assigned_to_profile: null, space: null,
}

beforeEach(() => {
  Object.keys(channelHandlers).forEach((k) => delete channelHandlers[k])
  ;(supabase.from as jest.Mock).mockReturnValue(createBuilder({ data: [task], error: null }))
})

describe('useTasks', () => {
  // RN-T39
  it('fetches and returns tasks on mount', async () => {
    const { result } = renderHook(() => useTasks())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.tasks).toHaveLength(1)
    expect(result.current.tasks[0].title).toBe('Buy milk')
  })

  // RN-T40
  it('task UPDATE patches done/done_at without a network call', async () => {
    const { result } = renderHook(() => useTasks())
    await waitFor(() => !!(channelHandlers as any)['UPDATE:tasks'])
    ;(supabase.from as jest.Mock).mockClear()

    act(() => {
      channelHandlers['UPDATE:tasks']?.({
        new: { id: 'task-1', done: true, done_at: new Date().toISOString() },
      })
    })

    expect(supabase.from).not.toHaveBeenCalled()
    expect(result.current.tasks[0].done).toBe(true)
  })

  // RN-T41
  it('task DELETE removes the task without a network call', async () => {
    const { result } = renderHook(() => useTasks())
    await waitFor(() => expect(result.current.loading).toBe(false))
    ;(supabase.from as jest.Mock).mockClear()

    act(() => {
      channelHandlers['DELETE:tasks']?.({ old: { id: 'task-1' } })
    })

    expect(supabase.from).not.toHaveBeenCalled()
    expect(result.current.tasks).toHaveLength(0)
  })
})
