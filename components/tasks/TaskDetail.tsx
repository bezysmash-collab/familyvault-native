import { useEffect, useState } from 'react'
import {
  View, Text, Pressable, TextInput, ScrollView,
  Modal, KeyboardAvoidingView, Platform, Alert, ActivityIndicator,
} from 'react-native'
import DateTimePicker from '@react-native-community/datetimepicker'
import Avatar from '../shared/Avatar'

interface Props {
  task:     any
  profiles: any[]
  spaces:   any[]
  visible:  boolean
  onClose:  () => void
  onUpdate: (id: string, updates: any) => Promise<{ error: any }>
  onToggle: (id: string, done: boolean) => void
  onDelete: (id: string) => void
}

export default function TaskDetail({ task, profiles, spaces, visible, onClose, onUpdate, onToggle, onDelete }: Props) {
  const [title,          setTitle]          = useState('')
  const [assignTo,       setAssignTo]       = useState<string | null>(null)
  const [spaceId,        setSpaceId]        = useState<string | null>(null)
  const [dueDate,        setDueDate]        = useState<Date | null>(null)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [saving,         setSaving]         = useState(false)

  useEffect(() => {
    if (task) {
      setTitle(task.title ?? '')
      setAssignTo(task.assigned_to ?? null)
      setSpaceId(task.space_id ?? null)
      setDueDate(task.due_date ? new Date(task.due_date) : null)
      setShowDatePicker(false)
    }
  }, [task?.id])

  if (!task) return null

  const overdue = task.due_date && !task.done && new Date(task.due_date) < new Date()
  const dueDateLabel = dueDate
    ? dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : 'No due date'

  const handleSave = async () => {
    if (!title.trim()) return
    setSaving(true)
    await onUpdate(task.id, {
      title:     title.trim(),
      assignedTo: assignTo,
      dueDate:   dueDate ? dueDate.toISOString().split('T')[0] : null,
      spaceId,
    })
    setSaving(false)
    onClose()
  }

  const handleDelete = () => {
    Alert.alert('Delete task?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => { onDelete(task.id); onClose() } },
    ])
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <View style={{ backgroundColor: '#ffffff', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 24, paddingTop: 16, paddingBottom: 40 }}>
          {/* Handle */}
          <View style={{ width: 40, height: 4, backgroundColor: '#e2e8f0', borderRadius: 2, alignSelf: 'center', marginBottom: 16 }} />

          {/* Header row */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <Text style={{ fontWeight: '700', fontSize: 20, color: '#0f172a' }}>Task Details</Text>
            <Pressable onPress={handleDelete} hitSlop={8}>
              <Text style={{ color: '#ef4444', fontSize: 14, fontWeight: '600' }}>Delete</Text>
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Title */}
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Task title"
              placeholderTextColor="#94a3b8"
              style={{ borderBottomWidth: 2, borderBottomColor: title ? '#0f172a' : '#e2e8f0', paddingVertical: 8, fontSize: 16, color: '#1e293b', marginBottom: 20 }}
            />

            {/* Status toggle */}
            <Pressable
              onPress={() => { onToggle(task.id, task.done); onClose() }}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 10,
                backgroundColor: task.done ? '#f0fdf4' : '#f8fafc',
                borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, marginBottom: 20,
                borderWidth: 1, borderColor: task.done ? '#86efac' : '#e2e8f0',
              }}
            >
              <View style={{
                width: 24, height: 24, borderRadius: 12, borderWidth: 2,
                alignItems: 'center', justifyContent: 'center',
                backgroundColor: task.done ? '#22c55e' : 'transparent',
                borderColor: task.done ? '#22c55e' : '#cbd5e1',
              }}>
                {task.done && <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>✓</Text>}
              </View>
              <Text style={{ fontSize: 15, fontWeight: '600', color: task.done ? '#16a34a' : '#475569' }}>
                {task.done ? 'Done — tap to reopen' : 'Mark as Done'}
              </Text>
            </Pressable>

            {/* Assign to */}
            {profiles.length > 0 && (
              <View style={{ marginBottom: 20 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 10 }}>
                  Assigned to
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={{ flexDirection: 'row', gap: 16 }}>
                    {profiles.map((p) => (
                      <Pressable key={p.id} onPress={() => setAssignTo(assignTo === p.id ? null : p.id)} style={{ alignItems: 'center', gap: 4 }}>
                        <View style={assignTo === p.id ? { borderRadius: 50, borderWidth: 3, borderColor: '#0f172a', padding: 2 } : {}}>
                          <Avatar profile={p} size={40} />
                        </View>
                        <Text style={{ fontSize: 11, color: '#64748b', maxWidth: 60, textAlign: 'center' }} numberOfLines={1}>
                          {p.name?.split(' ')[0]}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </ScrollView>
              </View>
            )}

            {/* Due date */}
            <View style={{ marginBottom: 20 }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 10 }}>
                Due date
              </Text>
              <Pressable
                onPress={() => setShowDatePicker(!showDatePicker)}
                style={{ backgroundColor: '#f1f5f9', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: overdue ? '#fca5a5' : 'transparent' }}
              >
                <Text style={{ fontSize: 16 }}>{overdue ? '🔴' : '📅'}</Text>
                <Text style={{ fontSize: 14, color: overdue ? '#ef4444' : dueDate ? '#1e293b' : '#94a3b8', flex: 1 }}>
                  {overdue ? `Overdue · ${dueDateLabel}` : dueDateLabel}
                </Text>
                {dueDate && (
                  <Pressable onPress={() => setDueDate(null)}>
                    <Text style={{ color: '#94a3b8', fontWeight: '700' }}>✕</Text>
                  </Pressable>
                )}
              </Pressable>
              {showDatePicker && (
                <DateTimePicker
                  value={dueDate ?? new Date()}
                  mode="date"
                  display="inline"
                  onChange={(_, date) => { setShowDatePicker(false); if (date) setDueDate(date) }}
                  style={{ marginTop: 4 }}
                />
              )}
            </View>

            {/* Space */}
            {spaces.length > 0 && (
              <View style={{ marginBottom: 24 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 10 }}>
                  Space
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {spaces.map((s) => (
                      <Pressable
                        key={s.id}
                        onPress={() => setSpaceId(spaceId === s.id ? null : s.id)}
                        style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, backgroundColor: spaceId === s.id ? '#0f172a' : '#fff', borderColor: spaceId === s.id ? '#0f172a' : '#e2e8f0' }}
                      >
                        <Text style={{ fontSize: 13, fontWeight: '600', color: spaceId === s.id ? '#fff' : '#64748b' }}>
                          {s.emoji} {s.name}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </ScrollView>
              </View>
            )}
          </ScrollView>

          {/* Save button */}
          <Pressable
            onPress={handleSave}
            disabled={saving || !title.trim()}
            style={{ borderRadius: 16, paddingVertical: 16, alignItems: 'center', backgroundColor: saving || !title.trim() ? '#e2e8f0' : '#0f172a' }}
          >
            {saving
              ? <ActivityIndicator color="#fff" />
              : <Text style={{ fontWeight: '700', color: '#ffffff', fontSize: 16 }}>Save Changes</Text>
            }
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}
