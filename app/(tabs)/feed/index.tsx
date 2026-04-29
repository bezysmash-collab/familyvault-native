import { useCallback, useState } from 'react'
import { ScrollView, View, Text, Pressable, ActivityIndicator, RefreshControl } from 'react-native'
import { router } from 'expo-router'
import { usePosts } from '../../../hooks/usePosts'
import { useSpaces } from '../../../hooks/useSpaces'
import { useAuth } from '../../../hooks/useAuth'
import { useContentHeight } from '../../../hooks/useContentHeight'
import PostCard from '../../../components/feed/PostCard'

const ALL_SPACE = { id: null, name: 'All', emoji: '🏠' }

export default function FeedScreen() {
  const { profile }                         = useAuth()
  const { spaces }                          = useSpaces()
  const [activeSpaceId, setActiveSpaceId]   = useState<string | null>(null)
  const [subHeaderHeight, setSubHeaderHeight] = useState(0)
  const contentHeight                       = useContentHeight()
  const scrollHeight                        = contentHeight > 0 ? contentHeight - subHeaderHeight : undefined
  const { posts, loading, hasMore, loadingMore, react, addComment, loadMore, refresh } = usePosts(activeSpaceId)

  const renderPost = useCallback((item: any) => (
    <PostCard
      key={item.id}
      post={item}
      currentUserId={profile?.id ?? ''}
      onReact={react}
      onComment={addComment}
    />
  ), [profile?.id, react, addComment])

  const handleScroll = ({ nativeEvent }: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = nativeEvent
    if (contentOffset.y + layoutMeasurement.height >= contentSize.height - 200) {
      if (hasMore && !loadingMore) loadMore()
    }
  }

  const spaceFilters = [ALL_SPACE, ...spaces]

  return (
    <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      {/* In-screen sub-header: compose + space filter pills */}
      <View
        style={{ backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }}
        onLayout={(e) => setSubHeaderHeight(e.nativeEvent.layout.height)}
      >
        <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 }}>
          <Pressable
            onPress={() => router.push('/(tabs)/feed/new-post')}
            style={{ backgroundColor: '#f1f5f9', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }}
          >
            <Text style={{ color: '#94a3b8', flex: 1 }}>What's on your mind?</Text>
            <Text style={{ fontSize: 18 }}>✏️</Text>
          </Pressable>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 10, paddingTop: 2, gap: 8, flexDirection: 'row' }}
        >
          {spaceFilters.map((s) => {
            const active = activeSpaceId === s.id
            return (
              <Pressable
                key={s.id ?? 'all'}
                onPress={() => setActiveSpaceId(s.id)}
                style={{ paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, backgroundColor: active ? '#0f172a' : '#f1f5f9' }}
              >
                <Text style={{ fontSize: 13, fontWeight: '600', color: active ? '#ffffff' : '#475569' }}>
                  {s.emoji} {s.name}
                </Text>
              </Pressable>
            )
          })}
        </ScrollView>
      </View>

      {loading ? (
        <View style={{ height: scrollHeight, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#0f172a" />
        </View>
      ) : posts.length === 0 ? (
        <View style={{ height: scrollHeight, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
          <Text style={{ fontSize: 48 }}>👋</Text>
          <Text style={{ fontSize: 20, fontWeight: '700', color: '#0f172a', marginTop: 16, textAlign: 'center' }}>Nothing here yet</Text>
          <Text style={{ color: '#64748b', marginTop: 8, textAlign: 'center' }}>Be the first to share something with your family!</Text>
        </View>
      ) : (
        <ScrollView
          style={{ height: scrollHeight }}
          contentContainerStyle={{ paddingTop: 12, paddingBottom: 32 }}
          onScroll={handleScroll}
          scrollEventThrottle={200}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={refresh} tintColor="#0f172a" />
          }
        >
          {posts.map(renderPost)}
          {loadingMore && <ActivityIndicator style={{ paddingVertical: 16 }} color="#64748b" />}
          {!loadingMore && hasMore && (
            <Pressable onPress={loadMore} style={{ paddingVertical: 16, alignItems: 'center' }}>
              <Text style={{ color: '#64748b', fontWeight: '600', fontSize: 14 }}>Load older posts</Text>
            </Pressable>
          )}
        </ScrollView>
      )}
    </View>
  )
}
