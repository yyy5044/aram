import { describe, expect, it } from 'vitest'
import { matchesName, sortTags } from './tagSearch'

describe('matchesName', () => {
  it('ignores spaces and case', () => {
    expect(matchesName('하체 운동의 날', '하체운동')).toBe(true)
    expect(matchesName('Bonk!', 'bon k')).toBe(true)
    expect(matchesName('연쇄 번개', '학살')).toBe(false)
  })

  it('blank query matches everything', () => {
    expect(matchesName('아무무', '  ')).toBe(true)
  })
})

describe('sortTags', () => {
  it('sorts by name in Korean order', () => {
    expect(
      sortTags(['하체 운동의 날', '2연속 공격', '거인 학살자'], 'name', (s) => s, () => 0),
    ).toEqual(['2연속 공격', '거인 학살자', '하체 운동의 날'])
  })

  it('sorts by count then name', () => {
    const counts: Record<string, number> = { 가: 1, 나: 3, 다: 1 }
    expect(sortTags(['다', '가', '나'], 'count', (s) => s, (s) => counts[s])).toEqual(['나', '가', '다'])
  })

  it('does not mutate input', () => {
    const input = ['나', '가']
    sortTags(input, 'name', (s) => s, () => 0)
    expect(input).toEqual(['나', '가'])
  })
})
