import { useState } from 'react'
import { Tabs, router } from 'expo-router'
import { Pressable, View, Text } from 'react-native'
import { Image } from 'expo-image'
import * as Notifications from 'expo-notifications'
import { useAuth } from '../../hooks/useAuth'
import Avatar from '../../components/shared/Avatar'
import NotificationsModal from '../../components/shared/NotificationsModal'

export default function TabLayout() {
  const { profile } = useAuth()
  const [showNotifs, setShowNotifs] = useState(false)

  return (
    <>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor:   '#0f172a',
          tabBarInactiveTintColor: '#94a3b8',
          tabBarStyle: {
            backgroundColor: '#ffffff',
            borderTopColor:  '#f1f5f9',
            paddingBottom:   4,
          },
          headerStyle:           { backgroundColor: '#ffffff' },
          headerShadowVisible:   false,
          headerTitleStyle:      { fontWeight: '800', fontSize: 20, color: '#0f172a' },
          headerRight: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingRight: 16 }}>
              <Pressable
                onPress={() => {
                  Notifications.setBadgeCountAsync(0)
                  setShowNotifs(true)
                }}
              >
                <Text style={{ fontSize: 22 }}>🔔</Text>
              </Pressable>
              <Pressable onPress={() => router.push('/settings')}>
                <Avatar profile={profile} size={32} />
              </Pressable>
            </View>
          ),
        }}
      >
        <Tabs.Screen
          name="feed/index"
          options={{
            title: 'Home',
            tabBarIcon: ({ color }) => <Text style={{ fontSize: 22, color }}>🏠</Text>,
            headerTitle: () => (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Image
                  source={require('../../assets/logo.svg')}
                  style={{ width: 32, height: 27 }}
                  contentFit="contain"
                />
                <Text style={{ fontWeight: '800', fontSize: 20, color: '#0f172a' }}>Family Vault</Text>
              </View>
            ),
          }}
        />
        <Tabs.Screen
          name="tasks/index"
          options={{
            title: 'Tasks',
            tabBarIcon: ({ color }) => <Text style={{ fontSize: 22, color }}>✅</Text>,
          }}
        />
        <Tabs.Screen
          name="vault/index"
          options={{
            title: 'Vault',
            tabBarIcon: ({ color }) => <Text style={{ fontSize: 22, color }}>🔒</Text>,
          }}
        />
        <Tabs.Screen
          name="history/index"
          options={{
            title: 'History',
            tabBarIcon: ({ color }) => <Text style={{ fontSize: 22, color }}>🕐</Text>,
          }}
        />
        {/* Modal screens — hidden from the tab bar */}
        <Tabs.Screen name="feed/new-post" options={{ href: null }} />
      </Tabs>

      <NotificationsModal
        visible={showNotifs}
        profileId={profile?.id ?? ''}
        onClose={() => setShowNotifs(false)}
      />
    </>
  )
}
