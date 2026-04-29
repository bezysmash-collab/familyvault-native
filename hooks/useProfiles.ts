import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useProfiles() {
  const [profiles, setProfiles] = useState<any[]>([])

  useEffect(() => {
    supabase.from('profiles').select('*').order('name').then(({ data }) => {
      setProfiles(data || [])
    })
  }, [])

  return { profiles }
}
