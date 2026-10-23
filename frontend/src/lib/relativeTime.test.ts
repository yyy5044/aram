import { describe, expect, it } from 'vitest'
import { relativeTime } from './relativeTime'

describe('relativeTime', () => {
  const now = new Date('2026-10-24T12:00:00+09:00')

  it('follows the display rules', () => {
    expect(relativeTime('2026-10-24T11:59:30+09:00', now)).toBe('방금')
    expect(relativeTime('2026-10-24T11:15:00+09:00', now)).toBe('45분 전')
    expect(relativeTime('2026-10-24T02:00:00+09:00', now)).toBe('10시간 전')
    expect(relativeTime('2026-10-21T12:00:00+09:00', now)).toBe('3일 전')
    expect(relativeTime('2026-10-10T09:00:00+09:00', now)).toBe('2026.10.10')
  })

  it('treats slightly future timestamps as just now', () => {
    expect(relativeTime('2026-10-24T12:00:05+09:00', now)).toBe('방금')
  })
})
