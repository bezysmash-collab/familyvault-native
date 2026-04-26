import { renderHook, act, waitFor } from '@testing-library/react-native'


import { supabase, createBuilder, channelHandlers, storageMock } from '../../lib/supabase'
import { usePosts } from '../../hooks/usePosts'

const PAGE_SIZE = 20
const author = { id: 'user-1', name: 'Alice', initials: 'AL', color: '#3b82f6' }

function makePost(id: string, overrides = {}) {
  return {
    id, type: 'text', content: `Post ${id}`,
    created_at: new Date(Date.now() - (parseInt(id.replace('post-', '')) || 0) * 60_000).toISOString(),
    attachment: null, author, space: null, comments: [], reactions: [],
    ...overrides,
  }
}

function makePosts(count: number) {
  return Array.from({ length: count }, (_, i) => makePost(`post-${i + 1}`))
}

beforeEach(() => {
  Object.keys(channelHandlers).forEach((k) => delete channelHandlers[k])
  ;(supabase.from as jest.Mock).mockReturnValue(createBuilder({ data: [], error: null }))
})

describe('usePosts — data fetching', () => {
  // RN-T22
  it('fetches posts with a PAGE_SIZE limit', async () => {
    ;(supabase.from as jest.Mock).mockReturnValue(createBuilder({ data: makePosts(5), error: null }))
    const { result } = renderHook(() => usePosts())
    await waitFor(() => expect(result.current.loading).toBe(false))
    const builder = (supabase.from as jest.Mock).mock.results[0].value
    expect(builder.limit).toHaveBeenCalledWith(PAGE_SIZE)
  })

  // RN-T23
  it('sets hasMore=true when exactly PAGE_SIZE posts are returned', async () => {
    ;(supabase.from as jest.Mock).mockReturnValue(createBuilder({ data: makePosts(PAGE_SIZE), error: null }))
    const { result } = renderHook(() => usePosts())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.hasMore).toBe(true)
  })

  // RN-T24
  it('sets hasMore=false when fewer than PAGE_SIZE posts are returned', async () => {
    ;(supabase.from as jest.Mock).mockReturnValue(createBuilder({ data: makePosts(5), error: null }))
    const { result } = renderHook(() => usePosts())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.hasMore).toBe(false)
  })
})

describe('usePosts — granular realtime: reactions', () => {
  async function setupWithPost(post: any) {
    ;(supabase.from as jest.Mock).mockReturnValue(createBuilder({ data: [post], error: null }))
    const hook = renderHook(() => usePosts())
    await waitFor(() => expect(hook.result.current.loading).toBe(false))
    ;(supabase.from as jest.Mock).mockClear()
    return hook
  }

  // RN-T25
  it('reaction INSERT updates state without a network call', async () => {
    const { result } = await setupWithPost(makePost('post-1'))
    act(() => {
      channelHandlers['INSERT:reactions']?.({
        new: { id: 'r1', post_id: 'post-1', user_id: 'user-2', type: 'like', created_at: new Date().toISOString() },
      })
    })
    expect(supabase.from).not.toHaveBeenCalled()
    expect(result.current.posts[0].reactions).toHaveLength(1)
  })

  // RN-T26
  it('reaction DELETE removes the reaction without a network call', async () => {
    const post = makePost('post-1', {
      reactions: [{ id: 'r1', post_id: 'post-1', user_id: 'user-2', type: 'like', created_at: new Date().toISOString() }],
    })
    const { result } = await setupWithPost(post)
    act(() => {
      channelHandlers['DELETE:reactions']?.({ old: { id: 'r1', post_id: 'post-1' } })
    })
    expect(supabase.from).not.toHaveBeenCalled()
    expect(result.current.posts[0].reactions).toHaveLength(0)
  })
})

describe('usePosts — granular realtime: comments', () => {
  // RN-T27
  it('comment INSERT appends to the correct post', async () => {
    const comment = { id: 'c1', post_id: 'post-1', content: 'Nice!', author: { id: 'user-2', name: 'Bob', initials: 'BO', color: '#ef4444' } }
    ;(supabase.from as jest.Mock)
      .mockReturnValueOnce(createBuilder({ data: [makePost('post-1')], error: null }))
      .mockReturnValue(createBuilder({ data: comment, error: null }))

    const { result } = renderHook(() => usePosts())
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      channelHandlers['INSERT:comments']?.({ new: { id: 'c1', post_id: 'post-1' } })
    })

    await waitFor(() => expect(result.current.posts[0].comments).toHaveLength(1))
    expect(result.current.posts[0].comments[0].content).toBe('Nice!')
  })

  // RN-T28
  it('comment DELETE removes it from state without a network call', async () => {
    const comment = { id: 'c1', post_id: 'post-1', content: 'Nice!', author: { id: 'user-2', name: 'Bob', initials: 'BO', color: '#ef4444' } }
    ;(supabase.from as jest.Mock).mockReturnValue(createBuilder({ data: [makePost('post-1', { comments: [comment] })], error: null }))
    const { result } = renderHook(() => usePosts())
    await waitFor(() => expect(result.current.loading).toBe(false))
    ;(supabase.from as jest.Mock).mockClear()

    act(() => {
      channelHandlers['DELETE:comments']?.({ old: { id: 'c1', post_id: 'post-1' } })
    })
    expect(supabase.from).not.toHaveBeenCalled()
    expect(result.current.posts[0].comments).toHaveLength(0)
  })
})

describe('usePosts — stable callbacks', () => {
  // RN-T29
  it('react callback reference is stable across re-renders', async () => {
    const { result, rerender } = renderHook(() => usePosts())
    await waitFor(() => expect(result.current.loading).toBe(false))
    const ref1 = result.current.react
    rerender({})
    const ref2 = result.current.react
    expect(ref1).toBe(ref2)
  })

  // RN-T30
  it('addComment callback reference is stable across re-renders', async () => {
    const { result, rerender } = renderHook(() => usePosts())
    await waitFor(() => expect(result.current.loading).toBe(false))
    const ref1 = result.current.addComment
    rerender({})
    expect(ref1).toBe(result.current.addComment)
  })
})
