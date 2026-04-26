import { useState } from 'react'
import {
  View, Text, FlatList, Pressable, TextInput,
  ActivityIndicator, KeyboardAvoidingView, Platform, Modal,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTasks } from '../../../hooks/useTasks'
import { useAuth } from '../../../hooks/useAuth'
import TaskRow from '../../../components/tasks/TaskRow'

export default function TasksScreen() {
  const { tasks, loading, createTask, toggleDone } = useTasks()
  const { profile }                                = useAuth()
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
    <View className="flex-1 bg-slate-50">
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#0f172a" />
        </View>
      ) : (
        <FlatList
          data={[...pending, ...completed]}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TaskRow task={item} onToggle={() => toggleDone(item.id, item.done)} />
          )}
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center py-20">
              <Text style={{ fontSize: 48 }}>✅</Text>
              <Text className="text-xl font-bold text-slate-900 mt-4">No tasks yet</Text>
              <Text className="text-slate-500 mt-2">Add tasks to keep your family organised.</Text>
            </View>
          }
          ListHeaderComponent={
            pending.length > 0 && completed.length > 0 ? (
              <View className="px-4 py-2 bg-slate-50">
                <Text className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                  To do — {pending.length}
                </Text>
              </View>
            ) : null
          }
          contentContainerStyle={{ paddingBottom: 100 }}
        />
      )}

      {/* FAB */}
      <Pressable
        onPress={() => setShowForm(true)}
        className="absolute bottom-6 right-6 bg-slate-900 rounded-full w-14 h-14 items-center justify-center shadow-lg"
      >
        <Text className="text-white text-3xl font-light">+</Text>
      </Pressable>

      {/* New task modal */}
      <Modal visible={showForm} transparent animationType="slide" onRequestClose={() => setShowForm(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1 justify-end">
          <Pressable className="flex-1" onPress={() => setShowForm(false)} />
          <View className="bg-white rounded-t-3xl px-6 pt-4 pb-10">
            <View className="w-10 h-1 bg-slate-200 rounded-full self-center mb-4" />
            <Text className="font-bold text-xl text-slate-900 mb-4">New Task</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Task title…"
              placeholderTextColor="#94a3b8"
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleCreate}
              className="bg-slate-100 rounded-2xl px-4 py-3 text-base text-slate-800 mb-4"
            />
            <Pressable
              onPress={handleCreate}
              disabled={creating || !title.trim()}
              className={`rounded-2xl py-4 items-center ${creating || !title.trim() ? 'bg-slate-200' : 'bg-slate-900'}`}
            >
              {creating
                ? <ActivityIndicator color="#fff" />
                : <Text className="font-bold text-white">Add Task</Text>
              }
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  )
}
