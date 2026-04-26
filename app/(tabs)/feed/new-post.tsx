import { useState } from 'react'
import {
  View, Text, TextInput, Pressable, ScrollView,
  KeyboardAvoidingView, Platform, Alert, ActivityIndicator,
} from 'react-native'
import { router } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import { SafeAreaView } from 'react-native-safe-area-context'
import { usePosts } from '../../../hooks/usePosts'

export default function NewPostScreen() {
  const { createPost }                    = usePosts()
  const [content,  setContent]            = useState('')
  const [type,     setType]               = useState<'text' | 'photo' | 'video'>('text')
  const [file,     setFile]               = useState<any>(null)
  const [loading,  setLoading]            = useState(false)

  const pickMedia = async (mediaType: 'photo' | 'video') => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: mediaType === 'photo'
        ? ImagePicker.MediaTypeOptions.Images
        : ImagePicker.MediaTypeOptions.Videos,
      quality: 0.8,
    })
    if (!result.canceled) {
      const asset = result.assets[0]
      setFile({ uri: asset.uri, name: asset.fileName ?? `upload.${mediaType === 'photo' ? 'jpg' : 'mp4'}`, type: asset.mimeType })
      setType(mediaType)
    }
  }

  const handlePost = async () => {
    if (!content.trim() && !file) return
    setLoading(true)

    let postFile = null
    if (file) {
      // Convert expo-image-picker asset to a format usable by Supabase Storage
      const response = await fetch(file.uri)
      const blob     = await response.blob()
      postFile = new File([blob], file.name, { type: file.type ?? 'application/octet-stream' })
    }

    const { error } = await createPost({
      content: content.trim(),
      spaceId: null,
      type: file ? type : 'text',
      file: postFile,
    })

    setLoading(false)
    if (error) { Alert.alert('Error', error.message); return }
    router.back()
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 py-3 border-b border-slate-100">
          <Pressable onPress={() => router.back()}>
            <Text className="text-slate-500 text-base">Cancel</Text>
          </Pressable>
          <Text className="font-bold text-slate-900 text-base">New Post</Text>
          <Pressable
            onPress={handlePost}
            disabled={loading || (!content.trim() && !file)}
          >
            {loading
              ? <ActivityIndicator color="#0f172a" />
              : <Text className={`font-bold text-base ${!content.trim() && !file ? 'text-slate-300' : 'text-slate-900'}`}>Post</Text>
            }
          </Pressable>
        </View>

        <ScrollView className="flex-1 px-4 pt-4" keyboardShouldPersistTaps="handled">
          <TextInput
            value={content}
            onChangeText={setContent}
            placeholder="What's on your mind?"
            placeholderTextColor="#94a3b8"
            multiline
            autoFocus
            className="text-base text-slate-800 leading-relaxed min-h-28"
          />

          {file && (
            <View className="mt-3 bg-slate-100 rounded-xl p-3 flex-row items-center gap-2">
              <Text style={{ fontSize: 20 }}>{type === 'photo' ? '🖼️' : '🎬'}</Text>
              <Text className="text-slate-600 text-sm flex-1" numberOfLines={1}>{file.name}</Text>
              <Pressable onPress={() => { setFile(null); setType('text') }}>
                <Text className="text-red-400 font-bold">✕</Text>
              </Pressable>
            </View>
          )}
        </ScrollView>

        {/* Media picker buttons */}
        <View className="flex-row gap-2 px-4 py-3 border-t border-slate-100">
          <Pressable
            onPress={() => pickMedia('photo')}
            className="flex-row items-center gap-2 px-3 py-2 bg-slate-100 rounded-xl"
          >
            <Text style={{ fontSize: 18 }}>🖼️</Text>
            <Text className="text-slate-600 text-sm font-medium">Photo</Text>
          </Pressable>
          <Pressable
            onPress={() => pickMedia('video')}
            className="flex-row items-center gap-2 px-3 py-2 bg-slate-100 rounded-xl"
          >
            <Text style={{ fontSize: 18 }}>🎬</Text>
            <Text className="text-slate-600 text-sm font-medium">Video</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
