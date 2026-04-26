import { useState } from 'react'
import {
  View, Text, TextInput, Pressable, KeyboardAvoidingView,
  Platform, ActivityIndicator, Alert, ScrollView,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useAuth } from '../../hooks/useAuth'

const COLORS = [
  '#1d4ed8', '#7c3aed', '#db2777', '#dc2626',
  '#d97706', '#16a34a', '#0891b2', '#475569',
]

export default function ProfileSetupScreen() {
  const { createProfile } = useAuth()
  const [name,    setName]    = useState('')
  const [color,   setColor]   = useState(COLORS[0])
  const [loading, setLoading] = useState(false)

  const initials = name.trim().split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)

  const handleCreate = async () => {
    if (!name.trim()) return
    setLoading(true)
    const { error } = await createProfile({ name, color })
    setLoading(false)
    if (error) {
      Alert.alert('Error', error.message)
      return
    }
    router.replace('/(tabs)/feed')
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView className="flex-1 px-6 pt-10" keyboardShouldPersistTaps="handled">
          <Text className="text-3xl font-extrabold text-slate-900">Set up your profile</Text>
          <Text className="text-slate-500 mt-2 mb-8">Your family will see this name and avatar.</Text>

          {/* Avatar preview */}
          <View className="items-center mb-8">
            <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: color, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 28 }}>
                {initials || '?'}
              </Text>
            </View>
          </View>

          {/* Name */}
          <Text className="text-sm font-semibold text-slate-700 mb-2">Your name</Text>
          <View className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 mb-6">
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="e.g. Alice"
              placeholderTextColor="#94a3b8"
              autoCapitalize="words"
              returnKeyType="done"
              className="text-base text-slate-900"
            />
          </View>

          {/* Color picker */}
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

          <Pressable
            onPress={handleCreate}
            disabled={loading || !name.trim()}
            className={`rounded-2xl py-4 items-center ${loading || !name.trim() ? 'bg-slate-200' : 'bg-slate-900'}`}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text className="font-bold text-base text-white">Join Family Vault</Text>
            }
          </Pressable>
          <View className="h-8" />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
