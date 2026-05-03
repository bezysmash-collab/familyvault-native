import 'react-native-url-polyfill/auto'
import * as SecureStore from 'expo-secure-store'
import { createClient } from '@supabase/supabase-js'
import { AppState } from 'react-native'

const supabaseUrl  = process.env.EXPO_PUBLIC_SUPABASE_URL!
const supabaseAnon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!

// SecureStore has a 2KB per-key limit; chunk large session tokens across multiple keys.
// In-memory cache prevents repeated Keychain IPC calls on every Supabase request —
// the Keychain is only read on cold start and written on session changes.
const CHUNK_SIZE = 1800
const memCache   = new Map<string, string | null>()

async function readFromKeychain(key: string): Promise<string | null> {
  const countStr = await SecureStore.getItemAsync(`${key}_n`)
  if (countStr) {
    const n      = parseInt(countStr, 10)
    const chunks = await Promise.all(
      Array.from({ length: n }, (_, i) => SecureStore.getItemAsync(`${key}_${i}`))
    )
    return chunks.every(Boolean) ? (chunks as string[]).join('') : null
  }
  return SecureStore.getItemAsync(key)
}

async function writeToKeychain(key: string, value: string): Promise<void> {
  if (value.length > CHUNK_SIZE) {
    const chunks: string[] = []
    for (let i = 0; i < value.length; i += CHUNK_SIZE) chunks.push(value.slice(i, i + CHUNK_SIZE))
    await SecureStore.setItemAsync(`${key}_n`, String(chunks.length))
    await Promise.all(chunks.map((c, i) => SecureStore.setItemAsync(`${key}_${i}`, c)))
  } else {
    await SecureStore.setItemAsync(key, value)
    await SecureStore.deleteItemAsync(`${key}_n`).catch(() => {})
  }
}

async function deleteFromKeychain(key: string): Promise<void> {
  const countStr = await SecureStore.getItemAsync(`${key}_n`)
  if (countStr) {
    const n = parseInt(countStr, 10)
    await Promise.all([
      SecureStore.deleteItemAsync(`${key}_n`),
      ...Array.from({ length: n }, (_, i) => SecureStore.deleteItemAsync(`${key}_${i}`)),
    ])
  } else {
    await SecureStore.deleteItemAsync(key).catch(() => {})
  }
}

const SecureStorage = {
  async getItem(key: string): Promise<string | null> {
    if (memCache.has(key)) return memCache.get(key) ?? null
    const value = await readFromKeychain(key)
    memCache.set(key, value)
    return value
  },
  async setItem(key: string, value: string): Promise<void> {
    memCache.set(key, value)
    await writeToKeychain(key, value)
  },
  async removeItem(key: string): Promise<void> {
    memCache.delete(key)
    await deleteFromKeychain(key)
  },
}

export const supabase = createClient(supabaseUrl, supabaseAnon, {
  auth: {
    storage:            SecureStorage,
    autoRefreshToken:   true,
    persistSession:     true,
    detectSessionInUrl: false,
  },
})

// Pause/resume the token auto-refresh when the app goes to background/foreground.
AppState.addEventListener('change', (state) => {
  if (state === 'active') supabase.auth.startAutoRefresh()
  else                    supabase.auth.stopAutoRefresh()
})
