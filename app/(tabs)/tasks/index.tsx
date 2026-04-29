import { useState } from 'react'
import {
  View, Text, ScrollView, Pressable, TextInput,
  ActivityIndicator, KeyboardAvoidingView, Platform, Modal,
} from 'react-native'
import DateTimePicker from '@react-native-community/datetimepicker'
import { useTasks } from '../../../hooks/useTasks'
import { useProfiles } from '../../../hooks/useProfiles'
import { useSpaces } from '../../../hooks/useSpaces'
import { useContentHeight } from '../../../hooks/useContentHeight'
import { useAuth } from '../../../hooks/useAuth'
import TaskRow from '../../../components/tasks/TaskRow'
import Avatar from '../../../components/shared/Avatar'

export default function TasksScreen() {
  const { tasks, loading, createTask, toggleDone } = useTasks()
  const { profiles } = useProfiles()
  const { spaces }   = useSpaces()
  const { profile: me } = useAuth()
  const contentHeight = useContentHeight()

  const [filter,   setFilter]   = useState<'pending' | 'mine' | 'done'>('pending')
  const [showForm, setShowForm] = useState(false)
  const [title,    setTitle]    = useState('')
  const [assignTo, setAssignTo] = useState<string | null>(null)
  const [spaceId,  setSpaceId]  = useState<string | null>(null)
  const [dueDate,  setDueDate]  = useState<Date | null>(null)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [creating, setCreating] = useState(false)

  const shown = tasks.filter((t) => {
    if (filter === 'pending') return !t.done
    if (filter === 'mine')    return t.assigned_to === me?.id && !t.done
    if (filter === 'done')    return t.done
    return true
  })
  const pendingCount = tasks.filter((t) => !t.done).length

  const resetForm = () => {
    setTitle(''); setAssignTo(null); setSpaceId(null); setDueDate(null)
    setShowDatePicker(false); setShowForm(false)
  }

  const handleCreate = async () => {
    if (!title.trim()) return
    setCreating(true)
    await createTask({
      title: title.trim(),
      assignedTo: assignTo,
      dueDate: dueDate ? dueDate.toISOString().split('T')[0] : null,
      spaceId,
    })
    setCreating(false)
    resetForm()
  }

  const dueDateLabel = dueDate
    ? dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : 'Set due date'

  return (
    <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      {/* Filter tabs */}
      <View style={{ backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9', paddingHorizontal: 16, paddingVertical: 10, flexDirection: 'row', gap: 8 }}>
        {([
          { k: 'pending', l: 'Pending' },
          { k: 'mine',    l: 'Mine' },
          { k: 'done',    l: 'Done' },
        ] as const).map((tab) => (
          <Pressable
            key={tab.k}
            onPress={() => setFilter(tab.k)}
            style={{
              flexDirection: 'row', alignItems: 'center', gap: 6,
              paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
              backgroundColor: filter === tab.k ? '#0f172a' : '#f1f5f9',
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: '600', color: filter === tab.k ? '#ffffff' : '#64748b' }}>
              {tab.l}
            </Text>
            {tab.k === 'pending' && pendingCount > 0 && (
              <View style={{ backgroundColor: filter === 'pending' ? '#ffffff' : '#f59e0b', borderRadius: 8, paddingHorizontal: 5, paddingVertical: 1 }}>
                <Text style={{ fontSize: 10, fontWeight: '700', color: filter === 'pending' ? '#0f172a' : '#ffffff' }}>
                  {pendingCount}
                </Text>
              </View>
            )}
          </Pressable>
        ))}
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#0f172a" />
        </View>
      ) : shown.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 80 }}>
          <Text style={{ fontSize: 48 }}>{filter === 'done' ? '✅' : '🎉'}</Text>
          <Text style={{ fontSize: 20, fontWeight: '700', color: '#0f172a', marginTop: 16 }}>
            {filter === 'done' ? 'No completed tasks yet' : "You're all caught up!"}
          </Text>
        </View>
      ) : (
        <ScrollView style={{ height: contentHeight - 49 }} contentContainerStyle={{ paddingBottom: 100 }}>
          {shown.map((item) => (
            <TaskRow key={item.id} task={item} onToggle={() => toggleDone(item.id, item.done)} />
          ))}
        </ScrollView>
      )}

      <Pressable
        onPress={() => setShowForm(true)}
        style={{ position: 'absolute', bottom: 24, right: 24, backgroundColor: '#0f172a', borderRadius: 28, width: 56, height: 56, alignItems: 'center', justifyContent: 'center' }}
      >
        <Text style={{ color: '#ffffff', fontSize: 28, lineHeight: 32, fontWeight: '300' }}>+</Text>
      </Pressable>

      <Modal visible={showForm} transparent animationType="slide" onRequestClose={resetForm}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, justifyContent: 'flex-end' }}>
          <Pressable style={{ flex: 1 }} onPress={resetForm} />
          <View style={{ backgroundColor: '#ffffff', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 24, paddingTop: 16, paddingBottom: 40 }}>
            <View style={{ width: 40, height: 4, backgroundColor: '#e2e8f0', borderRadius: 2, alignSelf: 'center', marginBottom: 16 }} />
            <Text style={{ fontWeight: '700', fontSize: 20, color: '#0f172a', marginBottom: 16 }}>New Task</Text>

            {/* Title */}
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="What needs to be done?"
              placeholderTextColor="#94a3b8"
              autoFocus
              returnKeyType="done"
              style={{ borderBottomWidth: 2, borderBottomColor: title ? '#0f172a' : '#e2e8f0', paddingVertical: 8, fontSize: 16, color: '#1e293b', marginBottom: 20 }}
            />

            {/* Assign to */}
            {profiles.length > 0 && (
              <View style={{ marginBottom: 20 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 10 }}>
                  Assign to
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -4 }}>
                  <View style={{ flexDirection: 'row', gap: 16, paddingHorizontal: 4 }}>
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
                style={{
                  backgroundColor: '#f1f5f9', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12,
                  flexDirection: 'row', alignItems: 'center', gap: 8,
                }}
              >
                <Text style={{ fontSize: 16 }}>📅</Text>
                <Text style={{ fontSize: 14, color: dueDate ? '#1e293b' : '#94a3b8', flex: 1 }}>{dueDateLabel}</Text>
                {dueDate && (
                  <Pressable onPress={(e) => { e.stopPropagation(); setDueDate(null) }}>
                    <Text style={{ color: '#94a3b8', fontWeight: '700' }}>✕</Text>
                  </Pressable>
                )}
              </Pressable>
              {showDatePicker && (
                <DateTimePicker
                  value={dueDate ?? new Date()}
                  mode="date"
                  display="inline"
                  minimumDate={new Date()}
                  onChange={(_, date) => {
                    setShowDatePicker(false)
                    if (date) setDueDate(date)
                  }}
                  style={{ marginTop: 4 }}
                />
              )}
            </View>

            {/* Space */}
            {spaces.length > 0 && (
              <View style={{ marginBottom: 20 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 10 }}>
                  Space
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -4 }}>
                  <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 4 }}>
                    {spaces.map((s) => (
                      <Pressable
                        key={s.id}
                        onPress={() => setSpaceId(spaceId === s.id ? null : s.id)}
                        style={{
                          paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
                          borderWidth: 1,
                          backgroundColor: spaceId === s.id ? '#0f172a' : '#ffffff',
                          borderColor: spaceId === s.id ? '#0f172a' : '#e2e8f0',
                        }}
                      >
                        <Text style={{ fontSize: 13, fontWeight: '600', color: spaceId === s.id ? '#ffffff' : '#64748b' }}>
                          {s.emoji} {s.name}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </ScrollView>
              </View>
            )}

            <Pressable
              onPress={handleCreate}
              disabled={creating || !title.trim()}
              style={{ borderRadius: 16, paddingVertical: 16, alignItems: 'center', backgroundColor: creating || !title.trim() ? '#e2e8f0' : '#0f172a' }}
            >
              {creating
                ? <ActivityIndicator color="#fff" />
                : <Text style={{ fontWeight: '700', color: '#ffffff' }}>Add Task</Text>
              }
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  )
}
