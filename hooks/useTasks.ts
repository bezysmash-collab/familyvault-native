import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const TASK_QUERY = '*, created_by_profile:profiles!tasks_created_by_fkey(*), assigned_to_profile:profiles!tasks_assigned_to_fkey(*), space:spaces(*)'

export function useTasks() {
  const [tasks,   setTasks]   = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const fetchTasks = useCallback(async () => {
    const { data } = await supabase
      .from('tasks')
      .select(TASK_QUERY)
      .order('created_at', { ascending: false })
    setTasks(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchTasks() }, [fetchTasks])

  useEffect(() => {
    const channel = supabase
      .channel('tasks-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'tasks' }, async (payload: any) => {
        const { data } = await supabase.from('tasks').select(TASK_QUERY).eq('id', payload.new.id).single()
        if (data) setTasks((prev) => [data, ...prev])
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'tasks' }, (payload: any) => {
        const t = payload.new
        setTasks((prev) => prev.map((x) => x.id === t.id ? { ...x, done: t.done, done_at: t.done_at } : x))
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'tasks' }, (payload: any) => {
        setTasks((prev) => prev.filter((x) => x.id !== payload.old.id))
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [])

  const createTask = useCallback(async ({
    title, assignedTo, dueDate, spaceId,
  }: {
    title: string; assignedTo?: string | null; dueDate?: string | null; spaceId?: string | null
  }) => {
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('tasks').insert({
      title, created_by: user.id,
      assigned_to: assignedTo || null,
      due_date:    dueDate    || null,
      space_id:    spaceId    || null,
    })
    return { error }
  }, [])

  const toggleDone = useCallback(async (taskId: string, currentDone: boolean) => {
    await supabase
      .from('tasks')
      .update({ done: !currentDone, done_at: !currentDone ? new Date().toISOString() : null })
      .eq('id', taskId)
  }, [])

  const updateTask = useCallback(async (taskId: string, updates: {
    title?: string; assignedTo?: string | null; dueDate?: string | null; spaceId?: string | null
  }) => {
    const { error } = await supabase.from('tasks').update({
      ...(updates.title       !== undefined && { title:       updates.title }),
      ...(updates.assignedTo  !== undefined && { assigned_to: updates.assignedTo }),
      ...(updates.dueDate     !== undefined && { due_date:    updates.dueDate }),
      ...(updates.spaceId     !== undefined && { space_id:    updates.spaceId }),
    }).eq('id', taskId)
    if (!error) fetchTasks()
    return { error }
  }, [fetchTasks])

  const deleteTask = useCallback(async (taskId: string) => {
    const { error } = await supabase.from('tasks').delete().eq('id', taskId)
    if (!error) setTasks((prev) => prev.filter((t) => t.id !== taskId))
    return { error }
  }, [])

  return { tasks, loading, createTask, toggleDone, updateTask, deleteTask, refresh: fetchTasks }
}
