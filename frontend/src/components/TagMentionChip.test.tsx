import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Augment, Champion } from '../api/types'
import { json, mockApi } from '../test/mockApi'
import { renderWithProviders } from '../test/render'
import TagMentionChip from './TagMentionChip'

const xin: Champion = { id: 'XinZhao', nameKo: '신짜오', imageUrl: 'https://x/XinZhao.png' }
const stoneGuts: Augment = { id: 'StoneGuts', nameKo: '거석상의 용기', iconUrl: 'https://x/sg.png', active: true, rarity: 'GOLD' }

function withLists() {
  mockApi({
    'GET /api/champions': () => json([xin]),
    'GET /api/augments': () => json([stoneGuts]),
  })
}

afterEach(() => vi.unstubAllGlobals())

describe('TagMentionChip', () => {
  it('draws a champion as a round portrait and a bold name', async () => {
    withLists()
    renderWithProviders(<TagMentionChip kind="champion" id="XinZhao" label="신짜오" />)
    await vi.waitFor(() => expect(document.querySelector('img')).not.toBeNull())
    const img = document.querySelector('img') as HTMLImageElement
    expect(img).toHaveAttribute('src', 'https://x/XinZhao.png')
    expect(img.className).toContain('rounded-full')
    const name = screen.getByText('신짜오')
    expect(name.className).toContain('font-bold')
  })

  it('draws an augment with its rarity border and a bold name', async () => {
    withLists()
    renderWithProviders(<TagMentionChip kind="augment" id="StoneGuts" label="거석상의 용기" />)
    await vi.waitFor(() => expect(document.querySelector('img[src="https://x/sg.png"]')).not.toBeNull())
    const name = screen.getByText('거석상의 용기')
    expect(name.className).toContain('font-bold')
    expect(name.closest('[data-mention-box]')?.className).toContain('border-gold-rarity')
  })

  it('shows only the saved name when the tag is not in the lists', async () => {
    withLists()
    renderWithProviders(<TagMentionChip kind="augment" id="Gone" label="사라진 증강" />)
    expect(screen.getByText('사라진 증강')).toBeInTheDocument()
    await new Promise((r) => setTimeout(r, 20))
    expect(document.querySelector('img')).toBeNull()
  })

  it('does not go anywhere when pressed', async () => {
    withLists()
    const { router } = renderWithProviders(<TagMentionChip kind="champion" id="XinZhao" label="신짜오" />, { route: '/posts/1', path: '/posts/:id' })
    await userEvent.click(screen.getByText('신짜오'))
    expect(router.state.location.pathname).toBe('/posts/1')
  })
})
