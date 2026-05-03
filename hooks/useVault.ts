import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { randomUUID } from '../lib/uuid'

const SIGNED_URL_TTL = 60 // Vault items: short-lived URLs

export function useVault() {
  const [items,   setItems]   = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const fetchItems = useCallback(async () => {
    const { data } = await supabase
      .from('vault_items')
      .select('*')
      .order('created_at', { ascending: false })
    setItems(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchItems() }, [fetchItems])

  const createItem = useCallback(async ({
    title, category, emoji = '📄', notes, fields, file,
  }: {
    title: string; category: string; emoji?: string
    notes?: string; fields?: any[]; file?: { uri: string; name: string; mimeType: string }
  }) => {
    const { data: { user } } = await supabase.auth.getUser()

    let file_url: string | null = null
    let file_name: string | null = null

    if (file) {
      const ext  = file.name.split('.').pop()
      const path = `${user.id}/${randomUUID()}.${ext}`
      // In RN, fetch the file as a blob from the local URI
      const response = await fetch(file.uri)
      const blob     = await response.blob()
      const { error: uploadError } = await supabase.storage.from('vault').upload(path, blob, {
        contentType: file.mimeType,
      })
      if (uploadError) return { error: uploadError }
      file_url  = path   // store path, not public URL
      file_name = file.name
    }

    const { error } = await supabase.from('vault_items').insert({
      title, category, emoji, notes, fields, file_url, file_name,
      created_by: user.id, updated_by: user.id,
    })
    if (!error) fetchItems()
    return { error }
  }, [fetchItems])

  const deleteItem = useCallback(async (itemId: string) => {
    const item = items.find((i) => i.id === itemId)
    if (item?.file_url) {
      await supabase.storage.from('vault').remove([item.file_url])
    }
    const { error } = await supabase.from('vault_items').delete().eq('id', itemId)
    if (!error) setItems((prev) => prev.filter((i) => i.id !== itemId))
    return { error }
  }, [items])

  // Returns a 60-second signed URL for downloading a vault file
  const getDownloadUrl = useCallback(async (filePath: string) => {
    const { data, error } = await supabase.storage
      .from('vault')
      .createSignedUrl(filePath, SIGNED_URL_TTL)
    return { url: data?.signedUrl ?? null, error }
  }, [])

  return { items, loading, createItem, deleteItem, getDownloadUrl, refresh: fetchItems }
}
