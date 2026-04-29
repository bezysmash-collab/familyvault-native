import { useCallback, useState } from 'react'
import { FlatList, View, Text, TextInput, Pressable, ActivityIndicator, RefreshControl } from 'react-native'
import { usePosts } from '../../../hooks/usePosts'
import { useAuth } from '../../../hooks/useAuth'
import PostCard from '../../../components/feed/PostCard'

export default function HistoryScreen() {
  const { profile }                                              = useAuth()
  const { posts, loading, hasMore, loadingMore, react, addComment, loadMore, refresh } = usePosts()
  const [query, setQuery]                                        = useState('')

  const filtered = query.trim()
    ? posts.filter((p) =>
        p.content?.toLowerCase().includes(query.toLowerCase()) ||
        p.author?.name?.toLowerCase().includes(query.toLowerCase())
      )
    : posts

  const renderItem = useCallback(({ item }: { item: any }) => (
    <PostCard
      post={item}
      currentUserId={profile?.id ?? ''}
      onReact={react}
      onComment={addComment}
    />
  ), [profile?.id, react, addComment])

  return (
    <View className="flex-1 bg-slate-50">
      {/* Search bar */}
      <View className="px-4 py-3 bg-white border-b border-slate-100">
        <View className="bg-slate-100 rounded-2xl flex-row items-center px-4 py-2 gap-2">
          <Text className="text-slate-400">🔍</Text>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search posts…"
            placeholderTextColor="#94a3b8"
            className="flex-1 text-base text-slate-800"
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery('')}>
              <Text className="text-slate-400 font-bold">✕</Text>
            </Pressable>
          )}
        </View>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#0f172a" />
        </View>
      ) : filtered.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text style={{ fontSize: 48 }}>🕐</Text>
          <Text className="text-xl font-bold text-slate-900 mt-4">
            {query ? 'No results' : 'No history yet'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingTop: 12, paddingBottom: 24 }}
          onEndReached={!query ? loadMore : undefined}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            !query && loadingMore
              ? <ActivityIndicator className="py-4" color="#64748b" />
              : !query && hasMore
                ? <Pressable onPress={loadMore} className="py-4 items-center">
                    <Text className="text-slate-500 font-semibold text-sm">Load older</Text>
                  </Pressable>
                : null
          }
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={refresh} tintColor="#0f172a" />
          }
        />
      )}
    </View>
  )
}
