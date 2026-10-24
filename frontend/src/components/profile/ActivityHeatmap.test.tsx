import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import ActivityHeatmap from './ActivityHeatmap'

const activity = {
  from: '2025-10-19',
  to: '2026-10-24',
  days: [
    { date: '2026-10-24', posts: 1, comments: 2 },
    { date: '2026-03-01', posts: 5, comments: 0 },
  ],
}

function stubWidth(narrow: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches: narrow && query === '(max-width: 560px)',
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  )
}

afterEach(() => vi.unstubAllGlobals())

describe('ActivityHeatmap', () => {
  it('renders a year of cells on wide screens', () => {
    stubWidth(false)
    const { container } = render(<ActivityHeatmap activity={activity} />)
    expect(container.querySelectorAll('[data-heat-cell]')).toHaveLength(371)
  })

  it('renders half a year on narrow screens', () => {
    stubWidth(true)
    const { container } = render(<ActivityHeatmap activity={activity} />)
    expect(container.querySelectorAll('[data-heat-cell]')).toHaveLength(182)
  })

  it('shows the active-day summary, tooltips, and legend', () => {
    stubWidth(false)
    render(<ActivityHeatmap activity={activity} />)
    expect(screen.getByText('최근 1년 동안 2일 활동')).toBeInTheDocument()
    expect(screen.getByTitle('2026.10.24 · 글 1개, 댓글 2개')).toHaveAttribute('data-level', '3')
    expect(screen.getByTitle('2026.03.01 · 글 5개, 댓글 0개')).toHaveAttribute('data-level', '4')
    expect(screen.getByText('적음')).toBeInTheDocument()
    expect(screen.getByText('많음')).toBeInTheDocument()
  })
})
