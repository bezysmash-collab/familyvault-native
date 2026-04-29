import { useRef, useState } from 'react'
import {
  View, Text, TextInput, Pressable, KeyboardAvoidingView,
  Platform, ActivityIndicator, Alert,
} from 'react-native'
import { router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import Logo from '../../components/shared/Logo'

export default function LoginScreen() {
  const { signIn } = useAuth()
  const [email,     setEmail]     = useState('')
  const [loading,   setLoading]   = useState(false)
  const [sent,      setSent]      = useState(false)
  const [code,      setCode]      = useState('')
  const [verifying, setVerifying] = useState(false)
  const codeRef = useRef<TextInput>(null)

  const handleSignIn = async () => {
    const trimmed = email.trim().toLowerCase()
    if (!trimmed) return
    setLoading(true)

    const { data: allowed } = await supabase.rpc('is_email_allowed', { check_email: trimmed })
    if (!allowed) {
      Alert.alert('Invite required', 'Ask a family member to invite you before signing in.')
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
    setTimeout(() => codeRef.current?.focus(), 400)
  }

  const handleVerify = async () => {
    const trimmedCode = code.trim()
    if (!trimmedCode) return
    setVerifying(true)
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: trimmedCode,
      type:  'email',
    })
    setVerifying(false)
    if (error) {
      Alert.alert('Invalid code', 'The code is wrong or has expired. Request a new one.')
      setCode('')
    } else {
      router.replace('/(tabs)/feed')
    }
  }

  const canVerify = code.trim().length > 0 && !verifying

  if (sent) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1 px-6 justify-center"
        >
          <View className="items-center mb-8">
            <Logo width={120} />
            <Text className="text-2xl font-bold text-slate-900 mt-6 text-center">Check your email</Text>
            <Text className="text-slate-500 mt-2 text-center leading-relaxed">
              We sent a sign-in code to{'\n'}
              <Text className="font-semibold text-slate-700">{email}</Text>
            </Text>
          </View>

          <View className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
            <Text className="text-sm font-semibold text-slate-700 mb-2">Enter code from email</Text>
            <TextInput
              ref={codeRef}
              value={code}
              onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 8))}
              placeholder="········"
              placeholderTextColor="#94a3b8"
              keyboardType="number-pad"
              returnKeyType="done"
              onSubmitEditing={handleVerify}
              className="text-3xl text-slate-900 tracking-widest text-center py-2"
              maxLength={8}
            />
          </View>

          <Pressable
            onPress={handleVerify}
            disabled={!canVerify}
            className={`mt-4 rounded-2xl py-4 items-center ${canVerify ? 'bg-slate-900' : 'bg-slate-200'}`}
          >
            {verifying
              ? <ActivityIndicator color="#fff" />
              : <Text className="font-bold text-base text-white">Sign in</Text>
            }
          </Pressable>

          <Pressable
            onPress={() => { setSent(false); setCode('') }}
            className="mt-4 items-center py-3"
          >
            <Text className="text-blue-500 font-semibold">Use a different email</Text>
          </Pressable>
        </KeyboardAvoidingView>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1 px-6 justify-center"
      >
        <View className="items-center mb-10">
          <Logo width={200} />
          <Text className="text-slate-500 mt-1">Your private family space</Text>
        </View>

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

        <Pressable
          onPress={handleSignIn}
          disabled={loading || !email.trim()}
          className={`mt-4 rounded-2xl py-4 items-center ${
            loading || !email.trim() ? 'bg-slate-200' : 'bg-slate-900'
          }`}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text className="font-bold text-base text-white">Send sign-in code</Text>
          }
        </Pressable>

        <Text className="text-center text-slate-400 text-sm mt-6">
          Family Vault is invite-only.{'\n'}
          Ask a family member to invite you.
        </Text>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
