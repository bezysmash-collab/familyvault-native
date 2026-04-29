import { useState, useEffect, useCallback } from 'react'
import {
  Modal, View, Text, ScrollView, Pressable,
  ActivityIndicator,
} from 'react-native'
import { supabase } from '../../lib/supabase'
import Avatar from './Avatar'
import { timeAgo } from '../../lib/timeAgo'

interface NotifItem {
  id:      string
  type:    'reaction' | 'comment' | 'task'
  from:    any
  text:    string
  snippet: string
  emoji:   string
  time:    string
}

interface Props {
  visible:  boolean
  profileId: string
  onClose:  () => void
}

export default function NotificationsModal({ visible, profileId, onClose }: Props) {
  const [items,   setItems]   = useState<NotifItem[]>([])
  const [loading, setLoading] = useState(false)
  const [read,    setRead]    = useState(new Set<string>())

  const fetchActivity = useCallback(async () => {
    if (!profileId) return
    setLoading(true)

    const [{ data: reactions }, { data: comments }, { data: tasks }] = await Promise.all([
      supabase
        .from('reactions')
        .select('id, type, created_at, user_id, post:posts(id, content, author_id), reactor:profiles!reactions_user_id_fkey(*)')
        .eq('post.author_id', profileId)
        .neq('user_id', profileId)
        .order('created_at', { ascending: false })
        .limit(10),
      supabase
        .from('comments')
        .select('id, content, created_at, author_id, post:posts(id, content, author_id), author:profiles!comments_author_id_fkey(*)')
        .eq('post.author_id', profileId)
        .neq('author_id', profileId)
        .order('created_at', { ascending: false })
        .limit(10),
      supabase
        .from('tasks')
        .select('id, title, created_at, created_by, creator:profiles!tasks_created_by_fkey(*)')
        .eq('assigned_to', profileId)
        .neq('created_by', profileId)
        .order('created_at', { ascending: false })
        .limit(10),
    ])

    const notifs: NotifItem[] = []

    ;(reactions || []).filter((r: any) => r.post).forEach((r: any) => {
      const emoji = r.type === 'love' ? '❤️' : r.type === 'like' ? '👍' : '👎'
      notifs.push({
        id:      `r-${r.id}`,
        type:    'reaction',
        from:    r.reactor,
        text:    `${r.type === 'love' ? 'loved' : r.type === 'like' ? 'liked' : 'reacted to'} your post`,
        snippet: r.post?.content?.slice(0, 60) ?? '',
        emoji,
        time:    r.created_at,
      })
    })

    ;(comments || []).filter((c: any) => c.post).forEach((c: any) => {
      notifs.push({
        id:      `c-${c.id}`,
        type:    'comment',
        from:    c.author,
        text:    'commented on your post',
        snippet: `"${c.content?.slice(0, 50)}"`,
        emoji:   '💬',
        time:    c.created_at,
      })
    })

    ;(tasks || []).forEach((t: any) => {
      notifs.push({
        id:      `t-${t.id}`,
        type:    'task',
        from:    t.creator,
        text:    'assigned you a task',
        snippet: t.title,
        emoji:   '✅',
        time:    t.created_at,
      })
    })

    notifs.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
    setItems(notifs.slice(0, 15))
    setLoading(false)
  }, [profileId])

  useEffect(() => {
    if (visible) fetchActivity()
  }, [visible, fetchActivity])

  const unread = items.filter((n) => !read.has(n.id)).length

  const markRead    = (id: string) => setRead((s) => new Set([...s, id]))
  const markAllRead = () => setRead(new Set(items.map((n) => n.id)))

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      {/* Backdrop */}
      <Pressable
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }}
        onPress={onClose}
      />

      {/* Panel — slides up from bottom */}
      <View style={{ backgroundColor: '#ffffff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '75%' }}>
        {/* Handle */}
        <View style={{ width: 40, height: 4, backgroundColor: '#e2e8f0', borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 4 }} />

        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontWeight: '700', fontSize: 17, color: '#0f172a' }}>Notifications</Text>
            {unread > 0 && (
              <View style={{ backgroundColor: '#ef4444', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 }}>
                <Text style={{ color: '#ffffff', fontSize: 11, fontWeight: '700' }}>{unread}</Text>
              </View>
            )}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {unread > 0 && (
              <Pressable onPress={markAllRead} style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 }}>
                <Text style={{ color: '#3b82f6', fontSize: 13, fontWeight: '600' }}>Mark all read</Text>
              </Pressable>
            )}
            <Pressable onPress={onClose} style={{ padding: 4 }}>
              <Text style={{ color: '#94a3b8', fontSize: 18, fontWeight: '600' }}>✕</Text>
            </Pressable>
          </View>
        </View>

        {/* List */}
        <ScrollView style={{ maxHeight: 420 }}>
          {loading ? (
            <View style={{ paddingVertical: 40, alignItems: 'center' }}>
              <ActivityIndicator color="#64748b" />
            </View>
          ) : items.length === 0 ? (
            <View style={{ paddingVertical: 48, alignItems: 'center' }}>
              <Text style={{ fontSize: 40, marginBottom: 12 }}>🔔</Text>
              <Text style={{ fontSize: 15, fontWeight: '600', color: '#94a3b8' }}>No activity yet</Text>
              <Text style={{ fontSize: 12, color: '#cbd5e1', marginTop: 4 }}>Reactions and comments will appear here</Text>
            </View>
          ) : (
            items.map((n, i) => {
              const isUnread = !read.has(n.id)
              return (
                <Pressable
                  key={n.id}
                  onPress={() => markRead(n.id)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'flex-start',
                    paddingHorizontal: 20,
                    paddingVertical: 14,
                    backgroundColor: isUnread ? '#eff6ff' : '#ffffff',
                    borderBottomWidth: i < items.length - 1 ? 1 : 0,
                    borderBottomColor: '#f8fafc',
                    gap: 12,
                  }}
                >
                  {/* Avatar with emoji badge */}
                  <View style={{ position: 'relative', flexShrink: 0 }}>
                    <Avatar profile={n.from} size={40} />
                    <View style={{ position: 'absolute', bottom: -2, right: -2, width: 20, height: 20, backgroundColor: '#ffffff', borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#f1f5f9' }}>
                      <Text style={{ fontSize: 10 }}>{n.emoji}</Text>
                    </View>
                  </View>

                  {/* Text */}
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, color: '#1e293b', lineHeight: 20 }}>
                      <Text style={{ fontWeight: '600' }}>{n.from?.name || 'Someone'}</Text>
                      {' '}{n.text}
                    </Text>
                    {!!n.snippet && (
                      <Text style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }} numberOfLines={1}>{n.snippet}</Text>
                    )}
                    <Text style={{ fontSize: 11, color: '#cbd5e1', marginTop: 4, fontWeight: '500' }}>{timeAgo(n.time)}</Text>
                  </View>

                  {/* Unread dot */}
                  {isUnread && (
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#3b82f6', marginTop: 6, flexShrink: 0 }} />
                  )}
                </Pressable>
              )
            })
          )}
        </ScrollView>

        {/* Footer */}
        {items.length > 0 && (
          <Pressable
            onPress={fetchActivity}
            style={{ borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingVertical: 14, alignItems: 'center' }}
          >
            <Text style={{ fontSize: 14, color: '#94a3b8', fontWeight: '500' }}>Refresh</Text>
          </Pressable>
        )}
      </View>
    </Modal>
  )
}
