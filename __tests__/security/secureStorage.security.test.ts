// Tests the SecureStorage chunked adapter (lib/supabase.ts).
// SecureStore has a 2 KB per-key limit; values larger than CHUNK_SIZE are split
// across multiple keys and reassembled on read.  These tests verify the algorithm
// is correct and that partial writes cannot produce silently truncated sessions.

import * as SecureStore from 'expo-secure-store'

const CHUNK_SIZE = 1800

// Local re-implementation of the adapter from lib/supabase.ts (including memory cache).
// The lib/supabase module is replaced by a Supabase mock during tests,
// so we reconstruct the storage logic here to test the algorithm directly.
const memCache = new Map<string, string | null>()

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

const SecureStorage = {
  async getItem(key: string): Promise<string | null> {
    if (memCache.has(key)) return memCache.get(key) ?? null
    const value = await readFromKeychain(key)
    memCache.set(key, value)
    return value
  },
  async setItem(key: string, value: string): Promise<void> {
    memCache.set(key, value)
    if (value.length > CHUNK_SIZE) {
      const chunks: string[] = []
      for (let i = 0; i < value.length; i += CHUNK_SIZE) chunks.push(value.slice(i, i + CHUNK_SIZE))
      await SecureStore.setItemAsync(`${key}_n`, String(chunks.length))
      await Promise.all(chunks.map((c, i) => SecureStore.setItemAsync(`${key}_${i}`, c)))
    } else {
      await SecureStore.setItemAsync(key, value)
      await SecureStore.deleteItemAsync(`${key}_n`).catch(() => {})
    }
  },
  async removeItem(key: string): Promise<void> {
    memCache.delete(key)
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
  },
}

beforeEach(() => {
  jest.clearAllMocks()
  memCache.clear()
  ;(SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null)
  ;(SecureStore.setItemAsync as jest.Mock).mockResolvedValue(undefined)
  ;(SecureStore.deleteItemAsync as jest.Mock).mockResolvedValue(undefined)
})

describe('SecureStorage adapter — security', () => {
  // SEC-T15: small values stored in a single key (not exposed to chunking overhead)
  it('stores a small value in a single SecureStore key', async () => {
    const value = 'short-session-token'
    await SecureStorage.setItem('sb-session', value)
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('sb-session', value)
    expect(SecureStore.setItemAsync).not.toHaveBeenCalledWith('sb-session_n', expect.anything())
  })

  // SEC-T16: values above CHUNK_SIZE are split into multiple keys
  it('splits a value larger than CHUNK_SIZE into multiple chunk keys', async () => {
    const value = 'x'.repeat(CHUNK_SIZE + 100)
    await SecureStorage.setItem('sb-session', value)
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('sb-session_n', '2')
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('sb-session_0', 'x'.repeat(CHUNK_SIZE))
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('sb-session_1', 'x'.repeat(100))
  })

  // SEC-T17: exact CHUNK_SIZE boundary stored as single key (no off-by-one)
  it('stores a value of exactly CHUNK_SIZE in one key (no unnecessary splitting)', async () => {
    const value = 'y'.repeat(CHUNK_SIZE)
    await SecureStorage.setItem('sb-session', value)
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('sb-session', value)
    expect(SecureStore.setItemAsync).not.toHaveBeenCalledWith('sb-session_n', expect.anything())
  })

  // SEC-T18: chunked values are reassembled in the correct order
  it('getItem reassembles chunks into the original value', async () => {
    const chunk0 = 'A'.repeat(CHUNK_SIZE)
    const chunk1 = 'B'.repeat(50)
    ;(SecureStore.getItemAsync as jest.Mock).mockImplementation((key: string) => {
      if (key === 'sb-session_n') return Promise.resolve('2')
      if (key === 'sb-session_0') return Promise.resolve(chunk0)
      if (key === 'sb-session_1') return Promise.resolve(chunk1)
      return Promise.resolve(null)
    })
    const result = await SecureStorage.getItem('sb-session')
    expect(result).toBe(chunk0 + chunk1)
    expect(result).toHaveLength(CHUNK_SIZE + 50)
  })

  // SEC-T19: getItem returns null if any chunk is missing (guards against partial writes)
  it('getItem returns null when a chunk is missing (partial-write guard)', async () => {
    ;(SecureStore.getItemAsync as jest.Mock).mockImplementation((key: string) => {
      if (key === 'sb-session_n') return Promise.resolve('3')
      if (key === 'sb-session_0') return Promise.resolve('part-one')
      if (key === 'sb-session_1') return Promise.resolve(null) // missing
      if (key === 'sb-session_2') return Promise.resolve('part-three')
      return Promise.resolve(null)
    })
    const result = await SecureStorage.getItem('sb-session')
    expect(result).toBeNull()
  })

  // SEC-T20: removeItem deletes count key and every chunk key (no key leakage)
  it('removeItem deletes the count key and all chunk keys', async () => {
    ;(SecureStore.getItemAsync as jest.Mock).mockResolvedValue('3')
    await SecureStorage.removeItem('sb-session')
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('sb-session_n')
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('sb-session_0')
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('sb-session_1')
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('sb-session_2')
  })

  // SEC-T21: removeItem on a non-chunked key deletes the single key
  it('removeItem on a non-chunked key deletes just that key', async () => {
    ;(SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null) // no count key
    await SecureStorage.removeItem('sb-session')
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('sb-session')
    expect(SecureStore.deleteItemAsync).not.toHaveBeenCalledWith('sb-session_n')
  })

  // SEC-T22: getItem falls back to single-key read when no count key exists
  it('getItem reads directly from a single key when no chunk count is stored', async () => {
    ;(SecureStore.getItemAsync as jest.Mock).mockImplementation((key: string) => {
      if (key === 'sb-session_n') return Promise.resolve(null) // no chunking
      if (key === 'sb-session')   return Promise.resolve('direct-token-value')
      return Promise.resolve(null)
    })
    const result = await SecureStorage.getItem('sb-session')
    expect(result).toBe('direct-token-value')
  })

  // SEC-T23: memory cache prevents repeated Keychain IPC on subsequent reads (performance)
  it('getItem reads from Keychain once and serves subsequent reads from memory cache', async () => {
    ;(SecureStore.getItemAsync as jest.Mock).mockResolvedValue('cached-token')
    await SecureStorage.getItem('sb-session')
    await SecureStorage.getItem('sb-session')
    await SecureStorage.getItem('sb-session')
    // Keychain should only be called once (for _n check + key read = 2 calls on first access)
    const keychainCalls = (SecureStore.getItemAsync as jest.Mock).mock.calls.length
    expect(keychainCalls).toBeLessThanOrEqual(2)
  })

  // SEC-T24: removeItem evicts from memory cache (no stale reads after sign-out)
  it('removeItem clears the memory cache so the next getItem re-reads from Keychain', async () => {
    ;(SecureStore.getItemAsync as jest.Mock).mockResolvedValue('old-token')
    await SecureStorage.getItem('sb-session')         // warms cache
    await SecureStorage.removeItem('sb-session')      // evicts
    ;(SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null)
    const result = await SecureStorage.getItem('sb-session') // must re-hit Keychain
    expect(result).toBeNull()
  })
})
