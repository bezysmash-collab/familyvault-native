import { useCallback, useState } from 'react'
import { ScrollView, View, Text, TextInput, Pressable, ActivityIndicator, RefreshControl } from 'react-native'
import { usePosts } from '../../../hooks/usePosts'
import { useAuth } from '../../../hooks/useAuth'
import PostCard from '../../../components/feed/PostCard'

export default function HistoryScreen() {
  const { profile }                                              = useAuth()
  const { posts, loading, react, addComment, refresh } = usePosts()
  const [query, setQuery]                                        = useState('')

  const filtered = query.trim()
    ? posts.filter((p) =>
        p.content?.toLowerCase().includes(query.toLowerCase()) ||
        p.author?.name?.toLowerCase().includes(query.toLowerCase())
      )
    : posts

  const renderPost = useCallback((item: any) => (
    <PostCard
      key={item.id}
      post={item}
      currentUserId={profile?.id ?? ''}
      onReact={react}
      onComment={addComment}
    />
  ), [profile?.id, react, addComment])

  return (
    <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      {/* Search bar */}
      <View style={{ paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }}>
        <View style={{ backgroundColor: '#f1f5f9', borderRadius: 16, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, gap: 8 }}>
          <Text style={{ color: '#94a3b8' }}>🔍</Text>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search posts…"
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
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#0f172a" />
        </View>
      ) : filtered.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
          <Text style={{ fontSize: 48 }}>🕐</Text>
          <Text style={{ fontSize: 20, fontWeight: '700', color: '#0f172a', marginTop: 16 }}>
            {query ? 'No results' : 'No history yet'}
          </Text>
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingTop: 12, paddingBottom: 24 }}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={refresh} tintColor="#0f172a" />
          }
        >
          {filtered.map(renderPost)}
        </ScrollView>
      )}
    </View>
  )
}
