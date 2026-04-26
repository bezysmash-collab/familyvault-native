import { View, Text, Pressable, ScrollView, Alert } from 'react-native'
import { router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuth } from '../../hooks/useAuth'
import Avatar from '../../components/shared/Avatar'
import Logo from '../../components/shared/Logo'
import { useInvite } from '../../hooks/useInvite'

export default function SettingsScreen() {
  const { profile, signOut } = useAuth()
  const { shareInvite }      = useInvite()

  const handleSignOut = () => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: signOut },
    ])
  }

  const rows = [
    { label: 'Edit profile',    icon: '✏️', onPress: () => router.push('/settings/profile') },
    { label: 'Notifications',   icon: '🔔', onPress: () => router.push('/settings/notifications') },
    { label: 'Invite a member', icon: '📨', onPress: () => shareInvite(null) },
  ]

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-slate-100">
        <Logo width={100} />
        <Pressable onPress={() => router.back()}>
          <Text className="text-slate-400 font-bold text-lg">✕</Text>
        </Pressable>
      </View>

      <ScrollView className="flex-1">
        {/* Profile card */}
        <View className="mx-4 mt-6 bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex-row items-center gap-4">
          <Avatar profile={profile} size={52} />
          <View>
            <Text className="font-bold text-slate-900 text-lg">{profile?.name}</Text>
            <Text className="text-slate-400 text-sm">Family member</Text>
          </View>
        </View>

        {/* Actions */}
        <View className="mx-4 mt-4 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          {rows.map((row, i) => (
            <Pressable
              key={row.label}
              onPress={row.onPress}
              className={`flex-row items-center gap-3 px-4 py-4 ${i < rows.length - 1 ? 'border-b border-slate-50' : ''}`}
            >
              <Text style={{ fontSize: 20 }}>{row.icon}</Text>
              <Text className="flex-1 text-base text-slate-800">{row.label}</Text>
              <Text className="text-slate-300">›</Text>
            </Pressable>
          ))}
        </View>

        {/* Sign out */}
        <View className="mx-4 mt-4 mb-8 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <Pressable onPress={handleSignOut} className="flex-row items-center gap-3 px-4 py-4">
            <Text style={{ fontSize: 20 }}>🚪</Text>
            <Text className="text-red-500 text-base font-semibold">Sign out</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
