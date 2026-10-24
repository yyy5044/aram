import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Augment } from '../api/types'
import { legDay, oldAugment, page, prismAugment } from '../test/fixtures'
import { json, mockApi, type MockRoutes } from '../test/mockApi'
import { renderWithProviders } from '../test/render'
import AugmentsPage from './AugmentsPage'

afterEach(() => vi.unstubAllGlobals())

const sonata: Augment = { id: 'Sonata', nameKo: '소나타', iconUrl: 'https://example.test/s.png', active: true, rarity: 'GOLD' }
const giant: Augment = { id: 'KingMe', nameKo: '왕관', iconUrl: 'https://example.test/k.png', active: true, rarity: 'GOLD' }

function setup(route = '/augments', extra: MockRoutes = {}) {
  const api = mockApi({
    'GET /api/augments': () => json([prismAugment, legDay, oldAugment, sonata, giant]),
    'GET /api/tag-counts': () => json({ champions: {}, augments: { ARAM_LegDay: 3, OLD: 2, KingMe: 1 } }),
    'GET /api/posts': () => json(page([])),
    ...extra,
  })
  const utils = renderWithProviders(<AugmentsPage />, { path: '/augments', route })
  return { api, ...utils }
}

const group = (name: string) => screen.getByRole('button', { name: new RegExp('^' + name) })

describe('AugmentsPage', () => {
  it('starts with groups collapsed in prism-gold-silver order', async () => {
    setup()
    await screen.findByRole('button', { name: /^프리즘/ })
    const groups = screen.getAllByRole('button', { name: /^(프리즘|골드|실버)/ })
    expect(groups.map((g) => g.textContent?.slice(0, 2))).toEqual(['프리', '골드', '실버'])
    for (const g of groups) expect(g).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('button', { name: '하체 운동의 날' })).not.toBeInTheDocument()
    // 비활성인 OLD는 빠지고, 골드 2개의 글 수는 KingMe 1개뿐이에요.
    expect(group('골드')).toHaveTextContent('증강 2개 · 글 1개')
  })

  it('expands and collapses a group', async () => {
    setup()
    await userEvent.click(await screen.findByRole('button', { name: /^실버/ }))
    const item = screen.getByRole('button', { name: '하체 운동의 날' })
    expect(within(item).getByText('글 3개')).toBeInTheDocument()
    await userEvent.click(group('실버'))
    expect(screen.queryByRole('button', { name: '하체 운동의 날' })).not.toBeInTheDocument()
  })

  it('search opens matching groups only', async () => {
    setup()
    await userEvent.type(await screen.findByLabelText('이름 검색'), '하체운동')
    expect(group('실버')).toHaveAttribute('aria-expanded', 'true')
    expect(group('실버')).toHaveTextContent('증강 1/1개 · 글 3개')
    expect(screen.queryByRole('button', { name: /^프리즘/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^골드/ })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '하체 운동의 날' })).toBeInTheDocument()

    await userEvent.clear(screen.getByLabelText('이름 검색'))
    await userEvent.type(screen.getByLabelText('이름 검색'), 'zzz')
    expect(screen.getByText('검색 결과가 없어요')).toBeInTheDocument()
  })

  it('opening an item writes ?open= and shows its panel', async () => {
    const { router } = setup()
    await userEvent.click(await screen.findByRole('button', { name: /^실버/ }))
    await userEvent.click(screen.getByRole('button', { name: '하체 운동의 날' }))
    expect(router.state.location.search).toBe('?open=ARAM_LegDay')
    const region = await screen.findByRole('region', { name: '하체 운동의 날 게시글' })
    expect(within(region).getByText('실버 증강 · 게시글 3개')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: '하체 운동의 날' }))
    expect(router.state.location.search).toBe('')
    expect(screen.queryByRole('region', { name: '하체 운동의 날 게시글' })).not.toBeInTheDocument()
  })

  it('switching items keeps one panel', async () => {
    setup()
    await userEvent.click(await screen.findByRole('button', { name: /^실버/ }))
    await userEvent.click(screen.getByRole('button', { name: /^골드/ }))
    await userEvent.click(screen.getByRole('button', { name: '하체 운동의 날' }))
    await screen.findByRole('region', { name: '하체 운동의 날 게시글' })
    await userEvent.click(screen.getByRole('button', { name: '소나타' }))
    expect(await screen.findByRole('region', { name: '소나타 게시글' })).toBeInTheDocument()
    expect(screen.getAllByRole('region')).toHaveLength(1)
  })

  it('?open= opens its group and panel on load', async () => {
    setup('/augments?open=ARAM_LegDay')
    expect(await screen.findByRole('region', { name: '하체 운동의 날 게시글' })).toBeInTheDocument()
    expect(group('실버')).toHaveAttribute('aria-expanded', 'true')
    expect(group('프리즘')).toHaveAttribute('aria-expanded', 'false')
  })

  it('closing the panel keeps the group that ?open= expanded', async () => {
    setup('/augments?open=ARAM_LegDay')
    await screen.findByRole('region', { name: '하체 운동의 날 게시글' })
    await userEvent.click(screen.getByRole('button', { name: '닫기' }))
    expect(screen.queryByRole('region')).not.toBeInTheDocument()
    expect(group('실버')).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('button', { name: '하체 운동의 날' })).toBeInTheDocument()
  })

  it('group header with the open panel closes it and collapses', async () => {
    const { router } = setup('/augments?open=ARAM_LegDay')
    await screen.findByRole('region', { name: '하체 운동의 날 게시글' })
    await userEvent.click(group('실버'))
    expect(screen.queryByRole('region')).not.toBeInTheDocument()
    expect(group('실버')).toHaveAttribute('aria-expanded', 'false')
    expect(router.state.location.search).toBe('')
  })

  it('ignores unknown or inactive ?open= ids', async () => {
    for (const route of ['/augments?open=OLD', '/augments?open=nope']) {
      const { unmount } = setup(route)
      await screen.findByRole('button', { name: /^프리즘/ })
      expect(screen.queryByRole('region')).not.toBeInTheDocument()
      for (const g of screen.getAllByRole('button', { name: /^(프리즘|골드|실버)/ })) {
        expect(g).toHaveAttribute('aria-expanded', 'false')
      }
      unmount()
    }
  })

  it('panel disappears while search hides it and returns after', async () => {
    setup('/augments?open=ARAM_LegDay')
    await screen.findByRole('region', { name: '하체 운동의 날 게시글' })
    await userEvent.type(screen.getByLabelText('이름 검색'), '소나타')
    expect(screen.queryByRole('region')).not.toBeInTheDocument()
    await userEvent.clear(screen.getByLabelText('이름 검색'))
    expect(await screen.findByRole('region', { name: '하체 운동의 날 게시글' })).toBeInTheDocument()
  })

  it('sorts by count', async () => {
    setup()
    await userEvent.click(await screen.findByRole('button', { name: /^골드/ }))
    const names = () => screen.getAllByRole('button', { name: /^(소나타|왕관)$/ }).map((b) => b.textContent?.slice(0, 2))
    expect(names()).toEqual(['소나', '왕관'])
    await userEvent.click(screen.getByRole('button', { name: '글 많은 순' }))
    expect(names()).toEqual(['왕관', '소나'])
  })

  it('shows loading then error', async () => {
    setup('/augments', {
      'GET /api/tag-counts': () => json({ code: 'INTERNAL_ERROR', message: '잠시 후 다시 시도해주세요' }, 500),
    })
    expect(screen.getByText('불러오는 중이에요')).toBeInTheDocument()
    expect(await screen.findByText('잠시 후 다시 시도해주세요')).toBeInTheDocument()
  })
})
