import { memo, useMemo, useState, useCallback } from 'react'
import {
  View, Text, Pressable, TextInput, ScrollView, StyleSheet, Modal,
  useWindowDimensions, FlatList,
} from 'react-native'
import { Image } from 'expo-image'
import { VideoView, useVideoPlayer } from 'expo-video'
import Avatar from '../shared/Avatar'
import SpaceBadge from '../shared/SpaceBadge'
import ReactionPicker from './ReactionPicker'
import { timeAgo } from '../../lib/timeAgo'

// ─── Video player ─────────────────────────────────────────────────────────────

const VideoPlayer = memo(function VideoPlayer({ uri, style }: { uri: string; style?: any }) {
  const player = useVideoPlayer(uri, (p) => { p.loop = false })
  return (
    <VideoView
      player={player}
      style={[styles.video, style]}
      contentFit="contain"
      nativeControls
    />
  )
})

// ─── Media gallery (swipeable, with dot indicators) ───────────────────────────

interface MediaItem {
  url:       string
  type:      string  // 'photo' | 'video'
  mime_type?: string
}

interface GalleryProps {
  items:        MediaItem[]
  mediaWidth:   number
  onFullscreen: (index: number) => void
}

const MediaGallery = memo(function MediaGallery({ items, mediaWidth, onFullscreen }: GalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0)

  const handleScroll = useCallback((e: any) => {
    if (mediaWidth <= 0) return
    const index = Math.round(e.nativeEvent.contentOffset.x / mediaWidth)
    setActiveIndex(Math.min(Math.max(index, 0), items.length - 1))
  }, [mediaWidth, items.length])

  return (
    <View style={{ marginHorizontal: 16, marginBottom: items.length > 1 ? 4 : 12 }}>
      <FlatList
        data={items}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        bounces={false}
        style={{ borderRadius: 12, overflow: 'hidden', backgroundColor: '#1e293b' }}
        getItemLayout={(_, index) => ({ length: mediaWidth, offset: mediaWidth * index, index })}
        keyExtractor={(_, i) => String(i)}
        renderItem={({ item, index }) => (
          <Pressable
            onPress={() => onFullscreen(index)}
            style={{ width: mediaWidth, height: 280, overflow: 'hidden' }}
          >
            {item.type === 'video'
              ? <VideoPlayer uri={item.url} style={{ width: mediaWidth, height: 280 }} />
              : (
                <Image
                  source={{ uri: item.url }}
                  style={{ width: mediaWidth, height: 280 }}
                  contentFit="contain"
                  cachePolicy="memory-disk"
                />
              )
            }
          </Pressable>
        )}
      />

      {/* Dot indicators */}
      {items.length > 1 && (
        <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 8, marginBottom: 4, gap: 5 }}>
          {items.map((_, i) => (
            <View
              key={i}
              style={{
                width: i === activeIndex ? 18 : 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: i === activeIndex ? '#0f172a' : '#cbd5e1',
              }}
            />
          ))}
        </View>
      )}
    </View>
  )
})

// ─── Fullscreen swipeable modal ───────────────────────────────────────────────

interface FullscreenModalProps {
  items:         MediaItem[]
  initialIndex:  number
  onClose:       () => void
}

const FullscreenModal = memo(function FullscreenModal({ items, initialIndex, onClose }: FullscreenModalProps) {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions()
  const [activeIndex, setActiveIndex] = useState(initialIndex)

  const handleScroll = useCallback((e: any) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / screenWidth)
    setActiveIndex(Math.min(Math.max(index, 0), items.length - 1))
  }, [screenWidth, items.length])

  return (
    <Modal visible animationType="fade" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        <FlatList
          data={items}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          initialScrollIndex={initialIndex}
          onMomentumScrollEnd={handleScroll}
          bounces={false}
          getItemLayout={(_, index) => ({ length: screenWidth, offset: screenWidth * index, index })}
          keyExtractor={(_, i) => String(i)}
          renderItem={({ item }) => (
            <View style={{ width: screenWidth, height: screenHeight, alignItems: 'center', justifyContent: 'center' }}>
              {item.type === 'video'
                ? <VideoPlayer uri={item.url} style={{ width: screenWidth, height: screenHeight * 0.7 }} />
                : (
                  <Image
                    source={{ uri: item.url }}
                    style={{ width: screenWidth, height: screenHeight }}
                    contentFit="contain"
                    cachePolicy="memory-disk"
                  />
                )
              }
            </View>
          )}
        />

        {/* Close button */}
        <Pressable
          onPress={onClose}
          style={{ position: 'absolute', top: 52, right: 20, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 20, width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}
        >
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>✕</Text>
        </Pressable>

        {/* Counter */}
        {items.length > 1 && (
          <View style={{ position: 'absolute', top: 56, left: 20, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 }}>
            <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600' }}>{activeIndex + 1} / {items.length}</Text>
          </View>
        )}

        {/* Dot indicators */}
        {items.length > 1 && (
          <View style={{ position: 'absolute', bottom: 40, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 6 }}>
            {items.map((_, i) => (
              <View
                key={i}
                style={{
                  width: i === activeIndex ? 20 : 7,
                  height: 7,
                  borderRadius: 3.5,
                  backgroundColor: i === activeIndex ? '#fff' : 'rgba(255,255,255,0.4)',
                }}
              />
            ))}
          </View>
        )}
      </View>
    </Modal>
  )
})

// ─── Helpers ─────────────────────────────────────────────────────────────────

// Normalise the post's attachment field into a consistent MediaItem array.
// Old posts: attachment is an object { url, path, mime_type }, type is 'photo'|'video'
// New posts: attachment is an array [{ url, path, mime_type, type }], type is 'media'
function resolveMediaItems(post: any): MediaItem[] {
  if (Array.isArray(post.attachment)) {
    return post.attachment
      .filter((item: any) => item?.url)
      .map((item: any) => ({ url: item.url, type: item.type ?? 'photo', mime_type: item.mime_type }))
  }
  if (post.attachment?.url && (post.type === 'photo' || post.type === 'video')) {
    return [{ url: post.attachment.url, type: post.type, mime_type: post.attachment.mime_type }]
  }
  return []
}

// ─── Reaction constants ───────────────────────────────────────────────────────

const REACTIONS = [
  { key: 'like',    emoji: '👍' },
  { key: 'love',    emoji: '❤️' },
  { key: 'dislike', emoji: '👎' },
]

// ─── PostCard ─────────────────────────────────────────────────────────────────

interface Props {
  post:          any
  currentUserId: string
  onReact:       (postId: string, type: string) => void
  onComment:     (postId: string, content: string) => Promise<{ error: any }>
}

function PostCard({ post, currentUserId, onReact, onComment }: Props) {
  const { width: screenWidth } = useWindowDimensions()
  // Width inside the card after card outer margins (16 each side) and inner media margins (16 each side)
  const mediaWidth = screenWidth - 64

  const [pickerOpen,      setPickerOpen]      = useState(false)
  const [commentsOpen,    setCommentsOpen]    = useState(false)
  const [draft,           setDraft]           = useState('')
  const [submitting,      setSubmitting]      = useState(false)
  const [fullscreenIndex, setFullscreenIndex] = useState<number | null>(null)

  const myReaction     = post.reactions?.find((r: any) => r.user_id === currentUserId)
  const current        = REACTIONS.find((r) => r.key === myReaction?.type)
  const totalReactions = post.reactions?.length || 0

  const reactionCounts = useMemo(() =>
    REACTIONS
      .map((r) => ({ ...r, count: post.reactions?.filter((x: any) => x.type === r.key).length || 0 }))
      .filter((r) => r.count > 0),
    [post.reactions]
  )

  const mediaItems = useMemo(() => resolveMediaItems(post), [post.attachment, post.type])

  const handleComment = async () => {
    if (!draft.trim()) return
    setSubmitting(true)
    await onComment(post.id, draft)
    setDraft('')
    setSubmitting(false)
  }

  const openFullscreen = useCallback((index: number) => setFullscreenIndex(index), [])
  const closeFullscreen = useCallback(() => setFullscreenIndex(null), [])

  return (
    <View className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden mb-3 mx-4">
      {/* Header */}
      <View className="flex-row items-start justify-between p-4 pb-3">
        <View className="flex-row items-start gap-3 flex-1">
          <Avatar profile={post.author} size={40} />
          <View className="flex-1">
            <Text className="font-semibold text-slate-900 text-base leading-tight">{post.author?.name}</Text>
            <View className="flex-row items-center gap-2 mt-1 flex-wrap">
              <Text className="text-slate-400 text-sm">{timeAgo(post.created_at)}</Text>
              <SpaceBadge space={post.space} />
            </View>
          </View>
        </View>
      </View>

      {/* Text content */}
      {!!post.content && (
        <Text className="px-4 pb-3 text-slate-800 text-base leading-relaxed">{post.content}</Text>
      )}

      {/* Media gallery — handles both single and multi-item posts */}
      {mediaItems.length > 0 && (
        <MediaGallery
          items={mediaItems}
          mediaWidth={mediaWidth}
          onFullscreen={openFullscreen}
        />
      )}

      {/* File attachment */}
      {post.type === 'file' && post.attachment?.url && (
        <View className="mx-4 mb-3 bg-slate-50 rounded-xl border border-slate-100 px-3 py-3 flex-row items-center gap-2">
          <Text style={{ fontSize: 20 }}>📎</Text>
          <Text className="text-slate-600 text-sm flex-1" numberOfLines={1}>{post.attachment.name}</Text>
        </View>
      )}

      {/* Reaction summary */}
      {reactionCounts.length > 0 && (
        <View className="px-4 pb-2 flex-row items-center gap-1">
          {reactionCounts.map((r) => (
            <Text key={r.key} className="text-sm">{r.emoji}</Text>
          ))}
          <Text className="text-sm text-slate-400 ml-1">{totalReactions}</Text>
        </View>
      )}

      {/* Action bar */}
      <View className="flex-row items-center gap-1 px-4 py-2 border-t border-slate-50">
        <Pressable
          onPress={() => setPickerOpen(true)}
          className={`flex-row items-center gap-2 px-3 py-2 rounded-xl ${current ? 'bg-amber-50' : ''}`}
        >
          <Text style={{ fontSize: 20 }}>{current ? current.emoji : '🤍'}</Text>
          {totalReactions > 0 && (
            <Text className={`text-sm font-medium ${current ? 'text-amber-700' : 'text-slate-500'}`}>
              {totalReactions}
            </Text>
          )}
        </Pressable>

        <Pressable
          onPress={() => setCommentsOpen((o) => !o)}
          className={`flex-row items-center gap-2 px-3 py-2 rounded-xl ${commentsOpen ? 'bg-blue-50' : ''}`}
        >
          <Text style={{ fontSize: 18 }}>💬</Text>
          <Text className={`text-sm font-medium ${commentsOpen ? 'text-blue-600' : 'text-slate-500'}`}>
            {post.comments?.length || 0}
          </Text>
        </Pressable>
      </View>

      {/* Comments */}
      {commentsOpen && (
        <View className="px-4 pb-4 pt-2 border-t border-slate-50">
          {post.comments?.length === 0 && (
            <Text className="text-slate-400 text-sm text-center py-2">No comments yet. Be first!</Text>
          )}
          {post.comments?.map((c: any) => (
            <View key={c.id} className="flex-row items-start gap-2 mb-2">
              <Avatar profile={c.author} size={28} />
              <View className="bg-slate-50 rounded-2xl px-3 py-2 flex-1">
                <Text className="font-semibold text-slate-800 text-sm">{c.author?.name} </Text>
                <Text className="text-slate-600 text-sm">{c.content}</Text>
              </View>
            </View>
          ))}
          <View className="flex-row items-center gap-2 pt-1">
            <Avatar profile={{ initials: '?', color: '#64748b' }} size={28} />
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="Write a comment…"
              placeholderTextColor="#94a3b8"
              editable={!submitting}
              onSubmitEditing={handleComment}
              returnKeyType="send"
              className="flex-1 bg-slate-100 rounded-full px-4 py-2 text-sm text-slate-800"
            />
          </View>
        </View>
      )}

      <ReactionPicker
        visible={pickerOpen}
        myReactionType={myReaction?.type}
        onSelect={(type) => onReact(post.id, type)}
        onClose={() => setPickerOpen(false)}
      />

      {/* Fullscreen swipeable modal */}
      {fullscreenIndex !== null && (
        <FullscreenModal
          items={mediaItems}
          initialIndex={fullscreenIndex}
          onClose={closeFullscreen}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  video: { width: '100%', height: 220 },
})

export default memo(PostCard)
