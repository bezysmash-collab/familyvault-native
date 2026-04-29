import { useMemo, useState } from 'react'
import { ScrollView, View, Text, TextInput, Pressable, ActivityIndicator, RefreshControl } from 'react-native'
import { usePosts } from '../../../hooks/usePosts'
import { useContentHeight } from '../../../hooks/useContentHeight'
import Avatar from '../../../components/shared/Avatar'
import SpaceBadge from '../../../components/shared/SpaceBadge'

const TYPE_ICON: Record<string, string> = {
  text: '💬', photo: '📷', video: '🎥', link: '🔗', file: '📎',
}

function groupByMonth(posts: any[]) {
  const groups: Record<string, any[]> = {}
  posts.forEach((p) => {
    const label = new Date(p.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    if (!groups[label]) groups[label] = []
    groups[label].push(p)
  })
  return Object.entries(groups)
}

export default function HistoryScreen() {
  const { posts, loading, hasMore, loadingMore, loadMore, refresh } = usePosts()
  const contentHeight = useContentHeight()
  const [query, setQuery]                   = useState('')
  const [subHeaderHeight, setSubHeaderHeight] = useState(0)
  const scrollHeight = contentHeight > 0 ? contentHeight - subHeaderHeight : undefined

  const filtered = useMemo(() => {
    if (!query.trim()) return posts
    const q = query.toLowerCase()
    return posts.filter((p) =>
      p.content?.toLowerCase().includes(q) ||
      p.author?.name?.toLowerCase().includes(q) ||
      p.space?.name?.toLowerCase().includes(q)
    )
  }, [posts, query])

  const groups = useMemo(() => groupByMonth(filtered), [filtered])

  return (
    <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      {/* Search bar */}
      <View
        style={{ paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }}
        onLayout={(e) => setSubHeaderHeight(e.nativeEvent.layout.height)}
      >
        <View style={{ backgroundColor: '#f1f5f9', borderRadius: 16, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, gap: 8 }}>
          <Text style={{ color: '#94a3b8' }}>🔍</Text>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search posts, names, spaces…"
            placeholderTextColor="#94a3b8"
            style={{ flex: 1, fontSize: 16, color: '#1e293b' }}
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery('')}>
              <Text style={{ color: '#94a3b8', fontWeight: '700' }}>✕</Text>
            </Pressable>
          )}
        </View>
      </View>

      {loading ? (
        <View style={{ height: scrollHeight, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#0f172a" />
        </View>
      ) : groups.length === 0 ? (
        <View style={{ height: scrollHeight, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
          <Text style={{ fontSize: 48 }}>🔍</Text>
          <Text style={{ fontSize: 20, fontWeight: '700', color: '#0f172a', marginTop: 16 }}>
            {query ? 'No results found' : 'No history yet'}
          </Text>
        </View>
      ) : (
        <ScrollView
          style={{ height: scrollHeight }}
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={refresh} tintColor="#0f172a" />
          }
        >
          {groups.map(([month, monthPosts]) => (
            <View key={month} style={{ marginBottom: 24 }}>
              {/* Month header */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: 1.2 }}>
                  {month}
                </Text>
                <View style={{ flex: 1, height: 1, backgroundColor: '#e2e8f0' }} />
                <Text style={{ fontSize: 11, color: '#94a3b8' }}>
                  {monthPosts.length} post{monthPosts.length !== 1 ? 's' : ''}
                </Text>
              </View>

              {/* Post rows */}
              <View style={{ gap: 8 }}>
                {monthPosts.map((post) => (
                  <View
                    key={post.id}
                    style={{ backgroundColor: '#ffffff', borderRadius: 16, borderWidth: 1, borderColor: '#f1f5f9', padding: 14 }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                      <Avatar profile={post.author} size={34} />
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginBottom: 4 }}>
                          <Text style={{ fontWeight: '600', fontSize: 13, color: '#0f172a' }}>{post.author?.name}</Text>
                          <Text style={{ fontSize: 12, color: '#94a3b8' }}>
                            {new Date(post.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </Text>
                          <SpaceBadge space={post.space} />
                        </View>
                        <Text style={{ fontSize: 13, color: '#475569', lineHeight: 19 }} numberOfLines={2}>
                          {post.content}
                        </Text>
                      </View>
                      <Text style={{ fontSize: 18, flexShrink: 0 }}>{TYPE_ICON[post.type] ?? '💬'}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          ))}

          {!query && hasMore && (
            <Pressable
              onPress={loadMore}
              disabled={loadingMore}
              style={{ paddingVertical: 14, alignItems: 'center' }}
            >
              <Text style={{ fontSize: 14, fontWeight: '600', color: loadingMore ? '#cbd5e1' : '#64748b' }}>
                {loadingMore ? 'Loading…' : 'Load older posts'}
              </Text>
            </Pressable>
          )}
        </ScrollView>
      )}
    </View>
  )
}
