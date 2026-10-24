import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import TagGrid, { type GridItem } from './TagGrid'

const items: GridItem[] = [
  { id: 'a', name: '가', image: null, count: 1 },
  { id: 'b', name: '나', image: null, count: 0 },
  { id: 'c', name: '다', image: null, count: 2 },
]

afterEach(() => vi.restoreAllMocks())

describe('TagGrid', () => {
  it('marks the open item and renders its panel after the row', () => {
    render(<TagGrid items={items} openId="b" onToggle={() => {}} renderPanel={(id) => <p>패널 {id}</p>} />)
    expect(screen.getByRole('button', { name: '나' })).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('button', { name: '가' })).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getByText('패널 b')).toBeInTheDocument()
    // jsdom에는 위치 정보가 없어서 모두 한 줄로 보고, 펼침 영역은 맨 뒤에 들어가요.
    const grid = screen.getByRole('list')
    expect(grid.lastElementChild).toHaveTextContent('패널 b')
  })

  it('shows the post count on each item', () => {
    render(<TagGrid items={items} openId={null} onToggle={() => {}} renderPanel={() => null} />)
    expect(within(screen.getByRole('button', { name: '다' })).getByText('글 2개')).toBeInTheDocument()
  })

  it('calls onToggle with the id', async () => {
    const onToggle = vi.fn()
    render(<TagGrid items={items} openId={null} onToggle={onToggle} renderPanel={() => null} />)
    await userEvent.click(screen.getByRole('button', { name: '가' }))
    expect(onToggle).toHaveBeenCalledWith('a')
  })

  it('renders no panel when openId is not in items', () => {
    const renderPanel = vi.fn(() => <p>패널</p>)
    render(<TagGrid items={items} openId="zzz" onToggle={() => {}} renderPanel={renderPanel} />)
    expect(renderPanel).not.toHaveBeenCalled()
    expect(screen.queryByText('패널')).not.toBeInTheDocument()
  })

  it('places the panel after the last item on the same row', () => {
    // a, b는 첫 줄(0), c는 둘째 줄(100)이라고 가정해요.
    vi.spyOn(HTMLElement.prototype, 'offsetTop', 'get').mockImplementation(function (this: HTMLElement) {
      return this.dataset.id === 'c' ? 100 : 0
    })
    render(<TagGrid items={items} openId="a" onToggle={() => {}} renderPanel={() => <p>패널 a</p>} />)
    const children = [...screen.getByRole('list').children].map((el) => el.textContent)
    expect(children[2]).toBe('패널 a')
    expect(children[3]).toContain('다')
  })
})
