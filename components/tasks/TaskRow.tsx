import { View, Text, Pressable } from 'react-native'
import Avatar from '../shared/Avatar'

interface Props {
  task:     any
  onToggle: () => void
}

export default function TaskRow({ task, onToggle }: Props) {
  return (
    <Pressable
      onPress={onToggle}
      className="flex-row items-start gap-3 py-3 px-4 bg-white border-b border-slate-50"
    >
      {/* Checkbox */}
      <View className={`w-6 h-6 rounded-lg border-2 mt-0.5 items-center justify-center flex-shrink-0 ${
        task.done ? 'bg-green-500 border-green-500' : 'border-slate-300'
      }`}>
        {task.done && <Text className="text-white text-xs font-bold">✓</Text>}
      </View>

      {/* Content */}
      <View className="flex-1">
        <Text className={`text-base ${task.done ? 'line-through text-slate-400' : 'text-slate-800'}`}>
          {task.title}
        </Text>
        <View className="flex-row items-center gap-2 mt-1">
          {task.assigned_to_profile && (
            <View className="flex-row items-center gap-1">
              <Avatar profile={task.assigned_to_profile} size={16} />
              <Text className="text-xs text-slate-400">{task.assigned_to_profile.name}</Text>
            </View>
          )}
          {task.due_date && (
            <Text className="text-xs text-slate-400">
              Due {new Date(task.due_date).toLocaleDateString()}
            </Text>
          )}
          {task.space && (
            <Text className="text-xs text-slate-400">{task.space.emoji} {task.space.name}</Text>
          )}
        </View>
      </View>
    </Pressable>
  )
}
