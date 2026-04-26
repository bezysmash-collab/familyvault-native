import { timeAgo } from '../../lib/timeAgo'

describe('timeAgo', () => {
  it('returns "Just now" for a date less than 1 minute ago', () => {
    expect(timeAgo(new Date(Date.now() - 30_000).toISOString())).toBe('Just now')
  })

  it('returns minutes ago for 1–59 minutes', () => {
    expect(timeAgo(new Date(Date.now() - 5 * 60_000).toISOString())).toBe('5m ago')
  })

  it('returns hours ago for 1–23 hours', () => {
    expect(timeAgo(new Date(Date.now() - 3 * 3_600_000).toISOString())).toBe('3h ago')
  })

  it('returns days ago for 1–6 days', () => {
    expect(timeAgo(new Date(Date.now() - 2 * 86_400_000).toISOString())).toBe('2d ago')
  })

  it('returns a locale date string for 7+ days ago', () => {
    const date = new Date(Date.now() - 10 * 86_400_000)
    expect(timeAgo(date.toISOString())).toBe(date.toLocaleDateString())
  })
})
