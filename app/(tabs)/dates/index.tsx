import { useState, useEffect } from 'react'
import {
  View, Text, ScrollView, Pressable, TextInput,
  Modal, KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native'
import DateTimePicker from '@react-native-community/datetimepicker'
import * as Notifications from 'expo-notifications'
import { useDates } from '../../../hooks/useDates'
import { useContentHeight } from '../../../hooks/useContentHeight'
import DateCard from '../../../components/dates/DateCard'

const EMOJI_OPTIONS = ['🎂', '💍', '🎓', '🎉', '✈️', '🏠', '❤️', '⭐', '🌟', '🏆', '📅', '🎁']

type FormState = {
  id?:         string
  title:       string
  date:        Date
  emoji:       string
  description: string
  reminder1:   Date | null
  reminder2:   Date | null
}

const DEFAULT_FORM: FormState = {
  title: '', date: new Date(), emoji: '📅', description: '', reminder1: null, reminder2: null,
}

function ReminderPicker({
  label, value, onChange,
}: { label: string; value: Date | null; onChange: (d: Date | null) => void }) {
  const [show, setShow] = useState(false)
  const [mode, setMode] = useState<'date' | 'time'>('date')
  const [draft, setDraft] = useState<Date | null>(null)

  const formatted = value
    ? value.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
    : 'Not set'

  const openPicker = () => { setDraft(value ?? new Date()); setMode('date'); setShow(true) }

  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={{ fontSize: 12, fontWeight: '600', color: '#64748b', marginBottom: 6 }}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Pressable
          onPress={openPicker}
          style={{ flex: 1, backgroundColor: '#f1f5f9', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, flexDirection: 'row', alignItems: 'center', gap: 8 }}
        >
          <Text style={{ fontSize: 16 }}>🔔</Text>
          <Text style={{ fontSize: 13, color: value ? '#1e293b' : '#94a3b8', flex: 1 }}>{formatted}</Text>
        </Pressable>
        {value && (
          <Pressable onPress={() => onChange(null)} style={{ padding: 8 }}>
            <Text style={{ color: '#94a3b8', fontWeight: '700', fontSize: 16 }}>✕</Text>
          </Pressable>
        )}
      </View>
      {show && (
        <DateTimePicker
          value={draft ?? new Date()}
          mode={mode}
          display="inline"
          onChange={(_, selected) => {
            if (!selected) { setShow(false); return }
            if (mode === 'date') {
              setDraft(selected)
              setMode('time')
            } else {
              setShow(false)
              onChange(selected)
            }
          }}
          style={{ marginTop: 8 }}
        />
      )}
    </View>
  )
}

export default function DatesScreen() {
  const { dates, loading, createDate, updateDate, deleteDate } = useDates()
  const contentHeight = useContentHeight()
  const [showForm,    setShowForm]    = useState(false)
  const [form,        setForm]        = useState<FormState>(DEFAULT_FORM)
  const [saving,      setSaving]      = useState(false)
  const [showDatePicker, setShowDatePicker] = useState(false)

  useEffect(() => {
    Notifications.requestPermissionsAsync()
  }, [])

  const openNew = () => { setForm(DEFAULT_FORM); setShowForm(true) }
  const openEdit = (d: any) => {
    setForm({
      id:          d.id,
      title:       d.title,
      date:        new Date(d.date + 'T00:00:00'),
      emoji:       d.emoji,
      description: d.description ?? '',
      reminder1:   d.reminder_1 ? new Date(d.reminder_1) : null,
      reminder2:   d.reminder_2 ? new Date(d.reminder_2) : null,
    })
    setShowForm(true)
  }
  const closeForm = () => { setShowForm(false); setShowDatePicker(false) }

  const handleSave = async () => {
    if (!form.title.trim()) return
    setSaving(true)
    const dateStr = form.date.toISOString().split('T')[0]
    if (form.id) {
      await updateDate(form.id, {
        title:       form.title.trim(),
        date:        dateStr,
        emoji:       form.emoji,
        description: form.description.trim() || undefined,
        reminder1:   form.reminder1,
        reminder2:   form.reminder2,
      })
    } else {
      await createDate({
        title:       form.title.trim(),
        date:        dateStr,
        emoji:       form.emoji,
        description: form.description.trim() || undefined,
        reminder1:   form.reminder1,
        reminder2:   form.reminder2,
      })
    }
    setSaving(false)
    closeForm()
  }

  const handleDelete = () => {
    if (!form.id) return
    Alert.alert('Delete this date?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          await deleteDate(form.id!)
          closeForm()
        },
      },
    ])
  }

  const upcoming = dates.filter((d) => new Date(d.date + 'T00:00:00') >= new Date(new Date().toDateString()))
  const past     = dates.filter((d) => new Date(d.date + 'T00:00:00') <  new Date(new Date().toDateString()))

  const dateLabel = form.date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

  return (
    <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#0f172a" />
        </View>
      ) : dates.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
          <Text style={{ fontSize: 48 }}>📅</Text>
          <Text style={{ fontSize: 20, fontWeight: '700', color: '#0f172a', marginTop: 16, textAlign: 'center' }}>No important dates yet</Text>
          <Text style={{ color: '#64748b', marginTop: 8, textAlign: 'center' }}>Add birthdays, anniversaries, and milestones to keep track.</Text>
        </View>
      ) : (
        <ScrollView style={{ height: contentHeight - 49 }} contentContainerStyle={{ paddingTop: 16, paddingBottom: 100 }}>
          {upcoming.length > 0 && (
            <>
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1.2, paddingHorizontal: 16, marginBottom: 10 }}>
                Upcoming
              </Text>
              {upcoming.map((d) => <DateCard key={d.id} date={d} onPress={() => openEdit(d)} />)}
            </>
          )}
          {past.length > 0 && (
            <>
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1.2, paddingHorizontal: 16, marginTop: 16, marginBottom: 10 }}>
                Past
              </Text>
              {past.map((d) => <DateCard key={d.id} date={d} onPress={() => openEdit(d)} />)}
            </>
          )}
        </ScrollView>
      )}

      {/* FAB */}
      <Pressable
        onPress={openNew}
        style={{ position: 'absolute', bottom: 24, right: 24, backgroundColor: '#0f172a', borderRadius: 28, width: 56, height: 56, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 6 }}
      >
        <Text style={{ color: '#ffffff', fontSize: 28, lineHeight: 32, fontWeight: '300' }}>+</Text>
      </Pressable>

      {/* Add / Edit Modal */}
      <Modal visible={showForm} transparent animationType="slide" onRequestClose={closeForm}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, justifyContent: 'flex-end' }}>
          <Pressable style={{ flex: 1 }} onPress={closeForm} />
          <View style={{ backgroundColor: '#ffffff', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 24, paddingTop: 16, paddingBottom: 40, maxHeight: '92%' }}>
            <View style={{ width: 40, height: 4, backgroundColor: '#e2e8f0', borderRadius: 2, alignSelf: 'center', marginBottom: 16 }} />

            {/* Header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <Text style={{ fontWeight: '700', fontSize: 20, color: '#0f172a' }}>
                {form.id ? 'Edit Date' : 'New Date'}
              </Text>
              {form.id && (
                <Pressable onPress={handleDelete} hitSlop={8}>
                  <Text style={{ color: '#ef4444', fontSize: 14, fontWeight: '600' }}>Delete</Text>
                </Pressable>
              )}
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Emoji picker */}
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 10 }}>Icon</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  {EMOJI_OPTIONS.map((e) => (
                    <Pressable
                      key={e}
                      onPress={() => setForm((f) => ({ ...f, emoji: e }))}
                      style={{ width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: form.emoji === e ? '#0f172a' : '#f1f5f9' }}
                    >
                      <Text style={{ fontSize: 22 }}>{e}</Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>

              {/* Title */}
              <TextInput
                value={form.title}
                onChangeText={(t) => setForm((f) => ({ ...f, title: t }))}
                placeholder="Title (e.g. Mom's Birthday)"
                placeholderTextColor="#94a3b8"
                autoFocus={!form.id}
                style={{ borderBottomWidth: 2, borderBottomColor: form.title ? '#0f172a' : '#e2e8f0', paddingVertical: 8, fontSize: 16, color: '#1e293b', marginBottom: 20 }}
              />

              {/* Description */}
              <TextInput
                value={form.description}
                onChangeText={(t) => setForm((f) => ({ ...f, description: t }))}
                placeholder="Description (optional)"
                placeholderTextColor="#94a3b8"
                multiline
                style={{ borderBottomWidth: 1, borderBottomColor: '#e2e8f0', paddingVertical: 8, fontSize: 14, color: '#1e293b', marginBottom: 20, minHeight: 44 }}
              />

              {/* Date picker */}
              <View style={{ marginBottom: 20 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 10 }}>Date</Text>
                <Pressable
                  onPress={() => setShowDatePicker(!showDatePicker)}
                  style={{ backgroundColor: '#f1f5f9', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }}
                >
                  <Text style={{ fontSize: 16 }}>📅</Text>
                  <Text style={{ fontSize: 14, color: '#1e293b', flex: 1 }}>{dateLabel}</Text>
                </Pressable>
                {showDatePicker && (
                  <DateTimePicker
                    value={form.date}
                    mode="date"
                    display="inline"
                    onChange={(_, d) => { setShowDatePicker(false); if (d) setForm((f) => ({ ...f, date: d })) }}
                    style={{ marginTop: 4 }}
                  />
                )}
              </View>

              {/* Reminders */}
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 12 }}>Reminders</Text>
              <ReminderPicker
                label="Reminder 1"
                value={form.reminder1}
                onChange={(d) => setForm((f) => ({ ...f, reminder1: d }))}
              />
              <ReminderPicker
                label="Reminder 2"
                value={form.reminder2}
                onChange={(d) => setForm((f) => ({ ...f, reminder2: d }))}
              />
              <Text style={{ fontSize: 11, color: '#94a3b8', marginBottom: 24 }}>
                Reminders fire as local notifications on your device.
              </Text>
            </ScrollView>

            <Pressable
              onPress={handleSave}
              disabled={saving || !form.title.trim()}
              style={{ borderRadius: 16, paddingVertical: 16, alignItems: 'center', backgroundColor: saving || !form.title.trim() ? '#e2e8f0' : '#0f172a' }}
            >
              {saving
                ? <ActivityIndicator color="#fff" />
                : <Text style={{ fontWeight: '700', color: '#ffffff', fontSize: 16 }}>{form.id ? 'Save Changes' : 'Add Date'}</Text>
              }
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  )
}
