import { useCallback, useState } from 'react'
import { FlatList, View, Text, Pressable, ActivityIndicator, RefreshControl, ScrollView } from 'react-native'
import { router } from 'expo-router'
import { usePosts } from '../../../hooks/usePosts'
import { useSpaces } from '../../../hooks/useSpaces'
import { useAuth } from '../../../hooks/useAuth'
import PostCard from '../../../components/feed/PostCard'

const ALL_SPACE = { id: null, name: 'All', emoji: '🏠' }

export default function FeedScreen() {
  const { profile }                       = useAuth()
  const { spaces }                        = useSpaces()
  const [activeSpaceId, setActiveSpaceId] = useState<string | null>(null)
  const { posts, loading, hasMore, loadingMore, react, addComment, loadMore, refresh } = usePosts(activeSpaceId)

  const renderItem = useCallback(({ item }: { item: any }) => (
    <PostCard
      post={item}
      currentUserId={profile?.id ?? ''}
      onReact={react}
      onComment={addComment}
    />
  ), [profile?.id, react, addComment])

  const renderFooter = () => {
    if (loadingMore) return <ActivityIndicator style={{ paddingVertical: 16 }} color="#64748b" />
    if (hasMore) return (
      <Pressable onPress={loadMore} className="py-4 items-center">
        <Text className="text-slate-500 font-semibold text-sm">Load older posts</Text>
      </Pressable>
    )
    return null
  }

  const spaceFilters = [ALL_SPACE, ...spaces]

  const ListHeader = (
    <View>
      {/* Compose button */}
      <View className="px-4 pt-3 pb-2 bg-white">
        <Pressable
          onPress={() => router.push('/(tabs)/feed/new-post')}
          className="bg-slate-100 rounded-2xl px-4 py-3 flex-row items-center gap-3"
        >
          <Text className="text-slate-400 flex-1">What's on your mind?</Text>
          <Text style={{ fontSize: 18 }}>✏️</Text>
        </Pressable>
      </View>
      {/* Space filter pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="bg-white border-b border-slate-100"
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 10, paddingTop: 2, gap: 8 }}
      >
        {spaceFilters.map((s) => {
          const active = activeSpaceId === s.id
          return (
            <Pressable
              key={s.id ?? 'all'}
              onPress={() => setActiveSpaceId(s.id)}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 7,
                borderRadius: 999,
                backgroundColor: active ? '#0f172a' : '#f1f5f9',
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: '600', color: active ? '#fff' : '#475569' }}>
                {s.emoji} {s.name}
              </Text>
            </Pressable>
          )
        })}
      </ScrollView>
    </View>
  )

  return (
    <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      {loading ? (
        <>
          {ListHeader}
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator size="large" color="#0f172a" />
          </View>
        </>
      ) : posts.length === 0 ? (
        <>
          {ListHeader}
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
            <Text style={{ fontSize: 48 }}>👋</Text>
            <Text className="text-xl font-bold text-slate-900 mt-4 text-center">Nothing here yet</Text>
            <Text className="text-slate-500 mt-2 text-center">Be the first to share something with your family!</Text>
          </View>
        </>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingTop: 12, paddingBottom: 32 }}
          ListHeaderComponent={ListHeader}
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={renderFooter}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={refresh} tintColor="#0f172a" />
          }
        />
      )}
    </View>
  )
}
