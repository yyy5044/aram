import { describe, expect, it } from 'vitest'
import { buildHeatmap, levelOf } from './heatmap'

const year = { from: '2025-10-19', to: '2026-10-24' }

describe('buildHeatmap', () => {
  it('builds 53 columns of 7 days starting Sunday', () => {
    const { columns } = buildHeatmap({ ...year, days: [] }, 53)
    expect(columns).toHaveLength(53)
    expect(columns.every((c) => c.length === 7)).toBe(true)
    expect(columns[0][0].date).toBe('2025-10-19')
    expect(columns[52][6].date).toBe('2026-10-24')
  })

  it('marks days after today as future', () => {
    const { columns } = buildHeatmap({ from: '2025-10-26', to: '2026-10-28', days: [] }, 53)
    const last = columns[52]
    expect(last.map((c) => c.future)).toEqual([false, false, false, false, true, true, true])
    expect(last[4].label).toBe('')
  })

  it('assigns levels 0,1,2,3,4 for 0,1,2,3-4,5+', () => {
    expect([0, 1, 2, 3, 4, 5, 6].map(levelOf)).toEqual([0, 1, 2, 3, 3, 4, 4])
  })

  it('labels cells with posts and comments', () => {
    const { columns } = buildHeatmap({ ...year, days: [{ date: '2026-10-24', posts: 1, comments: 2 }] }, 53)
    const last = columns[52]
    expect(last[6]).toMatchObject({ date: '2026-10-24', posts: 1, comments: 2, level: 3 })
    expect(last[6].label).toBe('2026.10.24 · 글 1개, 댓글 2개')
    expect(last[5].label).toBe('2026.10.23 · 활동 없음')
  })

  it('keeps the last 26 columns on narrow screens', () => {
    const wide = buildHeatmap({ ...year, days: [] }, 53)
    const narrow = buildHeatmap({ ...year, days: [] }, 26)
    expect(narrow.columns).toHaveLength(26)
    expect(narrow.columns[25]).toEqual(wide.columns[52])
    expect(narrow.columns[0]).toEqual(wide.columns[27])
  })

  it('counts active days over the whole year even when narrow', () => {
    const days = [
      { date: '2025-11-02', posts: 1, comments: 0 },
      { date: '2026-10-20', posts: 0, comments: 3 },
    ]
    expect(buildHeatmap({ ...year, days }, 26).activeDays).toBe(2)
  })

  it('places month labels where a month starts', () => {
    const { columns, months } = buildHeatmap({ ...year, days: [] }, 53)
    const novColumn = columns.findIndex((c) => c.some((cell) => cell.date === '2025-11-01'))
    expect(months).toContainEqual({ column: novColumn, label: '11월' })
    expect(new Set(months.map((m) => m.column)).size).toBe(months.length)
  })

  it('drops the first-column label when the next month starts right after, so labels do not overlap', () => {
    // 2025-11-01 falls in column 1, so "10월" at column 0 would collide with "11월"
    const { months } = buildHeatmap({ ...year, days: [] }, 53)
    expect(months[0]).toEqual({ column: 1, label: '11월' })
    for (let i = 1; i < months.length; i++) {
      expect(months[i].column - months[i - 1].column).toBeGreaterThanOrEqual(3)
    }
  })

  it('keeps the first-column label when the next month is far enough away', () => {
    // from 2025-10-05: 2025-11-01 falls in column 3
    const { months } = buildHeatmap({ from: '2025-10-05', to: '2026-10-10', days: [] }, 53)
    expect(months[0]).toEqual({ column: 0, label: '10월' })
    expect(months[1]).toEqual({ column: 3, label: '11월' })
  })
})
