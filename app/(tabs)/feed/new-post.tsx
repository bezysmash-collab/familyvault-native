import { useState } from 'react'
import {
  View, Text, TextInput, Pressable, ScrollView,
  KeyboardAvoidingView, Platform, Alert, ActivityIndicator, Image,
} from 'react-native'
import { router } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import * as DocumentPicker from 'expo-document-picker'
import { SafeAreaView } from 'react-native-safe-area-context'
import { usePosts } from '../../../hooks/usePosts'
import { useSpaces } from '../../../hooks/useSpaces'

type PostType = 'text' | 'photo' | 'video' | 'file' | 'link'

export default function NewPostScreen() {
  const { createPost }          = usePosts()
  const { spaces }              = useSpaces()
  const [content,  setContent]  = useState('')
  const [spaceId,  setSpaceId]  = useState<string | null>(null)
  const [postType, setPostType] = useState<PostType>('text')
  const [file,     setFile]     = useState<any>(null)
  const [linkUrl,  setLinkUrl]  = useState('')
  const [loading,  setLoading]  = useState(false)

  const clearAttachment = () => { setFile(null); setLinkUrl(''); setPostType('text') }

  const pickFromCamera = async () => {
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
      setFile({
        uri:  asset.uri,
        name: asset.fileName ?? (isVideo ? 'capture.mp4' : 'capture.jpg'),
        type: asset.mimeType ?? (isVideo ? 'video/mp4' : 'image/jpeg'),
      })
      setPostType(isVideo ? 'video' : 'photo')
    }
  }

  const pickFromLibrary = async (mediaType: 'photo' | 'video') => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: mediaType === 'photo'
        ? ImagePicker.MediaTypeOptions.Images
        : ImagePicker.MediaTypeOptions.Videos,
      quality: 0.8,
    })
    if (!result.canceled) {
      const asset = result.assets[0]
      setFile({
        uri:  asset.uri,
        name: asset.fileName ?? (mediaType === 'photo' ? 'upload.jpg' : 'upload.mp4'),
        type: asset.mimeType,
      })
      setPostType(mediaType)
    }
  }

  const pickFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true })
    if (!result.canceled) {
      setFile(result.assets[0])
      setPostType('file')
    }
  }

  const handlePost = async () => {
    const hasContent = content.trim() || file || (postType === 'link' && linkUrl.trim())
    if (!hasContent || loading) return
    setLoading(true)
    try {
      const finalContent = postType === 'link'
        ? (content.trim() ? `${content.trim()}\n${linkUrl.trim()}` : linkUrl.trim())
        : content.trim()

      const { error } = await createPost({
        content: finalContent,
        spaceId,
        type: file ? postType : postType === 'link' ? 'link' : 'text',
        file: file ? { uri: file.uri, name: file.name, type: file.type ?? 'application/octet-stream' } : null,
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
  const canPost       = !loading && !!(content.trim() || file || (postType === 'link' && linkUrl.trim()))

  const TOOLBAR = [
    { key: 'camera', emoji: '📷', label: 'Camera', onPress: pickFromCamera },
    { key: 'photo',  emoji: '🖼️', label: 'Photo',  onPress: () => pickFromLibrary('photo') },
    { key: 'video',  emoji: '🎬', label: 'Video',  onPress: () => pickFromLibrary('video') },
    { key: 'link',   emoji: '🔗', label: 'Link',   onPress: () => { clearAttachment(); setPostType('link') } },
    { key: 'file',   emoji: '📎', label: 'File',   onPress: pickFile },
  ]

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
          {postType === 'link' && !file && (
            <View style={{ marginTop: 12, flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', paddingHorizontal: 12, paddingVertical: 10 }}>
              <Text style={{ fontSize: 18, marginRight: 8 }}>🔗</Text>
              <TextInput
                value={linkUrl}
                onChangeText={setLinkUrl}
                placeholder="https://"
                placeholderTextColor="#94a3b8"
                keyboardType="url"
                autoCapitalize="none"
                autoCorrect={false}
                style={{ flex: 1, fontSize: 15, color: '#1e293b' }}
                autoFocus
              />
              <Pressable onPress={clearAttachment} style={{ paddingLeft: 8 }}>
                <Text style={{ color: '#94a3b8', fontSize: 18 }}>✕</Text>
              </Pressable>
            </View>
          )}

          {/* Attachment preview */}
          {file && (
            <View style={{ marginTop: 12 }}>
              {postType === 'photo' && (
                <View style={{ borderRadius: 16, overflow: 'hidden', backgroundColor: '#f1f5f9' }}>
                  <Image source={{ uri: file.uri }} style={{ width: '100%', height: 220 }} resizeMode="cover" />
                </View>
              )}
              {postType === 'video' && (
                <View style={{ backgroundColor: '#f1f5f9', borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Text style={{ fontSize: 24 }}>🎬</Text>
                  <Text style={{ color: '#475569', fontSize: 14, flex: 1 }} numberOfLines={1}>{file.name}</Text>
                </View>
              )}
              {postType === 'file' && (
                <View style={{ backgroundColor: '#f8fafc', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Text style={{ fontSize: 24 }}>📎</Text>
                  <Text style={{ color: '#475569', fontSize: 14, flex: 1 }} numberOfLines={1}>{file.name}</Text>
                </View>
              )}
              <Pressable
                onPress={clearAttachment}
                style={{ position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' }}
              >
                <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>✕</Text>
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
          {TOOLBAR.map((btn) => (
            <Pressable
              key={btn.key}
              onPress={btn.onPress}
              style={{
                flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 12,
                backgroundColor: postType === btn.key ? '#f1f5f9' : 'transparent',
              }}
            >
              <Text style={{ fontSize: 22 }}>{btn.emoji}</Text>
              <Text style={{ fontSize: 11, color: postType === btn.key ? '#0f172a' : '#94a3b8', marginTop: 2, fontWeight: postType === btn.key ? '600' : '400' }}>
                {btn.label}
              </Text>
            </Pressable>
          ))}
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
