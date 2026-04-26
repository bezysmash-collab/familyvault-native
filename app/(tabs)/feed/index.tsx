import { useCallback } from 'react'
import { FlatList, View, Text, Pressable, ActivityIndicator, RefreshControl } from 'react-native'
import { router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { usePosts } from '../../../hooks/usePosts'
import { useAuth } from '../../../hooks/useAuth'
import PostCard from '../../../components/feed/PostCard'

export default function FeedScreen() {
  const { profile }                                                 = useAuth()
  const { posts, loading, hasMore, loadingMore, react, addComment, loadMore, refresh } = usePosts()

  const renderItem = useCallback(({ item }: { item: any }) => (
    <PostCard
      post={item}
      currentUserId={profile?.id ?? ''}
      onReact={react}
      onComment={addComment}
    />
  ), [profile?.id, react, addComment])

  const renderFooter = () => {
    if (loadingMore) return <ActivityIndicator className="py-4" color="#64748b" />
    if (hasMore) return (
      <Pressable onPress={loadMore} className="py-4 items-center">
        <Text className="text-slate-500 font-semibold text-sm">Load older posts</Text>
      </Pressable>
    )
    return null
  }

  return (
    <View className="flex-1 bg-slate-50">
      {/* Compose button */}
      <View className="px-4 py-3 border-b border-slate-100 bg-white">
        <Pressable
          onPress={() => router.push('/(tabs)/feed/new-post')}
          className="bg-slate-100 rounded-2xl px-4 py-3 flex-row items-center gap-3"
        >
          <Text className="text-slate-400 flex-1">What's on your mind?</Text>
          <Text style={{ fontSize: 18 }}>✏️</Text>
        </Pressable>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#0f172a" />
        </View>
      ) : posts.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text style={{ fontSize: 48 }}>👋</Text>
          <Text className="text-xl font-bold text-slate-900 mt-4 text-center">Nothing here yet</Text>
          <Text className="text-slate-500 mt-2 text-center">Be the first to share something with your family!</Text>
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingTop: 12, paddingBottom: 24 }}
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
