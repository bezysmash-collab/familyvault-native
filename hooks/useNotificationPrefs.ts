import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export interface NotificationPreferences {
  user_id:          string
  new_post:         boolean
  reaction_on_post: boolean
  comment_on_post:  boolean
  task_assigned:    boolean
  task_completed:   boolean
  updated_at:       string
}

export function useNotificationPrefs(userId: string | undefined) {
  const [prefs,   setPrefs]   = useState<NotificationPreferences | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) return
    supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .single()
      .then(({ data }) => {
        setPrefs(data)
        setLoading(false)
      })
  }, [userId])

  const update = useCallback(async (key: keyof Omit<NotificationPreferences, 'user_id' | 'updated_at'>, value: boolean) => {
    if (!userId) return
    // Optimistic update — revert on error
    setPrefs(prev => prev ? { ...prev, [key]: value } : prev)

    const { error } = await supabase
      .from('notification_preferences')
      .upsert({ user_id: userId, [key]: value })

    if (error) {
      // Revert on failure
      setPrefs(prev => prev ? { ...prev, [key]: !value } : prev)
    }
  }, [userId])

  return { prefs, loading, update }
}
