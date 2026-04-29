import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useSpaces() {
  const [spaces, setSpaces] = useState<any[]>([])

  useEffect(() => {
    supabase.from('spaces').select('*').order('name').then(({ data }) => {
      setSpaces(data || [])
    })
  }, [])

  return { spaces }
}
