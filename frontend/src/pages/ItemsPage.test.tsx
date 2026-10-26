import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Item, ItemDetail } from '../api/types'
import { listItem, page } from '../test/fixtures'
import { json, mockApi, type MockRoutes } from '../test/mockApi'
import { renderWithProviders } from '../test/render'
import ItemsPage from './ItemsPage'

beforeEach(() => {
  // jsdom에는 scrollIntoView가 없어요.
  HTMLElement.prototype.scrollIntoView = vi.fn()
})
afterEach(() => vi.unstubAllGlobals())

function item(id: string, nameKo: string, extra: Partial<Item> = {}): Item {
  return { id, nameKo, tier: 'BASIC', priceTotal: 900, iconUrl: `https://example.test/${id}.png`, fromIds: [], intoIds: [], active: true, categories: [], ...extra }
}

const steelheart = item('3084', '강철심장', { tier: 'LEGENDARY', priceTotal: 3000, fromIds: ['1011'] })
const belt = item('1011', '거인의 허리띠', { intoIds: ['3084'] })
const greaves = item('3047', '판금 장화', { tier: 'BOOTS', priceTotal: 1000 })
const potion = item('2003', '체력 물약', { tier: 'STARTER', priceTotal: 50, iconUrl: null })
const gone = item('9999', '사라진 아이템', { tier: 'EPIC', active: false })

const detail: ItemDetail = {
  id: '3084',
  tier: 'LEGENDARY',
  priceTotal: 3000,
  iconUrl: 'https://example.test/3084.png',
  fromIds: ['1011'],
  intoIds: [],
  original: { locale: 'en', name: 'Heartsteel', description: 'Gain <attention>80</attention> health' },
  translation: { locale: 'ko', name: '강철심장', description: '체력을 <attention>80</attention> 얻어요' },
}

function setup(route = '/items', extra: MockRoutes = {}) {
  const api = mockApi({
    'GET /api/items': () => json([steelheart, belt, greaves, potion, gone]),
    'GET /api/tag-counts': () => json({ champions: {}, augments: {}, items: { '3084': 2, '1011': 1, '9999': 5 } }),
    'GET /api/items/3084': () => json(detail),
    'GET /api/posts': () => json(page([listItem(), listItem({ id: 2 })])),
    ...extra,
  })
  const utils = renderWithProviders(<ItemsPage />, { path: '/items', route })
  return { api, ...utils }
}

const GROUP_NAME = /^(증강 칼바람 전용|전설|서사|신발|기본|시작·소모품)/
const group = (name: string) => screen.getByRole('button', { name: new RegExp('^' + name) })

describe('ItemsPage', () => {
  it('groupsInShopOrder', async () => {
    setup()
    await screen.findByRole('button', { name: /^전설/ })
    // 활성 아이템이 하나도 없는 묶음(증강 칼바람 전용, 서사)은 빠져요.
    const groups = screen.getAllByRole('button', { name: GROUP_NAME })
    expect(groups.map((g) => g.textContent?.split('아이템')[0])).toEqual(['시작·소모품', '신발', '기본', '전설'])
    expect(screen.getByRole('heading', { level: 1, name: '아이템' })).toBeInTheDocument()
    expect(screen.getByText('아이템 4개 · 글 3개')).toBeInTheDocument()
    expect(group('전설')).toHaveTextContent('아이템 1개 · 글 2개')
  })

  it('startsCollapsedAndOpensGroup', async () => {
    setup()
    await screen.findByRole('button', { name: /^전설/ })
    for (const g of screen.getAllByRole('button', { name: GROUP_NAME })) {
      expect(g).toHaveAttribute('aria-expanded', 'false')
    }
    expect(screen.queryByRole('button', { name: '강철심장' })).not.toBeInTheDocument()
    await userEvent.click(group('전설'))
    expect(screen.getByRole('button', { name: '강철심장' })).toBeInTheDocument()
    await userEvent.click(group('전설'))
    expect(screen.queryByRole('button', { name: '강철심장' })).not.toBeInTheDocument()
  })

  it('searchByInitials', async () => {
    setup()
    await userEvent.type(await screen.findByLabelText('이름 검색'), 'ㄱㅊㅅㅈ')
    expect(screen.getByPlaceholderText('아이템 이름 검색')).toBeInTheDocument()
    expect(group('전설')).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('button', { name: '강철심장' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^기본/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^신발/ })).not.toBeInTheDocument()
  })

  it('shows no result text when nothing matches', async () => {
    setup()
    await userEvent.type(await screen.findByLabelText('이름 검색'), 'zzz')
    expect(screen.getByText('검색 결과가 없어요')).toBeInTheDocument()
  })

  it('openShowsTooltipAndPosts', async () => {
    const { api, router } = setup('/items?open=3084')
    const region = await screen.findByRole('region', { name: '강철심장 게시글' })
    expect(await within(region).findByRole('article', { name: '강철심장' })).toHaveTextContent('3000 골드 · 전설')
    expect(within(region).getByRole('link', { name: '모아보기 ›' })).toHaveAttribute('href', '/items/3084')
    expect(await within(region).findAllByRole('listitem')).not.toHaveLength(0)
    expect(api.find('GET', '/api/posts')[0].query.get('item')).toBe('3084')
    expect(api.find('GET', '/api/items/3084')[0].query.get('lang')).toBe('ko')
    expect(group('전설')).toHaveAttribute('aria-expanded', 'true')
    expect(group('기본')).toHaveAttribute('aria-expanded', 'false')

    await userEvent.click(screen.getByRole('button', { name: '닫기' }))
    expect(router.state.location.search).toBe('')
  })

  it('keeps the panel usable when the tooltip fails to load', async () => {
    setup('/items?open=3084', { 'GET /api/items/3084': () => json({ code: 'INTERNAL_ERROR', message: 'x' }, 500) })
    const region = await screen.findByRole('region', { name: '강철심장 게시글' })
    expect(await within(region).findByText('아이템 정보를 불러오지 못했어요')).toBeInTheDocument()
    expect(await within(region).findAllByRole('listitem')).not.toHaveLength(0)
  })

  it('recipeIconOpensThatItem', async () => {
    const { router } = setup('/items?open=3084', {
      'GET /api/items/1011': () => json({ ...detail, id: '1011', tier: 'BASIC', priceTotal: 900, fromIds: [], intoIds: ['3084'] }),
    })
    const region = await screen.findByRole('region', { name: '강철심장 게시글' })
    await userEvent.click(await within(region).findByRole('button', { name: '거인의 허리띠' }))
    expect(router.state.location.search).toBe('?open=1011')
    expect(await screen.findByRole('region', { name: '거인의 허리띠 게시글' })).toBeInTheDocument()
    expect(group('기본')).toHaveAttribute('aria-expanded', 'true')
  })

  it('picking a recipe item keeps its group open and clears the search', async () => {
    const { router } = setup('/items?open=3084', {
      'GET /api/items/1011': () => json({ ...detail, id: '1011', tier: 'BASIC', priceTotal: 900, fromIds: [], intoIds: ['3084'] }),
    })
    const search = await screen.findByLabelText('이름 검색')
    await userEvent.type(search, '강철')
    // 검색 중에는 거인의 허리띠가 목록에 없어요.
    expect(screen.queryByRole('button', { name: /^기본/ })).not.toBeInTheDocument()

    const region = await screen.findByRole('region', { name: '강철심장 게시글' })
    await userEvent.click(await within(region).findByRole('button', { name: '거인의 허리띠' }))

    expect(search).toHaveValue('')
    expect(router.state.location.search).toBe('?open=1011')
    expect(await screen.findByRole('region', { name: '거인의 허리띠 게시글' })).toBeInTheDocument()
    // ?open=으로만 열렸던 처음 묶음도 접히지 않아요.
    expect(group('전설')).toHaveAttribute('aria-expanded', 'true')
    expect(group('기본')).toHaveAttribute('aria-expanded', 'true')
    // 새 펼침 영역이 화면 맨 위로 와요.
    const scroll = vi.mocked(HTMLElement.prototype.scrollIntoView)
    await waitFor(() => expect(scroll).toHaveBeenCalledWith({ block: 'start' }))
    expect(scroll.mock.contexts.at(-1)).toContainElement(screen.getByRole('region', { name: '거인의 허리띠 게시글' }))

    // 펼침 영역을 닫아도 넘어간 묶음은 계속 펼쳐져 있어요.
    await userEvent.click(screen.getByRole('button', { name: '닫기' }))
    expect(group('기본')).toHaveAttribute('aria-expanded', 'true')
  })

  it('picking an item in another group opens that group', async () => {
    setup('/items?open=1011', {
      'GET /api/items/1011': () => json({ ...detail, id: '1011', tier: 'BASIC', priceTotal: 900, fromIds: [], intoIds: ['3084'] }),
    })
    const region = await screen.findByRole('region', { name: '거인의 허리띠 게시글' })
    expect(group('전설')).toHaveAttribute('aria-expanded', 'false')
    await userEvent.click(await within(region).findByRole('button', { name: '강철심장' }))

    expect(await screen.findByRole('region', { name: '강철심장 게시글' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: '닫기' }))
    expect(group('전설')).toHaveAttribute('aria-expanded', 'true')
    expect(group('기본')).toHaveAttribute('aria-expanded', 'true')
  })

  it('does not scroll when an item is opened from the grid', async () => {
    setup()
    await userEvent.click(await screen.findByRole('button', { name: /^전설/ }))
    await userEvent.click(screen.getByRole('button', { name: '강철심장' }))
    expect(await screen.findByRole('region', { name: '강철심장 게시글' })).toBeInTheDocument()
    await new Promise((resolve) => requestAnimationFrame(resolve))
    expect(HTMLElement.prototype.scrollIntoView).not.toHaveBeenCalled()
  })

  it('puts the tooltip beside the posts', async () => {
    setup('/items?open=3084')
    const region = await screen.findByRole('region', { name: '강철심장 게시글' })
    const tooltip = await within(region).findByRole('article', { name: '강철심장' })
    const list = (await within(region).findAllByRole('listitem'))[0].closest('ul')!
    const side = region.querySelector('[class~="lg:grid"]')!
    expect(side).toContainElement(tooltip)
    expect(side).toContainElement(list)
    expect(tooltip.compareDocumentPosition(list) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('shows an item without an icon as an empty square and keeps it openable', async () => {
    setup('/items?open=2003', {
      'GET /api/items/2003': () => json({ ...detail, id: '2003', iconUrl: null, tier: 'STARTER', priceTotal: 50, fromIds: [] }),
    })
    expect(await screen.findByRole('region', { name: '체력 물약 게시글' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '체력 물약' }).querySelector('img')).toBeNull()
  })

  it('ignores unknown or inactive ?open= ids', async () => {
    for (const route of ['/items?open=9999', '/items?open=nope']) {
      const { unmount } = setup(route)
      await screen.findByRole('button', { name: /^전설/ })
      expect(screen.queryByRole('region')).not.toBeInTheDocument()
      unmount()
    }
  })

  it('noItemsYetMessage', async () => {
    setup('/items', { 'GET /api/items': () => json([]) })
    expect(await screen.findByText(/아직 아이템 정보를 받아오지 못했어요/)).toBeInTheDocument()
  })

  it('shows the server message while updating (503)', async () => {
    setup('/items', { 'GET /api/items': () => json({ code: 'MAINTENANCE', message: '잠시 업데이트 중이에요' }, 503) })
    expect(await screen.findByText('잠시 업데이트 중이에요')).toBeInTheDocument()
  })
})
