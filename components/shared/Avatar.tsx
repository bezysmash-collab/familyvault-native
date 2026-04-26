import { View, Text } from 'react-native'

interface Props {
  profile?: { initials: string; color: string; name?: string } | null
  size?: number
}

export default function Avatar({ profile, size = 40 }: Props) {
  const fontSize = size * 0.38

  if (!profile) {
    return (
      <View
        style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: '#e2e8f0' }}
      />
    )
  }

  return (
    <View
      testID="avatar-container"
      style={{
        width:           size,
        height:          size,
        borderRadius:    size / 2,
        backgroundColor: profile.color,
        alignItems:      'center',
        justifyContent:  'center',
      }}
    >
      <Text style={{ color: '#fff', fontWeight: '700', fontSize }} selectable={false}>
        {profile.initials}
      </Text>
    </View>
  )
}
