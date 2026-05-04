import { useState, useEffect, useCallback } from 'react'
import * as Notifications from 'expo-notifications'
import { supabase } from '../lib/supabase'

export function useDates() {
  const [dates,   setDates]   = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const fetchDates = useCallback(async () => {
    const { data } = await supabase
      .from('important_dates')
      .select('*, created_by_profile:profiles!important_dates_created_by_fkey(*)')
      .order('date', { ascending: true })
    setDates(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchDates() }, [fetchDates])

  const createDate = useCallback(async ({
    title, date, emoji, description, reminder1, reminder2,
  }: {
    title: string; date: string; emoji: string
    description?: string
    reminder1?: Date | null
    reminder2?: Date | null
  }) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: new Error('Not authenticated') }
    const { data, error } = await supabase
      .from('important_dates')
      .insert({
        title, date, emoji,
        description: description || null,
        reminder_1:  reminder1?.toISOString() ?? null,
        reminder_2:  reminder2?.toISOString() ?? null,
        created_by:  user.id,
      })
      .select()
      .single()

    if (!error && data) {
      await scheduleReminders(data.id, title, reminder1, reminder2)
      await fetchDates()
    }
    return { error }
  }, [fetchDates])

  const updateDate = useCallback(async (id: string, updates: {
    title?: string; date?: string; emoji?: string; description?: string
    reminder1?: Date | null; reminder2?: Date | null
  }) => {
    const { error } = await supabase.from('important_dates').update({
      ...(updates.title       !== undefined && { title:       updates.title }),
      ...(updates.date        !== undefined && { date:        updates.date }),
      ...(updates.emoji       !== undefined && { emoji:       updates.emoji }),
      ...(updates.description !== undefined && { description: updates.description }),
      ...(updates.reminder1   !== undefined && { reminder_1:  updates.reminder1?.toISOString() ?? null }),
      ...(updates.reminder2   !== undefined && { reminder_2:  updates.reminder2?.toISOString() ?? null }),
    }).eq('id', id)
    if (!error) {
      await cancelReminders(id)
      if (updates.title) {
        await scheduleReminders(id, updates.title, updates.reminder1, updates.reminder2)
      }
      await fetchDates()
    }
    return { error }
  }, [fetchDates])

  const deleteDate = useCallback(async (id: string) => {
    await cancelReminders(id)
    const { error } = await supabase.from('important_dates').delete().eq('id', id)
    if (!error) setDates((prev) => prev.filter((d) => d.id !== id))
    return { error }
  }, [])

  return { dates, loading, createDate, updateDate, deleteDate, refresh: fetchDates }
}

async function scheduleReminders(dateId: string, title: string, r1?: Date | null, r2?: Date | null) {
  const now = new Date()
  const pairs: [Date | null | undefined, string][] = [[r1, `${dateId}-r1`], [r2, `${dateId}-r2`]]
  for (const [reminder, identifier] of pairs) {
    if (!reminder || reminder <= now) continue
    await Notifications.scheduleNotificationAsync({
      identifier,
      content: {
        title: '📅 Upcoming Date',
        body:  title,
        data:  { screen: 'dates' },
      },
      trigger: { type: 'date', date: reminder } as any,
    }).catch(() => {})
  }
}

async function cancelReminders(dateId: string) {
  await Promise.all([
    Notifications.cancelScheduledNotificationAsync(`${dateId}-r1`).catch(() => {}),
    Notifications.cancelScheduledNotificationAsync(`${dateId}-r2`).catch(() => {}),
  ])
}
