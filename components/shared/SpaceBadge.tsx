import { View, Text } from 'react-native'

interface Props {
  space: { name: string; emoji: string } | null
}

export default function SpaceBadge({ space }: Props) {
  if (!space) return null
  return (
    <View className="bg-slate-100 rounded-full px-2 py-0.5 flex-row items-center">
      <Text className="text-xs text-slate-500 font-medium">{space.emoji} {space.name}</Text>
    </View>
  )
}
