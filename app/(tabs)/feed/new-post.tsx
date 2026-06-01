import { useState } from 'react'
import {
  View, Text, TextInput, Pressable, ScrollView,
  KeyboardAvoidingView, Platform, Alert, ActivityIndicator, Image,
} from 'react-native'
import { router } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import * as DocumentPicker from 'expo-document-picker'
import { SafeAreaView } from 'react-native-safe-area-context'
import { usePosts, MediaFileInput } from '../../../hooks/usePosts'
import { useSpaces } from '../../../hooks/useSpaces'

const MAX_MEDIA = 10

export default function NewPostScreen() {
  const { createPost }            = usePosts()
  const { spaces }                = useSpaces()
  const [content,  setContent]    = useState('')
  const [spaceId,  setSpaceId]    = useState<string | null>(null)
  const [mediaItems, setMediaItems] = useState<MediaFileInput[]>([])
  const [file,     setFile]       = useState<any>(null)
  const [linkUrl,  setLinkUrl]    = useState('')
  const [loading,  setLoading]    = useState(false)

  const hasMedia = mediaItems.length > 0
  const hasFile  = !!file
  const hasLink  = !!linkUrl

  const clearFile  = () => { setFile(null); setLinkUrl('') }
  const clearMedia = () => setMediaItems([])

  const removeMediaItem = (index: number) =>
    setMediaItems((prev) => prev.filter((_, i) => i !== index))

  const addMediaItems = (items: MediaFileInput[]) => {
    if (hasFile || hasLink) { clearFile() }
    setMediaItems((prev) => {
      const remaining = MAX_MEDIA - prev.length
      return [...prev, ...items.slice(0, remaining)]
    })
  }

  const pickFromCamera = async () => {
    if (mediaItems.length >= MAX_MEDIA) return
    const { status } = await ImagePicker.requestCameraPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('Camera access required', 'Allow camera access in Settings to take photos.')
      return
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      quality: 0.8,
    })
    if (!result.canceled) {
      const asset = result.assets[0]
      const isVideo = asset.type === 'video'
      addMediaItems([{
        uri:       asset.uri,
        name:      asset.fileName ?? (isVideo ? 'capture.mp4' : 'capture.jpg'),
        mimeType:  asset.mimeType ?? (isVideo ? 'video/mp4' : 'image/jpeg'),
        mediaType: isVideo ? 'video' : 'photo',
      }])
    }
  }

  const pickPhotosFromLibrary = async () => {
    if (mediaItems.length >= MAX_MEDIA) return
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes:             ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality:                0.8,
      selectionLimit:         MAX_MEDIA - mediaItems.length,
    })
    if (!result.canceled) {
      addMediaItems(result.assets.map((asset) => ({
        uri:       asset.uri,
        name:      asset.fileName ?? 'upload.jpg',
        mimeType:  asset.mimeType ?? 'image/jpeg',
        mediaType: 'photo',
      })))
    }
  }

  const pickVideoFromLibrary = async () => {
    if (mediaItems.length >= MAX_MEDIA) return
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      quality:    0.8,
    })
    if (!result.canceled) {
      const asset = result.assets[0]
      addMediaItems([{
        uri:       asset.uri,
        name:      asset.fileName ?? 'upload.mp4',
        mimeType:  asset.mimeType ?? 'video/mp4',
        mediaType: 'video',
      }])
    }
  }

  const pickFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true })
    if (!result.canceled) {
      clearMedia()
      setFile(result.assets[0])
      setLinkUrl('')
    }
  }

  const handlePost = async () => {
    const hasContent = content.trim() || hasMedia || hasFile || (hasLink && linkUrl.trim())
    if (!hasContent || loading) return
    setLoading(true)
    try {
      const finalContent = hasLink
        ? (content.trim() ? `${content.trim()}\n${linkUrl.trim()}` : linkUrl.trim())
        : content.trim()

      const { error } = await createPost({
        content:    finalContent,
        spaceId,
        mediaFiles: hasMedia ? mediaItems : [],
        file:       hasFile ? { uri: file.uri, name: file.name, type: file.type ?? 'application/octet-stream' } : null,
      })

      if (error) { Alert.alert('Error', error.message); return }
      router.back()
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const selectedSpace = spaces.find(s => s.id === spaceId)
  const postLabel     = selectedSpace ? `Post to ${selectedSpace.emoji} ${selectedSpace.name}` : 'Post to Family'
  const canPost       = !loading && !!(content.trim() || hasMedia || hasFile || (hasLink && linkUrl.trim()))

  const TOOLBAR = [
    { key: 'camera', emoji: '📷', label: 'Camera', onPress: pickFromCamera },
    { key: 'photo',  emoji: '🖼️', label: 'Photos', onPress: pickPhotosFromLibrary },
    { key: 'video',  emoji: '🎬', label: 'Video',  onPress: pickVideoFromLibrary },
    { key: 'link',   emoji: '🔗', label: 'Link',   onPress: () => { clearMedia(); clearFile(); setLinkUrl(' ') } },
    { key: 'file',   emoji: '📎', label: 'File',   onPress: pickFile },
  ]

  const mediaActive = hasMedia
  const linkActive  = hasLink
  const fileActive  = hasFile

  const toolbarActive = (key: string) => {
    if (['camera', 'photo', 'video'].includes(key)) return mediaActive
    if (key === 'link') return linkActive
    if (key === 'file') return fileActive
    return false
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>

        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }}>
          <Pressable onPress={() => router.back()}>
            <Text style={{ color: '#64748b', fontSize: 16 }}>Cancel</Text>
          </Pressable>
          <Text style={{ fontWeight: '700', fontSize: 16, color: '#0f172a' }}>New Post</Text>
          <View style={{ width: 56 }} />
        </View>

        <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16 }}>

          {/* Text input */}
          <TextInput
            value={content}
            onChangeText={setContent}
            placeholder="What's on your mind?"
            placeholderTextColor="#94a3b8"
            multiline
            autoFocus
            style={{ fontSize: 16, color: '#1e293b', lineHeight: 24, minHeight: 80, textAlignVertical: 'top' }}
          />

          {/* Link URL input */}
          {hasLink && !hasMedia && (
            <View style={{ marginTop: 12, flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', paddingHorizontal: 12, paddingVertical: 10 }}>
              <Text style={{ fontSize: 18, marginRight: 8 }}>🔗</Text>
              <TextInput
                value={linkUrl.trim()}
                onChangeText={setLinkUrl}
                placeholder="https://"
                placeholderTextColor="#94a3b8"
                keyboardType="url"
                autoCapitalize="none"
                autoCorrect={false}
                style={{ flex: 1, fontSize: 15, color: '#1e293b' }}
                autoFocus
              />
              <Pressable onPress={() => { clearFile(); setLinkUrl('') }} style={{ paddingLeft: 8 }}>
                <Text style={{ color: '#94a3b8', fontSize: 18 }}>✕</Text>
              </Pressable>
            </View>
          )}

          {/* File attachment */}
          {hasFile && (
            <View style={{ marginTop: 12 }}>
              <View style={{ backgroundColor: '#f8fafc', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Text style={{ fontSize: 24 }}>📎</Text>
                <Text style={{ color: '#475569', fontSize: 14, flex: 1 }} numberOfLines={1}>{file.name}</Text>
              </View>
              <Pressable
                onPress={clearFile}
                style={{ position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center' }}
              >
                <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>✕</Text>
              </Pressable>
            </View>
          )}

          {/* Media thumbnails strip */}
          {hasMedia && (
            <View style={{ marginTop: 12 }}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexDirection: 'row', gap: 8 }}>
                {mediaItems.map((item, index) => (
                  <View key={index} style={{ width: 90, height: 90, borderRadius: 12, overflow: 'hidden', backgroundColor: '#1e293b' }}>
                    {item.mediaType === 'photo' ? (
                      <Image source={{ uri: item.uri }} style={{ width: 90, height: 90 }} resizeMode="cover" />
                    ) : (
                      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                        <Text style={{ fontSize: 26 }}>🎬</Text>
                        <Text style={{ color: '#94a3b8', fontSize: 10 }} numberOfLines={1}>{item.name}</Text>
                      </View>
                    )}
                    {/* Remove button */}
                    <Pressable
                      onPress={() => removeMediaItem(index)}
                      style={{ position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' }}
                      hitSlop={8}
                    >
                      <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700', lineHeight: 13 }}>✕</Text>
                    </Pressable>
                    {/* Video badge */}
                    {item.mediaType === 'video' && (
                      <View style={{ position: 'absolute', bottom: 4, left: 4, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 4, paddingHorizontal: 4, paddingVertical: 1 }}>
                        <Text style={{ color: '#fff', fontSize: 9, fontWeight: '600' }}>VIDEO</Text>
                      </View>
                    )}
                  </View>
                ))}

                {/* Add more button — shown when under the limit */}
                {mediaItems.length < MAX_MEDIA && (
                  <Pressable
                    onPress={pickPhotosFromLibrary}
                    style={{ width: 90, height: 90, borderRadius: 12, borderWidth: 2, borderColor: '#e2e8f0', borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: 4 }}
                  >
                    <Text style={{ fontSize: 22, color: '#94a3b8' }}>+</Text>
                    <Text style={{ fontSize: 10, color: '#94a3b8', fontWeight: '600' }}>Add more</Text>
                  </Pressable>
                )}
              </ScrollView>

              {/* Count badge */}
              <Text style={{ fontSize: 11, color: '#94a3b8', marginTop: 6 }}>
                {mediaItems.length} / {MAX_MEDIA} items
              </Text>

              {/* Clear all */}
              <Pressable onPress={clearMedia} style={{ marginTop: 4 }}>
                <Text style={{ fontSize: 12, color: '#ef4444', fontWeight: '600' }}>Remove all</Text>
              </Pressable>
            </View>
          )}

          {/* Space picker */}
          {spaces.length > 0 && (
            <View style={{ marginTop: 24 }}>
              <Text style={{ fontSize: 11, fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 }}>
                Post to space
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexDirection: 'row', gap: 8 }}>
                <Pressable
                  onPress={() => setSpaceId(null)}
                  style={{ paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, backgroundColor: spaceId === null ? '#0f172a' : '#f1f5f9' }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '600', color: spaceId === null ? '#fff' : '#475569' }}>🏠 All Family</Text>
                </Pressable>
                {spaces.map((s) => (
                  <Pressable
                    key={s.id}
                    onPress={() => setSpaceId(s.id)}
                    style={{ paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, backgroundColor: spaceId === s.id ? '#0f172a' : '#f1f5f9' }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: '600', color: spaceId === s.id ? '#fff' : '#475569' }}>{s.emoji} {s.name}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}

        </ScrollView>

        {/* Attachment toolbar */}
        <View style={{ flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingHorizontal: 12, paddingTop: 10, paddingBottom: 6, gap: 6 }}>
          {TOOLBAR.map((btn) => {
            const active = toolbarActive(btn.key)
            return (
              <Pressable
                key={btn.key}
                onPress={btn.onPress}
                style={{ flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 12, backgroundColor: active ? '#f1f5f9' : 'transparent' }}
              >
                <Text style={{ fontSize: 22 }}>{btn.emoji}</Text>
                <Text style={{ fontSize: 11, color: active ? '#0f172a' : '#94a3b8', marginTop: 2, fontWeight: active ? '600' : '400' }}>
                  {btn.label}
                </Text>
              </Pressable>
            )
          })}
        </View>

        {/* Post button */}
        <View style={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 8 }}>
          <Pressable
            onPress={handlePost}
            disabled={!canPost}
            style={{ backgroundColor: canPost ? '#0f172a' : '#e2e8f0', borderRadius: 16, paddingVertical: 16, alignItems: 'center' }}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={{ color: canPost ? '#fff' : '#94a3b8', fontWeight: '700', fontSize: 16 }}>{postLabel}</Text>
            }
          </Pressable>
        </View>

      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
