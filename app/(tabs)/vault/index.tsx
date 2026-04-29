import { useState, useCallback } from 'react'
import {
  View, Text, ScrollView, Pressable, TextInput,
  ActivityIndicator, Alert, Modal, KeyboardAvoidingView,
  Platform,
} from 'react-native'
import * as DocumentPicker from 'expo-document-picker'
import * as SecureStore from 'expo-secure-store'
import * as Linking from 'expo-linking'
import { useVault } from '../../../hooks/useVault'
import VaultItem from '../../../components/vault/VaultItem'

const VAULT_PIN_KEY = 'vault_pin'

const CATEGORIES = ['Insurance', 'Legal', 'Health', 'Finance', 'Identity', 'General']

export default function VaultScreen() {
  const { items, loading, createItem, deleteItem, getDownloadUrl } = useVault()
  const [unlocked,  setUnlocked]  = useState(false)
  const [pin,       setPin]       = useState('')
  const [showForm,  setShowForm]  = useState(false)
  const [title,     setTitle]     = useState('')
  const [category,  setCategory]  = useState(CATEGORIES[0])
  const [notes,     setNotes]     = useState('')
  const [file,      setFile]      = useState<any>(null)
  const [creating,  setCreating]  = useState(false)

  const handleUnlock = async () => {
    const stored = await SecureStore.getItemAsync(VAULT_PIN_KEY)
    if (!stored) {
      // First time — set the PIN
      await SecureStore.setItemAsync(VAULT_PIN_KEY, pin)
      setUnlocked(true)
    } else if (stored === pin) {
      setUnlocked(true)
    } else {
      Alert.alert('Wrong PIN', 'Try again.')
      setPin('')
    }
  }

  const pickFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true })
    if (!result.canceled) setFile(result.assets[0])
  }

  const handleCreate = async () => {
    if (!title.trim()) return
    setCreating(true)
    const { error } = await createItem({ title, category, notes, file })
    setCreating(false)
    if (error) { Alert.alert('Error', error.message); return }
    setTitle(''); setNotes(''); setFile(null); setShowForm(false)
  }

  const handleDownload = useCallback(async (item: any) => {
    if (!item.file_url) return
    const { url, error } = await getDownloadUrl(item.file_url)
    if (error || !url) { Alert.alert('Error', 'Could not generate download link.'); return }
    Linking.openURL(url)
  }, [getDownloadUrl])

  const handleDelete = useCallback((item: any) => {
    Alert.alert('Delete item', `Delete "${item.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteItem(item.id) },
    ])
  }, [deleteItem])

  if (!unlocked) {
    return (
      <View className="flex-1 bg-slate-50 items-center justify-center px-8">
        <Text style={{ fontSize: 48 }}>🔒</Text>
        <Text className="text-2xl font-bold text-slate-900 mt-4">Vault</Text>
        <Text className="text-slate-500 mt-2 text-center mb-8">Enter your PIN to access secure documents</Text>
        <TextInput
          value={pin}
          onChangeText={setPin}
          placeholder="Enter PIN"
          placeholderTextColor="#94a3b8"
          secureTextEntry
          keyboardType="number-pad"
          returnKeyType="done"
          onSubmitEditing={handleUnlock}
          className="bg-white border border-slate-200 rounded-2xl px-6 py-4 text-center text-xl text-slate-900 w-full mb-4"
        />
        <Pressable
          onPress={handleUnlock}
          disabled={!pin}
          className={`w-full rounded-2xl py-4 items-center ${!pin ? 'bg-slate-200' : 'bg-slate-900'}`}
        >
          <Text className="font-bold text-white">Unlock</Text>
        </Pressable>
      </View>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#0f172a" />
        </View>
      ) : items.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 80 }}>
          <Text style={{ fontSize: 48 }}>🗂️</Text>
          <Text className="text-xl font-bold text-slate-900 mt-4">Nothing here yet</Text>
          <Text className="text-slate-500 mt-2">Add documents, passwords, or notes.</Text>
        </View>
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingTop: 12, paddingBottom: 100 }}>
          {items.map((item) => (
            <VaultItem
              key={item.id}
              item={item}
              onDownload={() => handleDownload(item)}
              onDelete={() => handleDelete(item)}
            />
          ))}
        </ScrollView>
      )}

      {/* FAB */}
      <Pressable
        onPress={() => setShowForm(true)}
        className="absolute bottom-6 right-6 bg-slate-900 rounded-full w-14 h-14 items-center justify-center shadow-lg"
      >
        <Text className="text-white text-3xl font-light">+</Text>
      </Pressable>

      {/* New item modal */}
      <Modal visible={showForm} transparent animationType="slide" onRequestClose={() => setShowForm(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1 justify-end">
          <Pressable className="flex-1" onPress={() => setShowForm(false)} />
          <View className="bg-white rounded-t-3xl px-6 pt-4 pb-10">
            <View className="w-10 h-1 bg-slate-200 rounded-full self-center mb-4" />
            <Text className="font-bold text-xl text-slate-900 mb-4">New Vault Item</Text>

            <TextInput value={title} onChangeText={setTitle} placeholder="Title"
              placeholderTextColor="#94a3b8" className="bg-slate-100 rounded-2xl px-4 py-3 text-base text-slate-800 mb-3" />

            <View className="flex-row flex-wrap gap-2 mb-3">
              {CATEGORIES.map((c) => (
                <Pressable key={c} onPress={() => setCategory(c)}
                  className={`px-3 py-1.5 rounded-full border ${category === c ? 'bg-slate-900 border-slate-900' : 'border-slate-200'}`}>
                  <Text className={`text-xs font-semibold ${category === c ? 'text-white' : 'text-slate-600'}`}>{c}</Text>
                </Pressable>
              ))}
            </View>

            <TextInput value={notes} onChangeText={setNotes} placeholder="Notes (optional)"
              placeholderTextColor="#94a3b8" multiline numberOfLines={3}
              className="bg-slate-100 rounded-2xl px-4 py-3 text-base text-slate-800 mb-3 min-h-16" />

            <Pressable onPress={pickFile} className="bg-slate-100 rounded-2xl px-4 py-3 mb-4 flex-row items-center gap-2">
              <Text style={{ fontSize: 18 }}>{file ? '📄' : '📎'}</Text>
              <Text className="text-slate-500 text-sm">{file ? file.name : 'Attach a file (optional)'}</Text>
            </Pressable>

            <Pressable onPress={handleCreate} disabled={creating || !title.trim()}
              className={`rounded-2xl py-4 items-center ${creating || !title.trim() ? 'bg-slate-200' : 'bg-slate-900'}`}>
              {creating ? <ActivityIndicator color="#fff" /> : <Text className="font-bold text-white">Save to Vault</Text>}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  )
}
