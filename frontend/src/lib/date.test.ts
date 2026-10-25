import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { dottedDate } from './date'

describe('dottedDate', () => {
  let saved: string | undefined
  beforeEach(() => {
    saved = process.env.TZ
    // 해외에 있는 친구의 컴퓨터라고 가정해요.
    process.env.TZ = 'America/Los_Angeles'
  })
  afterEach(() => {
    process.env.TZ = saved
  })

  it('uses Korean time like the activity grass', () => {
    // 한국 시간 2026-10-25 01:00, 로스앤젤레스 시간으로는 10월 24일이에요.
    expect(dottedDate('2026-10-24T16:00:00Z')).toBe('2026.10.25')
  })
})
