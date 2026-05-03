import { renderHook, act } from '@testing-library/react-native'
import { supabase, createBuilder } from '../../lib/supabase'
import { useInvite } from '../../hooks/useInvite'

beforeEach(() => {
  jest.clearAllMocks()
  ;(supabase.auth.getUser as jest.Mock).mockResolvedValue({ data: { user: { id: 'user-abc' } } })
  ;(supabase.from as jest.Mock).mockReturnValue(createBuilder({ data: null, error: null }))
})

describe('useInvite — security', () => {
  // SEC-T01: used=false filter prevents replay of already-consumed tokens
  it('validateToken filters used=false to block consumed-token replay', async () => {
    ;(supabase.from as jest.Mock).mockReturnValue(createBuilder({ data: null, error: { code: 'PGRST116' } }))
    const { result } = renderHook(() => useInvite())
    let out: any
    await act(async () => { out = await result.current.validateToken('tok-used') })
    const builder = (supabase.from as jest.Mock).mock.results[0].value
    expect(builder.eq).toHaveBeenCalledWith('used', false)
    expect(out.valid).toBe(false)
  })

  // SEC-T02: expires_at > now filter prevents expired token replay
  it('validateToken filters expires_at > now to block expired tokens', async () => {
    ;(supabase.from as jest.Mock).mockReturnValue(createBuilder({ data: null, error: { code: 'PGRST116' } }))
    const { result } = renderHook(() => useInvite())
    await act(async () => { await result.current.validateToken('tok-expired') })
    const builder = (supabase.from as jest.Mock).mock.results[0].value
    expect(builder.gt).toHaveBeenCalledWith('expires_at', expect.any(String))
  })

  // SEC-T03: returns valid=false when Supabase returns no row (wrong token)
  it('validateToken returns { valid: false } for an unknown token', async () => {
    ;(supabase.from as jest.Mock).mockReturnValue(createBuilder({ data: null, error: null }))
    const { result } = renderHook(() => useInvite())
    let out: any
    await act(async () => { out = await result.current.validateToken('nonexistent-token') })
    expect(out.valid).toBe(false)
  })

  // SEC-T04: validateToken returns valid=true only when a data row exists
  it('validateToken returns { valid: true } when a matching invite row exists', async () => {
    const invite = { id: 'inv-1', token: 'tok-ok', used: false, expires_at: new Date(Date.now() + 86400000).toISOString() }
    ;(supabase.from as jest.Mock).mockReturnValue(createBuilder({ data: invite, error: null }))
    const { result } = renderHook(() => useInvite())
    let out: any
    await act(async () => { out = await result.current.validateToken('tok-ok') })
    expect(out.valid).toBe(true)
    expect(out.invite).toEqual(invite)
  })

  // SEC-T05: markUsed appends used=false to prevent idempotent double-marking
  it('markUsed scopes update to used=false rows (prevents double-marking)', async () => {
    const { result } = renderHook(() => useInvite())
    await act(async () => { await result.current.markUsed('tok-123') })
    const builder = (supabase.from as jest.Mock).mock.results[0].value
    expect(builder.eq).toHaveBeenCalledWith('used', false)
  })

  // SEC-T06: markUsed records the authenticated user as the consumer
  it('markUsed writes used_by: authenticated user id', async () => {
    const { result } = renderHook(() => useInvite())
    await act(async () => { await result.current.markUsed('tok-123') })
    const builder = (supabase.from as jest.Mock).mock.results[0].value
    expect(builder.update).toHaveBeenCalledWith(
      expect.objectContaining({ used: true, used_by: 'user-abc' })
    )
  })

  // SEC-T07: markUsed does nothing when no authenticated user (prevents unauthenticated marking)
  it('markUsed does not touch the database when no user is authenticated', async () => {
    ;(supabase.auth.getUser as jest.Mock).mockResolvedValue({ data: { user: null } })
    const { result } = renderHook(() => useInvite())
    await act(async () => { await result.current.markUsed('tok-123') })
    expect(supabase.from).not.toHaveBeenCalled()
  })

  // SEC-T08: createInvite binds invited_by to the caller's authenticated uid
  it('createInvite sets invited_by to the authenticated user id (not caller-supplied)', async () => {
    ;(supabase.from as jest.Mock).mockReturnValue(
      createBuilder({ data: { token: 'new-tok', id: 'inv-new' }, error: null })
    )
    const { result } = renderHook(() => useInvite())
    await act(async () => { await result.current.createInvite(null) })
    const builder = (supabase.from as jest.Mock).mock.results[0].value
    expect(builder.insert).toHaveBeenCalledWith(
      expect.objectContaining({ invited_by: 'user-abc' })
    )
  })
})
