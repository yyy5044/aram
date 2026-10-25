import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import TagGrid, { type GridItem } from './TagGrid'

const items: GridItem[] = [
  { id: 'a', name: '가', image: null },
  { id: 'b', name: '나', image: null },
  { id: 'c', name: '다', image: null },
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

  it('paints augment icons that need a rarity color', () => {
    render(
      <TagGrid
        items={[
          { id: 'x', name: '색칠', image: 'small.png', rarity: 'GOLD', tinted: true },
          { id: 'y', name: '그대로', image: 'large.png' },
        ]}
        openId={null}
        onToggle={() => {}}
        renderPanel={() => null}
      />,
    )
    // 흰 아이콘 그림 대신 색을 칠한 칸이 보여요(테두리 그림은 따로 있어요).
    expect(screen.getByRole('button', { name: '색칠' }).querySelector('img[src="small.png"]')).toBeNull()
    expect(screen.getByRole('button', { name: '그대로' }).querySelector('img')).toHaveAttribute('src', 'large.png')
  })

  it('frames augment icons by rarity', () => {
    render(
      <TagGrid
        items={[{ id: 'g', name: '금', image: 'large.png', rarity: 'GOLD' }]}
        openId={null}
        onToggle={() => {}}
        renderPanel={() => null}
      />,
    )
    expect(screen.getByRole('button', { name: '금' }).querySelector('img[src$="abilityframe_gold.png"]')).toBeInTheDocument()
  })

  it('shows only the icon and name on each item (no post count)', () => {
    render(<TagGrid items={items} openId={null} onToggle={() => {}} renderPanel={() => null} />)
    expect(screen.getByRole('button', { name: '다' })).toHaveTextContent(/^다$/)
    expect(screen.queryByText(/글 \d/)).not.toBeInTheDocument()
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

  it('keeps the panel on the open item row after items reorder', () => {
    // 실제 격자처럼 흉내 내요: 3칸이 한 줄이고, 펼침 영역은 줄 전체를 차지해요.
    const COLS = 3
    vi.spyOn(HTMLElement.prototype, 'offsetTop', 'get').mockImplementation(function (this: HTMLElement) {
      const li = this.closest('li')!
      let row = 0
      let col = 0
      for (const child of li.parentElement!.children) {
        const isItem = child.querySelector('[data-id]') !== null
        if (isItem && col === COLS) {
          row++
          col = 0
        }
        if (!isItem && col > 0) {
          row++
          col = 0
        }
        if (child === li) return row * 100
        if (isItem) col++
        else row++
      }
      return 0
    })
    const six = ['a', 'b', 'c', 'd', 'e', 'f'].map((id) => ({ id, name: id, image: null }))
    const { rerender } = render(<TagGrid items={six} openId="e" onToggle={() => {}} renderPanel={() => <p>패널</p>} />)
    const order = () => [...screen.getByRole('list').children].map((el) => el.textContent?.replace(/글 0개/, ''))
    expect(order()).toEqual(['a', 'b', 'c', 'd', 'e', 'f', '패널'])

    const reordered = ['f', 'e', 'a', 'b', 'c', 'd'].map((id) => six.find((it) => it.id === id)!)
    rerender(<TagGrid items={reordered} openId="e" onToggle={() => {}} renderPanel={() => <p>패널</p>} />)
    // e가 첫 줄(f e a)에 있으니 펼침 영역은 a 바로 뒤에 와야 해요.
    expect(order()).toEqual(['f', 'e', 'a', '패널', 'b', 'c', 'd'])
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
