import { View, Text, Pressable } from 'react-native'
import { timeAgo } from '../../lib/timeAgo'

interface Props {
  item:       any
  onDownload: () => void
  onDelete:   () => void
}

export default function VaultItem({ item, onDownload, onDelete }: Props) {
  return (
    <View className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 mb-3 mx-4">
      <View className="flex-row items-start justify-between">
        <View className="flex-row items-center gap-3 flex-1">
          <Text style={{ fontSize: 28 }}>{item.emoji}</Text>
          <View className="flex-1">
            <Text className="font-semibold text-slate-900 text-base">{item.title}</Text>
            <Text className="text-xs text-slate-400 mt-0.5">{item.category} · {timeAgo(item.created_at)}</Text>
          </View>
        </View>
        <View className="flex-row gap-2">
          {item.file_url && (
            <Pressable onPress={onDownload} className="p-2 rounded-xl bg-blue-50">
              <Text className="text-blue-600 text-sm font-semibold">↓</Text>
            </Pressable>
          )}
          <Pressable onPress={onDelete} className="p-2 rounded-xl bg-red-50">
            <Text className="text-red-400 text-sm font-semibold">✕</Text>
          </Pressable>
        </View>
      </View>
      {item.notes ? (
        <Text className="text-slate-500 text-sm mt-3">{item.notes}</Text>
      ) : null}
    </View>
  )
}
