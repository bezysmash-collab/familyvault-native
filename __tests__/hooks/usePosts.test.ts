import { renderHook, act, waitFor } from '@testing-library/react-native'

import { supabase, createBuilder, channelHandlers, storageMock } from '../../lib/supabase'
import { usePosts } from '../../hooks/usePosts'

const PAGE_SIZE = 20
const USER_ID = 'test-user-id' // matches the mock's auth.getUser response
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

function makeReaction(overrides = {}) {
  return {
    id: 'r1', post_id: 'post-1', user_id: USER_ID,
    type: 'like', created_at: new Date().toISOString(),
    ...overrides,
  }
}

beforeEach(() => {
  Object.keys(channelHandlers).forEach((k) => delete channelHandlers[k])
  ;(supabase.from as jest.Mock).mockReturnValue(createBuilder({ data: [], error: null }))
  storageMock.createSignedUrls.mockClear()
  ;(supabase.auth.getUser as jest.Mock).mockClear()
})

// ─── Data fetching ─────────────────────────────────────────────────────────────

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

// ─── Realtime: reactions ───────────────────────────────────────────────────────

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

// ─── Realtime: comments ────────────────────────────────────────────────────────

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

// ─── Stable callbacks ──────────────────────────────────────────────────────────

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

// ─── Optimistic reactions ──────────────────────────────────────────────────────

describe('usePosts — optimistic reactions', () => {
  async function setupWithPost(post: any) {
    ;(supabase.from as jest.Mock).mockReturnValue(createBuilder({ data: [post], error: null }))
    const hook = renderHook(() => usePosts())
    await waitFor(() => expect(hook.result.current.loading).toBe(false))
    // Let userId cache populate
    await waitFor(() => (supabase.auth.getUser as jest.Mock).mock.calls.length > 0)
    ;(supabase.from as jest.Mock).mockReturnValue(createBuilder({ data: null, error: null }))
    return hook
  }

  // RN-T31
  it('inserting a reaction updates state immediately (optimistic)', async () => {
    const { result } = await setupWithPost(makePost('post-1'))
    expect(result.current.posts[0].reactions).toHaveLength(0)

    await act(async () => {
      await result.current.react('post-1', 'like')
    })

    expect(result.current.posts[0].reactions).toHaveLength(1)
    expect(result.current.posts[0].reactions[0].type).toBe('like')
    expect(result.current.posts[0].reactions[0].user_id).toBe(USER_ID)
  })

  // RN-T32
  it('toggling your own reaction removes it immediately (optimistic)', async () => {
    const post = makePost('post-1', { reactions: [makeReaction()] })
    const { result } = await setupWithPost(post)
    expect(result.current.posts[0].reactions).toHaveLength(1)

    await act(async () => {
      await result.current.react('post-1', 'like') // same type → toggle off
    })

    expect(result.current.posts[0].reactions).toHaveLength(0)
  })

  // RN-T33
  it('changing reaction type updates it immediately (optimistic)', async () => {
    const post = makePost('post-1', { reactions: [makeReaction({ type: 'like' })] })
    const { result } = await setupWithPost(post)

    await act(async () => {
      await result.current.react('post-1', 'love')
    })

    expect(result.current.posts[0].reactions[0].type).toBe('love')
  })

  // RN-T34
  it('rolls back optimistic insert when the network call fails', async () => {
    ;(supabase.from as jest.Mock).mockReturnValue(createBuilder({ data: [makePost('post-1')], error: null }))
    const hook = renderHook(() => usePosts())
    await waitFor(() => expect(hook.result.current.loading).toBe(false))
    await waitFor(() => (supabase.auth.getUser as jest.Mock).mock.calls.length > 0)

    // Make the insert fail
    ;(supabase.from as jest.Mock).mockReturnValue(createBuilder({ data: null, error: { message: 'DB error' } }))

    await act(async () => {
      await hook.result.current.react('post-1', 'like')
    })

    expect(hook.result.current.posts[0].reactions).toHaveLength(0)
  })

  // RN-T35
  it('rolls back optimistic delete when the network call fails', async () => {
    ;(supabase.from as jest.Mock).mockReturnValue(
      createBuilder({ data: [makePost('post-1', { reactions: [makeReaction()] })], error: null })
    )
    const hook = renderHook(() => usePosts())
    await waitFor(() => expect(hook.result.current.loading).toBe(false))
    await waitFor(() => (supabase.auth.getUser as jest.Mock).mock.calls.length > 0)

    ;(supabase.from as jest.Mock).mockReturnValue(createBuilder({ data: null, error: { message: 'DB error' } }))

    await act(async () => {
      await hook.result.current.react('post-1', 'like') // toggle off own reaction
    })

    // Should be restored after rollback
    expect(hook.result.current.posts[0].reactions).toHaveLength(1)
  })

  // RN-T36
  it('react() does not call auth.getUser after initial mount', async () => {
    const { result } = await setupWithPost(makePost('post-1'))
    const callsBefore = (supabase.auth.getUser as jest.Mock).mock.calls.length

    await act(async () => {
      await result.current.react('post-1', 'like')
    })

    // No additional getUser calls during react()
    expect((supabase.auth.getUser as jest.Mock).mock.calls.length).toBe(callsBefore)
  })
})

// ─── Signed URL caching ────────────────────────────────────────────────────────

describe('usePosts — signed URL caching', () => {
  const photoPost = makePost('post-p1', {
    type: 'photo',
    attachment: { path: 'uploads/photo.jpg', name: 'photo.jpg' },
  })

  beforeEach(() => {
    storageMock.createSignedUrls.mockResolvedValue({
      data: [{ path: 'uploads/photo.jpg', signedUrl: 'https://cdn.example.com/photo.jpg' }],
    })
  })

  // RN-T37
  it('signs attachment URLs on initial load', async () => {
    ;(supabase.from as jest.Mock).mockReturnValue(createBuilder({ data: [photoPost], error: null }))
    const { result } = renderHook(() => usePosts())
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(storageMock.createSignedUrls).toHaveBeenCalledTimes(1)
    expect(result.current.posts[0].attachment.url).toBe('https://cdn.example.com/photo.jpg')
  })

  // RN-T38
  it('does not re-sign cached URLs when fetching the same posts again', async () => {
    ;(supabase.from as jest.Mock).mockReturnValue(createBuilder({ data: [photoPost], error: null }))

    // First hook instance signs and caches
    const hook1 = renderHook(() => usePosts())
    await waitFor(() => expect(hook1.result.current.loading).toBe(false))
    const signCallsAfterFirst = storageMock.createSignedUrls.mock.calls.length

    // Second hook instance fetches the same post — cache should be warm
    const hook2 = renderHook(() => usePosts())
    await waitFor(() => expect(hook2.result.current.loading).toBe(false))

    expect(storageMock.createSignedUrls.mock.calls.length).toBe(signCallsAfterFirst)
  })
})

// ─── Realtime: optimistic placeholder replacement ─────────────────────────────

describe('usePosts — realtime replaces optimistic placeholder', () => {
  // RN-T39
  it('replaces opt- placeholder with the real server row on realtime INSERT', async () => {
    ;(supabase.from as jest.Mock).mockReturnValue(createBuilder({ data: [makePost('post-1')], error: null }))
    const { result } = renderHook(() => usePosts())
    await waitFor(() => expect(result.current.loading).toBe(false))
    await waitFor(() => (supabase.auth.getUser as jest.Mock).mock.calls.length > 0)
    ;(supabase.from as jest.Mock).mockReturnValue(createBuilder({ data: null, error: null }))

    // Optimistically add reaction (creates opt- entry)
    await act(async () => {
      await result.current.react('post-1', 'like')
    })
    const optEntry = result.current.posts[0].reactions[0]
    expect(optEntry.id).toMatch(/^opt-/)

    // Realtime INSERT fires with the real row (different ID, same user_id)
    const realRow = { id: 'server-r1', post_id: 'post-1', user_id: USER_ID, type: 'like', created_at: new Date().toISOString() }
    act(() => {
      channelHandlers['INSERT:reactions']?.({ new: realRow })
    })

    // Should now have exactly one reaction with the real server ID
    expect(result.current.posts[0].reactions).toHaveLength(1)
    expect(result.current.posts[0].reactions[0].id).toBe('server-r1')
  })
})
