import { useState } from 'react'
import {
  View, Text, TextInput, Pressable, ScrollView,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native'
import { router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuth } from '../../hooks/useAuth'

const COLORS = [
  '#1d4ed8', '#7c3aed', '#db2777', '#dc2626',
  '#d97706', '#16a34a', '#0891b2', '#475569',
]

export default function ProfileScreen() {
  const { profile, updateProfile } = useAuth()
  const [name,    setName]         = useState(profile?.name ?? '')
  const [color,   setColor]        = useState(profile?.color ?? COLORS[0])
  const [loading, setLoading]      = useState(false)

  const initials = name.trim().split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)

  const handleSave = async () => {
    setLoading(true)
    const { error } = await updateProfile({ name, color })
    setLoading(false)
    if (error) { Alert.alert('Error', error.message); return }
    router.back()
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
        <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-slate-100">
          <Pressable onPress={() => router.back()}>
            <Text className="text-slate-500 text-base">Cancel</Text>
          </Pressable>
          <Text className="font-bold text-slate-900 text-base">Edit Profile</Text>
          <Pressable onPress={handleSave} disabled={loading}>
            {loading ? <ActivityIndicator color="#0f172a" /> : <Text className="font-bold text-slate-900 text-base">Save</Text>}
          </Pressable>
        </View>

        <ScrollView className="flex-1 px-6 pt-6" keyboardShouldPersistTaps="handled">
          <View className="items-center mb-8">
            <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: color, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 28 }}>{initials || '?'}</Text>
            </View>
          </View>

          <Text className="text-sm font-semibold text-slate-700 mb-2">Name</Text>
          <View className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 mb-6">
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Your name"
              placeholderTextColor="#94a3b8"
              autoCapitalize="words"
              className="text-base text-slate-900"
            />
          </View>

          <Text className="text-sm font-semibold text-slate-700 mb-3">Avatar colour</Text>
          <View className="flex-row flex-wrap gap-3 mb-8">
            {COLORS.map((c) => (
              <Pressable
                key={c}
                onPress={() => setColor(c)}
                style={{
                  width: 40, height: 40, borderRadius: 20,
                  backgroundColor: c,
                  borderWidth: color === c ? 3 : 0,
                  borderColor: '#0f172a',
                }}
              />
            ))}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
