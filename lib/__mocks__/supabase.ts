/**
 * Manual Supabase mock for Jest tests.
 * Mirrors the pattern used in the web app's src/lib/__mocks__/supabase.js
 * but typed for TypeScript and adapted for React Native test environment.
 */

// Registry for realtime channel event handlers — tests can fire events via this map
export const channelHandlers: Record<string, (payload: unknown) => void> = {}

// Creates a chainable Supabase query builder that resolves to the given response.
// Every method returns `this` so chains like .select().eq().single() all work.
export function createBuilder(response: { data: unknown; error: unknown }) {
  const builder: Record<string, jest.Mock> = {}

  const chain = () => builder

  const asyncResolve = () => Promise.resolve(response)

  const methods = [
    'select', 'insert', 'update', 'upsert', 'delete',
    'eq', 'neq', 'gt', 'lt', 'gte', 'lte',
    'order', 'limit', 'single', 'maybeSingle',
    'contains', 'filter', 'match',
  ]

  methods.forEach((m) => {
    builder[m] = jest.fn(chain)
  })

  // .then() makes the builder thenable — lets await work on any chain
  builder.then = jest.fn((resolve: (v: unknown) => unknown) =>
    Promise.resolve(response).then(resolve)
  )

  return builder
}

// Supabase storage mock
export const storageMock = {
  upload: jest.fn().mockResolvedValue({ error: null }),
  createSignedUrls: jest.fn().mockResolvedValue({ data: [], error: null }),
  createSignedUrl: jest.fn().mockResolvedValue({ data: { signedUrl: 'https://signed.url/file' }, error: null }),
  download: jest.fn().mockResolvedValue({ data: new Blob(['test']), error: null }),
}

// Channel mock that captures .on() handlers so tests can fire realtime events
const channelMock = {
  on: jest.fn((type: string, filter: { event: string; table: string }, handler: (p: unknown) => void) => {
    channelHandlers[`${filter.event}:${filter.table}`] = handler
    return channelMock
  }),
  subscribe: jest.fn(() => channelMock),
}

// Main supabase mock
export const supabase = {
  from: jest.fn(() => createBuilder({ data: null, error: null })),
  channel: jest.fn(() => channelMock),
  removeChannel: jest.fn(),
  rpc: jest.fn().mockResolvedValue({ data: true, error: null }),
  auth: {
    getSession:          jest.fn().mockResolvedValue({ data: { session: null } }),
    getUser:             jest.fn().mockResolvedValue({ data: { user: { id: 'test-user-id' } } }),
    onAuthStateChange:   jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
    signInWithOtp:       jest.fn().mockResolvedValue({ error: null }),
    signOut:             jest.fn().mockResolvedValue({ error: null }),
    setSession:          jest.fn().mockResolvedValue({ data: { session: null }, error: null }),
    startAutoRefresh:    jest.fn(),
    stopAutoRefresh:     jest.fn(),
  },
  storage: {
    from: jest.fn(() => storageMock),
  },
}
