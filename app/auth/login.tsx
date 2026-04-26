import { useState } from 'react'
import {
  View, Text, TextInput, Pressable, KeyboardAvoidingView,
  Platform, ActivityIndicator, Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import Logo from '../../components/shared/Logo'

export default function LoginScreen() {
  const { signIn } = useAuth()
  const [email,   setEmail]   = useState('')
  const [loading, setLoading] = useState(false)
  const [sent,    setSent]    = useState(false)

  const handleSignIn = async () => {
    const trimmed = email.trim().toLowerCase()
    if (!trimmed) return

    setLoading(true)

    // Client-side invite gate (same RPC as the web app)
    const { data: allowed } = await supabase.rpc('is_email_allowed', { check_email: trimmed })
    if (!allowed) {
      Alert.alert(
        'Invite required',
        'Ask a family member to invite you before signing in.',
        [{ text: 'OK' }]
      )
      setLoading(false)
      return
    }

    const { error } = await signIn(trimmed)
    setLoading(false)
    if (error) {
      Alert.alert('Error', error.message)
      return
    }
    setSent(true)
  }

  if (sent) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50 items-center justify-center px-6">
        <Logo width={120} />
        <Text className="text-2xl font-bold text-slate-900 mt-6 text-center">Check your email</Text>
        <Text className="text-slate-500 mt-3 text-center leading-relaxed">
          We sent a magic link to{'\n'}{email}.{'\n\n'}Tap the link in the email to sign in.
        </Text>
        <Pressable onPress={() => setSent(false)} className="mt-8">
          <Text className="text-blue-500 font-semibold">Use a different email</Text>
        </Pressable>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1 px-6 justify-center"
      >
        {/* Logo */}
        <View className="items-center mb-10">
          <Logo width={200} />
          <Text className="text-slate-500 mt-1">Your private family space</Text>
        </View>

        {/* Email field */}
        <View className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
          <Text className="text-sm font-semibold text-slate-700 mb-2">Email address</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor="#94a3b8"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            returnKeyType="done"
            onSubmitEditing={handleSignIn}
            className="text-base text-slate-900"
          />
        </View>

        {/* Sign-in button */}
        <Pressable
          onPress={handleSignIn}
          disabled={loading || !email.trim()}
          className={`mt-4 rounded-2xl py-4 items-center ${
            loading || !email.trim() ? 'bg-slate-200' : 'bg-slate-900'
          }`}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="font-bold text-base text-white">Send Magic Link</Text>
          )}
        </Pressable>

        <Text className="text-center text-slate-400 text-sm mt-6">
          Family Vault is invite-only.{'\n'}
          Ask a family member to invite you.
        </Text>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
