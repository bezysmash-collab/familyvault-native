import { View, Text, Switch, Pressable, ScrollView, ActivityIndicator, Linking } from 'react-native'
import { router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuth } from '../../hooks/useAuth'
import { useNotificationPrefs } from '../../hooks/useNotificationPrefs'
import type { NotificationPreferences } from '../../hooks/useNotificationPrefs'

type PrefKey = keyof Omit<NotificationPreferences, 'user_id' | 'updated_at'>

const PREF_ROWS: { key: PrefKey; label: string; description: string; icon: string }[] = [
  {
    key: 'new_post',
    icon: '📝',
    label: 'New posts',
    description: 'When a family member shares something',
  },
  {
    key: 'reaction_on_post',
    icon: '❤️',
    label: 'Reactions',
    description: 'When someone reacts to your post',
  },
  {
    key: 'comment_on_post',
    icon: '💬',
    label: 'Comments',
    description: 'When someone comments on your post',
  },
  {
    key: 'task_assigned',
    icon: '✅',
    label: 'Tasks assigned to me',
    description: 'When a family member assigns you a task',
  },
  {
    key: 'task_completed',
    icon: '🏁',
    label: 'My tasks completed',
    description: 'When someone completes a task you created',
  },
]

export default function NotificationsScreen() {
  const { profile }       = useAuth()
  const { prefs, loading, update } = useNotificationPrefs(profile?.id)

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-slate-100">
        <Pressable onPress={() => router.back()}>
          <Text className="text-slate-400 text-lg">‹</Text>
        </Pressable>
        <Text className="font-bold text-slate-900 text-base">Notifications</Text>
        <View className="w-6" />
      </View>

      <ScrollView className="flex-1">
        {/* iOS system settings link */}
        <View className="mx-4 mt-6 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <Pressable
            onPress={() => Linking.openURL('app-settings:')}
            className="flex-row items-center gap-3 px-4 py-4"
          >
            <Text style={{ fontSize: 20 }}>📱</Text>
            <View className="flex-1">
              <Text className="text-base text-slate-800 font-semibold">iOS Notification Settings</Text>
              <Text className="text-xs text-slate-400 mt-0.5">
                Control banners, sounds, and lock screen appearance
              </Text>
            </View>
            <Text className="text-slate-300">›</Text>
          </Pressable>
        </View>

        <Text className="text-xs font-bold text-slate-400 uppercase tracking-widest px-4 mt-6 mb-2">
          Notify me about
        </Text>

        {/* Per-type toggles */}
        <View className="mx-4 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          {loading ? (
            <View className="py-8 items-center">
              <ActivityIndicator color="#64748b" />
            </View>
          ) : (
            PREF_ROWS.map((row, i) => (
              <View
                key={row.key}
                className={`flex-row items-center gap-3 px-4 py-4 ${i < PREF_ROWS.length - 1 ? 'border-b border-slate-50' : ''}`}
              >
                <Text style={{ fontSize: 20 }}>{row.icon}</Text>
                <View className="flex-1">
                  <Text className="text-base text-slate-800">{row.label}</Text>
                  <Text className="text-xs text-slate-400 mt-0.5">{row.description}</Text>
                </View>
                <Switch
                  value={prefs?.[row.key] ?? true}
                  onValueChange={(value) => update(row.key, value)}
                  trackColor={{ true: '#0f172a', false: '#e2e8f0' }}
                  thumbColor="#ffffff"
                />
              </View>
            ))
          )}
        </View>

        <Text className="text-xs text-slate-400 text-center px-6 mt-4 mb-8">
          These preferences control which events trigger push notifications.
          iOS system settings control how they appear on your device.
        </Text>
      </ScrollView>
    </SafeAreaView>
  )
}
