import { memo, useMemo, useState } from 'react'
import { View, Text, Pressable, TextInput, ScrollView } from 'react-native'
import { Image } from 'expo-image'
import { Video, ResizeMode } from 'expo-av'
import Avatar from '../shared/Avatar'
import SpaceBadge from '../shared/SpaceBadge'
import ReactionPicker from './ReactionPicker'
import { timeAgo } from '../../lib/timeAgo'

const REACTIONS = [
  { key: 'like',    emoji: '👍' },
  { key: 'love',    emoji: '❤️' },
  { key: 'dislike', emoji: '👎' },
]

interface Props {
  post:          any
  currentUserId: string
  onReact:       (postId: string, type: string) => void
  onComment:     (postId: string, content: string) => Promise<{ error: any }>
}

function PostCard({ post, currentUserId, onReact, onComment }: Props) {
  const [pickerOpen,   setPickerOpen]   = useState(false)
  const [commentsOpen, setCommentsOpen] = useState(false)
  const [draft,        setDraft]        = useState('')
  const [submitting,   setSubmitting]   = useState(false)

  const myReaction = post.reactions?.find((r: any) => r.user_id === currentUserId)
  const current    = REACTIONS.find((r) => r.key === myReaction?.type)
  const totalReactions = post.reactions?.length || 0

  const reactionCounts = useMemo(() =>
    REACTIONS
      .map((r) => ({ ...r, count: post.reactions?.filter((x: any) => x.type === r.key).length || 0 }))
      .filter((r) => r.count > 0),
    [post.reactions]
  )

  const handleComment = async () => {
    if (!draft.trim()) return
    setSubmitting(true)
    await onComment(post.id, draft)
    setDraft('')
    setSubmitting(false)
  }

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

      {/* Content */}
      <Text className="px-4 pb-3 text-slate-800 text-base leading-relaxed">{post.content}</Text>

      {/* Attachments */}
      {post.type === 'photo' && post.attachment?.url && (
        <View className="mx-4 mb-3 rounded-xl overflow-hidden bg-slate-100">
          <Image
            source={{ uri: post.attachment.url }}
            style={{ width: '100%', height: 220 }}
            contentFit="cover"
          />
        </View>
      )}
      {post.type === 'video' && post.attachment?.url && (
        <View className="mx-4 mb-3 rounded-xl overflow-hidden bg-black">
          <Video
            source={{ uri: post.attachment.url }}
            useNativeControls
            resizeMode={ResizeMode.CONTAIN}
            style={{ width: '100%', height: 220 }}
          />
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
    </View>
  )
}

export default memo(PostCard)
