import { screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { amumu, jinx, legDay, listItem, oldAugment, page } from '../test/fixtures'
import { json, mockApi } from '../test/mockApi'
import { renderWithProviders } from '../test/render'
import TagPage from './TagPage'

afterEach(() => vi.unstubAllGlobals())

const routes = {
  'GET /api/champions': () => json([amumu, jinx]),
  'GET /api/augments': () => json([legDay, oldAugment]),
  'GET /api/posts': () => json(page([listItem(), listItem({ id: 2 }), listItem({ id: 3 })])),
}

describe('TagPage', () => {
  it('shows champion header and filtered posts', async () => {
    const api = mockApi(routes)
    renderWithProviders(<TagPage kind="champion" />, { path: '/champions/:championId', route: '/champions/Amumu' })

    expect(await screen.findByRole('heading', { name: '아무무' })).toBeInTheDocument()
    expect(await screen.findByText('이 태그가 붙은 글 3개')).toBeInTheDocument()
    expect(api.find('GET', '/api/posts')[0].query.get('champion')).toBe('Amumu')
    expect(screen.getByRole('heading', { level: 1, name: '아무무' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '‹ 챔피언 목록' })).toHaveAttribute('href', '/champions')
  })

  it('shows augment header and filters by augment', async () => {
    const api = mockApi(routes)
    renderWithProviders(<TagPage kind="augment" />, { path: '/augments/:augmentId', route: '/augments/ARAM_LegDay' })
    expect(await screen.findByRole('heading', { name: '하체 운동의 날' })).toBeInTheDocument()
    await screen.findByText('이 태그가 붙은 글 3개')
    expect(api.find('GET', '/api/posts')[0].query.get('augment')).toBe('ARAM_LegDay')
    expect(screen.getByText('실버 증강')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '‹ 증강 목록' })).toHaveAttribute('href', '/augments')
  })

  it('marks inactive augments', async () => {
    mockApi(routes)
    renderWithProviders(<TagPage kind="augment" />, { path: '/augments/:augmentId', route: '/augments/OLD' })
    expect(await screen.findByText('현재 게임에 없음')).toBeInTheDocument()
  })

  it('shows not found for unknown tags', async () => {
    mockApi(routes)
    renderWithProviders(<TagPage kind="champion" />, { path: '/champions/:championId', route: '/champions/Nope' })
    expect(await screen.findByText('찾을 수 없는 태그예요')).toBeInTheDocument()
  })
})

describe('TagPage item', () => {
  const itemRoutes = {
    ...routes,
    'GET /api/items': () =>
      json([
        { id: '3084', nameKo: '강철심장', tier: 'LEGENDARY', priceTotal: 3000, iconUrl: 'https://example.test/3084.png', fromIds: [], intoIds: [], active: true },
        { id: '9999', nameKo: '사라진 아이템', tier: 'EPIC', priceTotal: 1000, iconUrl: null, fromIds: [], intoIds: [], active: false },
      ]),
  }

  it('itemTagPage', async () => {
    const api = mockApi(itemRoutes)
    renderWithProviders(<TagPage kind="item" />, { path: '/items/:itemId', route: '/items/3084' })
    expect(await screen.findByRole('heading', { level: 1, name: '강철심장' })).toBeInTheDocument()
    await screen.findByText('이 태그가 붙은 글 3개')
    expect(api.find('GET', '/api/posts')[0].query.get('item')).toBe('3084')
    expect(screen.getByText('전설')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '‹ 아이템 목록' })).toHaveAttribute('href', '/items')
    expect(screen.queryByText('현재 게임에 없음')).not.toBeInTheDocument()
  })

  it('marks inactive items', async () => {
    mockApi(itemRoutes)
    renderWithProviders(<TagPage kind="item" />, { path: '/items/:itemId', route: '/items/9999' })
    expect(await screen.findByText('현재 게임에 없음')).toBeInTheDocument()
  })

  it('nonNumericItemNotFound', async () => {
    mockApi(itemRoutes)
    renderWithProviders(<TagPage kind="item" />, { path: '/items/:itemId', route: '/items/abc' })
    expect(await screen.findByText('없는 아이템이에요')).toBeInTheDocument()
  })

  it('unknown item id is not found', async () => {
    mockApi(itemRoutes)
    renderWithProviders(<TagPage kind="item" />, { path: '/items/:itemId', route: '/items/1234' })
    expect(await screen.findByText('없는 아이템이에요')).toBeInTheDocument()
  })
})
