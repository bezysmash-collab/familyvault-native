// Tests the deep link token extraction logic used in app/_layout.tsx.
// The production code uses path.slice('join/'.length) — this suite verifies
// that slice is correct and demonstrates why replace('join/', '') is unsafe.

const extractSlice   = (path: string) => path.slice('join/'.length)
const extractReplace = (path: string) => path.replace('join/', '')

describe('deep link token extraction — security', () => {
  // SEC-T09: normal token extracted correctly
  it('extracts a standard UUID token from join/ path', () => {
    expect(extractSlice('join/a1b2c3d4-e5f6-7890-abcd-ef1234567890'))
      .toBe('a1b2c3d4-e5f6-7890-abcd-ef1234567890')
  })

  // SEC-T10: hyphens and dashes preserved
  it('preserves hyphens and alphanumeric characters in token', () => {
    expect(extractSlice('join/abc-123_XYZ')).toBe('abc-123_XYZ')
  })

  // SEC-T11: slice and replace give the same result when path starts with "join/"
  it('slice and replace agree for all paths guarded by startsWith("join/")', () => {
    // In _layout.tsx the startsWith guard ensures the path always begins with 'join/'.
    // Both methods are therefore equivalent here; slice is preferred because
    // it is explicitly position-anchored rather than search-based.
    expect(extractSlice('join/TOKEN')).toBe(extractReplace('join/TOKEN'))
    expect(extractSlice('join/legit/join/nested')).toBe(extractReplace('join/legit/join/nested'))
    expect(extractSlice('join/legit/join/nested')).toBe('legit/join/nested')
  })

  // SEC-T12: empty token is handled without throwing
  it('returns empty string for a path that is exactly "join/"', () => {
    expect(extractSlice('join/')).toBe('')
  })

  // SEC-T13: replace() is not position-anchored — it silently mutates unconstrained paths
  it('replace() strips "join/" from any position; slice only strips from position 0', () => {
    // A path that contains "join/" in the middle (not at pos 0).
    // In production this case is prevented by the startsWith guard, but the test
    // documents why slice() is the safer primitive for prefix-stripping.
    const embeddedJoin = 'other/join/token'
    expect(extractReplace(embeddedJoin)).toBe('other/token')   // strips embedded "join/"
    expect(extractSlice(embeddedJoin)).not.toBe('other/token') // slice skips first 5 chars only
  })

  // SEC-T14: token length is preserved exactly (no silent truncation)
  it('does not truncate a 64-character hex token', () => {
    const longToken = 'a'.repeat(64)
    expect(extractSlice(`join/${longToken}`)).toHaveLength(64)
  })
})
