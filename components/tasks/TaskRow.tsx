import { View, Text, Pressable } from 'react-native'
import Avatar from '../shared/Avatar'

interface Props {
  task:     any
  onToggle: () => void
}

export default function TaskRow({ task, onToggle }: Props) {
  const overdue = task.due_date && !task.done && new Date(task.due_date) < new Date()

  return (
    <Pressable
      onPress={onToggle}
      style={{
        flexDirection: 'row', alignItems: 'flex-start', gap: 12,
        paddingVertical: 14, paddingHorizontal: 16,
        backgroundColor: '#ffffff',
        borderBottomWidth: 1, borderBottomColor: '#f8fafc',
        borderLeftWidth: 3,
        borderLeftColor: task.done ? '#22c55e' : overdue ? '#ef4444' : '#ffffff',
      }}
    >
      {/* Checkbox */}
      <View style={{
        width: 26, height: 26, borderRadius: 13, borderWidth: 2, marginTop: 1,
        alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        backgroundColor: task.done ? '#22c55e' : 'transparent',
        borderColor: task.done ? '#22c55e' : overdue ? '#ef4444' : '#cbd5e1',
      }}>
        {task.done && <Text style={{ color: '#ffffff', fontSize: 12, fontWeight: '700' }}>✓</Text>}
      </View>

      {/* Content */}
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 15, color: task.done ? '#94a3b8' : '#0f172a', textDecorationLine: task.done ? 'line-through' : 'none', lineHeight: 21 }}>
          {task.title}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4, flexWrap: 'wrap' }}>
          {task.assigned_to_profile && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Avatar profile={task.assigned_to_profile} size={16} />
              <Text style={{ fontSize: 12, color: '#64748b' }}>{task.assigned_to_profile.name?.split(' ')[0]}</Text>
            </View>
          )}
          {task.due_date && (
            <Text style={{ fontSize: 12, color: overdue ? '#ef4444' : '#94a3b8', fontWeight: overdue ? '600' : '400' }}>
              {overdue ? 'Overdue · ' : ''}
              {new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </Text>
          )}
          {task.space && (
            <Text style={{ fontSize: 11, color: '#64748b', backgroundColor: '#f1f5f9', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8 }}>
              {task.space.emoji} {task.space.name}
            </Text>
          )}
        </View>
      </View>
    </Pressable>
  )
}
