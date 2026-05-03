import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { supabase } from '../lib/supabase'

const SIGNED_URL_TTL = 7200
const PAGE_SIZE = 20
// Re-sign a URL when it has less than 10 minutes of TTL remaining
const RENEW_BEFORE_EXPIRY_MS = 10 * 60 * 1000

const POST_QUERY = `
  *,
  author:profiles(*),
  space:spaces(*),
  comments(*, author:profiles(*)),
  reactions(*)
`

// Module-level signed URL cache: path → { url, expiresAt (ms) }
const signedUrlCache = new Map<string, { url: string; expiresAt: number }>()

async function hydrateSignedUrls(posts: any[]): Promise<any[]> {
  const now = Date.now()
  const needsSigning = posts.filter((p) => {
    if (!p.attachment?.path || !['photo', 'video', 'file'].includes(p.type)) return false
    const cached = signedUrlCache.get(p.attachment.path)
    return !cached || cached.expiresAt - now < RENEW_BEFORE_EXPIRY_MS
  })

  if (needsSigning.length > 0) {
    const paths = needsSigning.map((p) => p.attachment.path)
    const { data: signed } = await supabase.storage
      .from('attachments')
      .createSignedUrls(paths, SIGNED_URL_TTL)
    const expiresAt = now + SIGNED_URL_TTL * 1000
    ;(signed || []).forEach((s: any) => {
      signedUrlCache.set(s.path, { url: s.signedUrl, expiresAt })
    })
  }

  return posts.map((p) => {
    const cached = signedUrlCache.get(p.attachment?.path)
    if (!cached) return p
    return { ...p, attachment: { ...p.attachment, url: cached.url } }
  })
}

export function usePosts(spaceId: string | null = null) {
  const [posts,       setPosts]       = useState<any[]>([])
  const [loading,     setLoading]     = useState(true)
  const [hasMore,     setHasMore]     = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error,       setError]       = useState<any>(null)

  const channelId = useMemo(
    () => `posts-${spaceId ?? 'all'}-${Math.random().toString(36).slice(2, 7)}`,
    [spaceId]
  )

  const postsRef  = useRef<any[]>([])
  const userIdRef = useRef<string | null>(null)
  useEffect(() => { postsRef.current = posts }, [posts])

  // Cache the user ID once on mount — avoids an auth round-trip on every react()
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      userIdRef.current = user?.id ?? null
    })
  }, [])

  const fetchPosts = useCallback(async () => {
    setLoading(true)
    let query = supabase
      .from('posts')
      .select(POST_QUERY)
      .order('created_at', { ascending: false })
      .limit(PAGE_SIZE)
    if (spaceId) query = (query as any).eq('space_id', spaceId)
    const { data, error } = await query
    if (error) { setError(error); setLoading(false); return }
    const hydrated = await hydrateSignedUrls(data || [])
    setPosts(hydrated)
    setHasMore((data || []).length === PAGE_SIZE)
    setLoading(false)
  }, [spaceId])

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return
    const current = postsRef.current
    if (!current.length) return
    const oldest = current[current.length - 1].created_at
    setLoadingMore(true)
    let query = supabase
      .from('posts')
      .select(POST_QUERY)
      .order('created_at', { ascending: false })
      .lt('created_at', oldest)
      .limit(PAGE_SIZE)
    if (spaceId) query = (query as any).eq('space_id', spaceId)
    const { data } = await query
    if (data) {
      const hydrated = await hydrateSignedUrls(data)
      setPosts((prev) => [...prev, ...hydrated])
      setHasMore(data.length === PAGE_SIZE)
    }
    setLoadingMore(false)
  }, [spaceId, loadingMore, hasMore])

  useEffect(() => { fetchPosts() }, [fetchPosts])

  useEffect(() => {
    const channel = supabase
      .channel(channelId)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, async (payload: any) => {
        if (spaceId && payload.new.space_id !== spaceId) return
        const { data } = await supabase.from('posts').select(POST_QUERY).eq('id', payload.new.id).single()
        if (!data) return
        const [hydrated] = await hydrateSignedUrls([data])
        setPosts((prev) => [hydrated, ...prev])
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'posts' }, async (payload: any) => {
        const { data } = await supabase.from('posts').select(POST_QUERY).eq('id', payload.new.id).single()
        if (!data) return
        const [hydrated] = await hydrateSignedUrls([data])
        setPosts((prev) => prev.map((p) => p.id === data.id ? hydrated : p))
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'posts' }, (payload: any) => {
        setPosts((prev) => prev.filter((p) => p.id !== payload.old.id))
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'comments' }, async (payload: any) => {
        const c = payload.new
        const { data } = await supabase.from('comments').select('*, author:profiles(*)').eq('id', c.id).single()
        if (!data) return
        setPosts((prev) => {
          if (!prev.some((p) => p.id === c.post_id)) return prev
          return prev.map((p) =>
            p.id === c.post_id ? { ...p, comments: [...(p.comments || []), data] } : p
          )
        })
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'comments' }, (payload: any) => {
        const c = payload.old
        setPosts((prev) => prev.map((p) =>
          p.id === c.post_id
            ? { ...p, comments: (p.comments || []).filter((x: any) => x.id !== c.id) }
            : p
        ))
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'reactions' }, (payload: any) => {
        const r = payload.new
        setPosts((prev) => prev.map((p) => {
          if (p.id !== r.post_id) return p
          // Replace optimistic placeholder from the current user, or append from others
          const reactions = (p.reactions || []).some(
            (x: any) => x.id.startsWith('opt-') && x.user_id === r.user_id
          )
            ? p.reactions.map((x: any) =>
                x.id.startsWith('opt-') && x.user_id === r.user_id ? r : x
              )
            : [...p.reactions, r]
          return { ...p, reactions }
        }))
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'reactions' }, (payload: any) => {
        const r = payload.new
        setPosts((prev) => prev.map((p) =>
          p.id === r.post_id
            ? { ...p, reactions: (p.reactions || []).map((x: any) => x.id === r.id ? r : x) }
            : p
        ))
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'reactions' }, (payload: any) => {
        const r = payload.old
        setPosts((prev) => prev.map((p) =>
          p.id === r.post_id
            ? { ...p, reactions: (p.reactions || []).filter((x: any) => x.id !== r.id) }
            : p
        ))
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [spaceId, channelId])

  const createPost = useCallback(async ({
    content, spaceId: sid, type = 'text', file = null,
  }: {
    content: string; spaceId?: string | null; type?: string
    file?: { uri: string; name: string; type: string } | null
  }) => {
    let attachment = null
    if (file) {
      const ext  = (file.name ?? 'upload').split('.').pop() ?? 'bin'
      const path = `${crypto.randomUUID()}.${ext}`
      // fetch().arrayBuffer() works in React Native/Hermes; new File() does not
      const arrayBuffer = await fetch(file.uri).then((r) => r.arrayBuffer())
      const { error: uploadError } = await supabase.storage
        .from('attachments')
        .upload(path, arrayBuffer, { contentType: file.type })
      if (uploadError) return { error: uploadError }
      attachment = { path, name: file.name, mime_type: file.type }
    }
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('posts').insert({
      author_id: user.id, space_id: sid || null, content, type, attachment,
    })
    return { error }
  }, [])

  const react = useCallback(async (postId: string, reactionType: string) => {
    const userId = userIdRef.current
    if (!userId) return

    const existing = postsRef.current
      .find((p) => p.id === postId)
      ?.reactions?.find((r: any) => r.user_id === userId)

    if (existing) {
      if (existing.type === reactionType) {
        // Optimistically remove
        setPosts((prev) => prev.map((p) =>
          p.id === postId
            ? { ...p, reactions: p.reactions.filter((r: any) => r.id !== existing.id) }
            : p
        ))
        const { error } = await supabase.from('reactions').delete().eq('id', existing.id)
        if (error) {
          setPosts((prev) => prev.map((p) =>
            p.id === postId
              ? { ...p, reactions: [...p.reactions, existing] }
              : p
          ))
        }
      } else {
        // Optimistically update type
        setPosts((prev) => prev.map((p) =>
          p.id === postId
            ? { ...p, reactions: p.reactions.map((r: any) => r.id === existing.id ? { ...r, type: reactionType } : r) }
            : p
        ))
        const { error } = await supabase.from('reactions').update({ type: reactionType }).eq('id', existing.id)
        if (error) {
          setPosts((prev) => prev.map((p) =>
            p.id === postId
              ? { ...p, reactions: p.reactions.map((r: any) => r.id === existing.id ? existing : r) }
              : p
          ))
        }
      }
    } else {
      // Optimistically insert with a placeholder ID
      const tempId = `opt-${Date.now()}`
      const optimistic = {
        id: tempId, post_id: postId, user_id: userId,
        type: reactionType, created_at: new Date().toISOString(),
      }
      setPosts((prev) => prev.map((p) =>
        p.id === postId ? { ...p, reactions: [...(p.reactions || []), optimistic] } : p
      ))
      const { error } = await supabase.from('reactions').insert({
        post_id: postId, user_id: userId, type: reactionType,
      })
      if (error) {
        setPosts((prev) => prev.map((p) =>
          p.id === postId
            ? { ...p, reactions: p.reactions.filter((r: any) => r.id !== tempId) }
            : p
        ))
      }
      // The realtime INSERT event replaces the opt- placeholder with the real server row
    }
  }, [])

  const addComment = useCallback(async (postId: string, content: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('comments').insert({ post_id: postId, author_id: user.id, content })
    return { error }
  }, [])

  return { posts, loading, error, hasMore, loadingMore, createPost, react, addComment, loadMore, refresh: fetchPosts }
}
