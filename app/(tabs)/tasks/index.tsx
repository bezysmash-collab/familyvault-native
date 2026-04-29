import { useState } from 'react'
import {
  View, Text, ScrollView, Pressable, TextInput,
  ActivityIndicator, KeyboardAvoidingView, Platform, Modal,
} from 'react-native'
import { useTasks } from '../../../hooks/useTasks'
import TaskRow from '../../../components/tasks/TaskRow'

export default function TasksScreen() {
  const { tasks, loading, createTask, toggleDone } = useTasks()
  const [showForm, setShowForm]                    = useState(false)
  const [title,    setTitle]                       = useState('')
  const [creating, setCreating]                    = useState(false)

  const pending   = tasks.filter((t) => !t.done)
  const completed = tasks.filter((t) =>  t.done)

  const handleCreate = async () => {
    if (!title.trim()) return
    setCreating(true)
    await createTask({ title: title.trim(), assignedTo: null, dueDate: null, spaceId: null })
    setTitle('')
    setCreating(false)
    setShowForm(false)
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#0f172a" />
        </View>
      ) : tasks.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 80 }}>
          <Text style={{ fontSize: 48 }}>✅</Text>
          <Text style={{ fontSize: 20, fontWeight: '700', color: '#0f172a', marginTop: 16 }}>No tasks yet</Text>
          <Text style={{ color: '#64748b', marginTop: 8 }}>Add tasks to keep your family organised.</Text>
        </View>
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 100 }}>
          {pending.length > 0 && completed.length > 0 && (
            <View style={{ paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#f8fafc' }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1.5 }}>
                To do — {pending.length}
              </Text>
            </View>
          )}
          {pending.map((item) => (
            <TaskRow key={item.id} task={item} onToggle={() => toggleDone(item.id, item.done)} />
          ))}
          {completed.length > 0 && (
            <View style={{ paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#f8fafc', marginTop: 8 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1.5 }}>
                Completed — {completed.length}
              </Text>
            </View>
          )}
          {completed.map((item) => (
            <TaskRow key={item.id} task={item} onToggle={() => toggleDone(item.id, item.done)} />
          ))}
        </ScrollView>
      )}

      {/* FAB */}
      <Pressable
        onPress={() => setShowForm(true)}
        style={{ position: 'absolute', bottom: 24, right: 24, backgroundColor: '#0f172a', borderRadius: 28, width: 56, height: 56, alignItems: 'center', justifyContent: 'center' }}
      >
        <Text style={{ color: '#ffffff', fontSize: 28, lineHeight: 32, fontWeight: '300' }}>+</Text>
      </Pressable>

      {/* New task modal */}
      <Modal visible={showForm} transparent animationType="slide" onRequestClose={() => setShowForm(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, justifyContent: 'flex-end' }}>
          <Pressable style={{ flex: 1 }} onPress={() => setShowForm(false)} />
          <View style={{ backgroundColor: '#ffffff', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 24, paddingTop: 16, paddingBottom: 40 }}>
            <View style={{ width: 40, height: 4, backgroundColor: '#e2e8f0', borderRadius: 2, alignSelf: 'center', marginBottom: 16 }} />
            <Text style={{ fontWeight: '700', fontSize: 20, color: '#0f172a', marginBottom: 16 }}>New Task</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Task title…"
              placeholderTextColor="#94a3b8"
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleCreate}
              style={{ backgroundColor: '#f1f5f9', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16, color: '#1e293b', marginBottom: 16 }}
            />
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
