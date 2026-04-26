import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'

const SIGNED_URL_TTL = 7200
const PAGE_SIZE = 20

const POST_QUERY = `
  *,
  author:profiles(*),
  space:spaces(*),
  comments(*, author:profiles(*)),
  reactions(*)
`

async function hydrateSignedUrls(posts: any[]): Promise<any[]> {
  const needsSigning = posts.filter(
    (p) => p.attachment?.path && (p.type === 'photo' || p.type === 'video' || p.type === 'file')
  )
  if (needsSigning.length === 0) return posts
  const paths = needsSigning.map((p) => p.attachment.path)
  const { data: signed } = await supabase.storage
    .from('attachments')
    .createSignedUrls(paths, SIGNED_URL_TTL)
  const urlMap: Record<string, string> = {}
  ;(signed || []).forEach((s: any) => { urlMap[s.path] = s.signedUrl })
  return posts.map((p) => {
    if (!p.attachment?.path || !urlMap[p.attachment.path]) return p
    return { ...p, attachment: { ...p.attachment, url: urlMap[p.attachment.path] } }
  })
}

export function usePosts(spaceId: string | null = null) {
  const [posts,       setPosts]       = useState<any[]>([])
  const [loading,     setLoading]     = useState(true)
  const [hasMore,     setHasMore]     = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error,       setError]       = useState<any>(null)

  const postsRef = useRef<any[]>([])
  useEffect(() => { postsRef.current = posts }, [posts])

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
      .channel(`posts-${spaceId ?? 'all'}`)
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
        setPosts((prev) => prev.map((p) =>
          p.id === r.post_id ? { ...p, reactions: [...(p.reactions || []), r] } : p
        ))
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
  }, [spaceId])

  const createPost = useCallback(async ({
    content, spaceId: sid, type = 'text', file = null,
  }: {
    content: string; spaceId?: string | null; type?: string; file?: any
  }) => {
    let attachment = null
    if (file) {
      const ext  = file.name.split('.').pop()
      const path = `${crypto.randomUUID()}.${ext}`
      const { error: uploadError } = await supabase.storage.from('attachments').upload(path, file)
      if (uploadError) return { error: uploadError }
      attachment = { path, name: file.name, size: file.size, mime_type: file.type }
    }
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('posts').insert({
      author_id: user.id, space_id: sid || null, content, type, attachment,
    })
    return { error }
  }, [])

  const react = useCallback(async (postId: string, reactionType: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    const existing = postsRef.current
      .find((p) => p.id === postId)
      ?.reactions?.find((r: any) => r.user_id === user.id)
    if (existing) {
      if (existing.type === reactionType) {
        await supabase.from('reactions').delete().eq('id', existing.id)
      } else {
        await supabase.from('reactions').update({ type: reactionType }).eq('id', existing.id)
      }
    } else {
      await supabase.from('reactions').insert({ post_id: postId, user_id: user.id, type: reactionType })
    }
  }, [])

  const addComment = useCallback(async (postId: string, content: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('comments').insert({ post_id: postId, author_id: user.id, content })
    return { error }
  }, [])

  return { posts, loading, error, hasMore, loadingMore, createPost, react, addComment, loadMore, refresh: fetchPosts }
}
