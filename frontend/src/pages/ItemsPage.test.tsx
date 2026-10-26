import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Item, ItemDetail } from '../api/types'
import { json, mockApi, type MockRoutes } from '../test/mockApi'
import { renderWithProviders } from '../test/render'
import ItemsPage from './ItemsPage'

afterEach(() => vi.unstubAllGlobals())

function item(id: string, nameKo: string, extra: Partial<Item> = {}): Item {
  return { id, nameKo, tier: 'BASIC', priceTotal: 900, iconUrl: `https://example.test/${id}.png`, fromIds: [], intoIds: [], active: true, categories: [], ...extra }
}

const sword = item('1036', '롱소드', { priceTotal: 350, intoIds: ['3031'], categories: ['Damage'] })
const belt = item('1011', '거인의 허리띠', { intoIds: ['3084'], categories: ['Health'] })
const cloak = item('1018', '민첩성의 망토', { priceTotal: 600, categories: ['CriticalStrike'] })
const edge = item('3031', '무한의 대검', { tier: 'LEGENDARY', priceTotal: 3450, fromIds: ['1036', '1018'], categories: ['Damage', 'CriticalStrike'] })
const heartsteel = item('3084', '강철심장', { tier: 'LEGENDARY', priceTotal: 3000, fromIds: ['1011'], categories: ['Health', 'HealthRegen'] })
const greaves = item('3006', '광전사의 군화', { tier: 'BOOTS', priceTotal: 1100, categories: ['Boots', 'AttackSpeed'] })
const potion = item('2003', '체력 물약', { tier: 'STARTER', priceTotal: 50, iconUrl: null, categories: ['HealthRegen', 'Consumable'] })
const special = item('6032', '특수 갑옷', { tier: 'AUGMENT_MODE', priceTotal: 2500, categories: ['Armor'] })
const gone = item('9999', '사라진 아이템', { tier: 'EPIC', active: false, categories: ['Damage'] })
const ALL = [sword, belt, cloak, edge, heartsteel, greaves, potion, special, gone]

function detailOf(it: Item): ItemDetail {
  return {
    id: it.id,
    tier: it.tier,
    priceTotal: it.priceTotal,
    iconUrl: it.iconUrl,
    fromIds: it.fromIds,
    intoIds: it.intoIds,
    original: { locale: 'en', name: it.nameKo, description: 'English' },
    translation: { locale: 'ko', name: it.nameKo, description: `${it.nameKo} 설명` },
  }
}

function setup(route = '/items', extra: MockRoutes = {}) {
  const details = Object.fromEntries(ALL.map((it) => [`GET /api/items/${it.id}`, () => json(detailOf(it))]))
  const api = mockApi({ 'GET /api/items': () => json(ALL), ...details, ...extra })
  const utils = renderWithProviders(<ItemsPage />, { path: '/items', route })
  return { api, ...utils }
}

/** 휴대폰 폭(768px 미만)으로 흉내 내요. */
function phone() {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query.includes('max-width: 767px'),
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }))
}

const rowTitles = () => screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)
const rowItems = (title: string) =>
  within(screen.getByRole('region', { name: title }))
    .getAllByRole('button')
    .map((b) => b.getAttribute('aria-label'))
const shopButton = (name: string) => screen.getByRole('button', { name: new RegExp(`^${name} \\d+ 골드$`) })
const stat = (name: string) => screen.getByRole('button', { name })

describe('ItemsPage', () => {
  it('shows every row in shop order, cheapest first', async () => {
    setup()
    await screen.findByRole('region', { name: '전설' })
    expect(rowTitles()).toEqual(['증강 칼바람 전용', '시작·소모품', '신발', '기본', '전설'])
    expect(rowItems('기본')).toEqual(['롱소드 350 골드', '민첩성의 망토 600 골드', '거인의 허리띠 900 골드'])
    expect(rowItems('전설')).toEqual(['강철심장 3000 골드', '무한의 대검 3450 골드'])
    expect(screen.getByText('아이템 8개')).toBeInTheDocument()
    expect(screen.queryByText(/글/)).not.toBeInTheDocument()
  })

  it('filters by stat buttons, needing all of them, and 모든 아이템 clears them', async () => {
    setup()
    await screen.findByRole('region', { name: '전설' })
    expect(stat('모든 아이템')).toHaveAttribute('aria-pressed', 'true')

    await userEvent.click(stat('공격력'))
    expect(stat('공격력')).toHaveAttribute('aria-pressed', 'true')
    expect(stat('모든 아이템')).toHaveAttribute('aria-pressed', 'false')
    expect(rowTitles()).toEqual(['기본', '전설'])
    expect(screen.getByText('아이템 2개')).toBeInTheDocument()

    await userEvent.click(stat('치명타'))
    expect(rowItems('전설')).toEqual(['무한의 대검 3450 골드'])
    expect(screen.queryByRole('region', { name: '기본' })).not.toBeInTheDocument()

    await userEvent.click(stat('치명타'))
    expect(stat('치명타')).toHaveAttribute('aria-pressed', 'false')
    expect(rowTitles()).toEqual(['기본', '전설'])

    await userEvent.click(stat('모든 아이템'))
    expect(rowTitles()).toHaveLength(5)
  })

  it('combines search by initials with stats, and 조건 지우기 resets both', async () => {
    setup()
    await screen.findByRole('region', { name: '전설' })
    await userEvent.type(screen.getByLabelText('아이템 이름 검색'), 'ㄱㅊ')
    await userEvent.click(stat('체력'))
    expect(rowItems('전설')).toEqual(['강철심장 3000 골드'])

    await userEvent.click(stat('공격력'))
    expect(screen.getByText('조건에 맞는 아이템이 없어요')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: '조건 지우기' }))
    expect(screen.getByLabelText('아이템 이름 검색')).toHaveValue('')
    expect(rowTitles()).toHaveLength(5)
  })

  it('selects an item into the side panel and the address', async () => {
    const { router } = setup()
    await screen.findByRole('region', { name: '전설' })
    expect(screen.getByText('아이템을 고르면 조합과 설명이 나와요')).toBeInTheDocument()

    await userEvent.click(shopButton('무한의 대검'))
    expect(router.state.location.search).toBe('?item=3031')
    expect(shopButton('무한의 대검')).toHaveAttribute('aria-pressed', 'true')
    const tree = screen.getByRole('group', { name: '조합 나무' })
    expect(await screen.findByText('무한의 대검 설명')).toBeInTheDocument()

    await userEvent.click(within(tree).getByRole('button', { name: '롱소드 350 골드' }))
    expect(router.state.location.search).toBe('?item=1036')
    expect(await screen.findByText('롱소드 설명')).toBeInTheDocument()
  })

  it('starts from ?item=', async () => {
    setup('/items?item=3084')
    expect(await screen.findByText('강철심장 설명')).toBeInTheDocument()
  })

  it('drops unknown or inactive ids from the address', async () => {
    const { router } = setup('/items?item=9999')
    await screen.findByRole('region', { name: '전설' })
    await vi.waitFor(() => expect(router.state.location.search).toBe(''))
    expect(screen.getByText('아이템을 고르면 조합과 설명이 나와요')).toBeInTheDocument()
  })

  it('keepsSelectionWhenFilteredOut', async () => {
    setup('/items?item=3084')
    expect(await screen.findByText('강철심장 설명')).toBeInTheDocument()
    await userEvent.click(stat('공격력'))
    expect(screen.queryByRole('button', { name: /^강철심장 \d+ 골드$/ })).not.toBeInTheDocument()
    expect(screen.getByText('강철심장 설명')).toBeInTheDocument()
  })

  it('says so when no item data has arrived yet', async () => {
    mockApi({ 'GET /api/items': () => json([]) })
    renderWithProviders(<ItemsPage />, { path: '/items', route: '/items' })
    expect(await screen.findByText('아직 아이템 정보를 받아오지 못했어요. 잠시 후 다시 확인해주세요')).toBeInTheDocument()
  })

  it('shows the server message while updating (503)', async () => {
    mockApi({ 'GET /api/items': () => json({ code: 'MAINTENANCE', message: '잠시 업데이트 중이에요' }, 503) })
    renderWithProviders(<ItemsPage />, { path: '/items', route: '/items' })
    expect(await screen.findByText('잠시 업데이트 중이에요')).toBeInTheDocument()
  })

  describe('on a phone', () => {
    it('opens the item in a bottom sheet and closes it back to the list', async () => {
      phone()
      const { router } = setup()
      await screen.findByRole('region', { name: '전설' })
      expect(screen.queryByText('아이템을 고르면 조합과 설명이 나와요')).not.toBeInTheDocument()

      await userEvent.click(shopButton('강철심장'))
      const sheet = screen.getByRole('dialog', { name: '강철심장' })
      expect(within(sheet).getByRole('group', { name: '조합 나무' })).toBeInTheDocument()

      await userEvent.click(within(sheet).getByRole('button', { name: '닫기' }))
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(router.state.location.search).toBe('')
    })

    it('sheetReturnsFocusToItem', async () => {
      phone()
      setup()
      await screen.findByRole('region', { name: '전설' })
      const button = shopButton('강철심장')
      await userEvent.click(button)
      await userEvent.keyboard('{Escape}')
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(button).toHaveFocus()
    })

    it('starts with the sheet open from ?item=', async () => {
      phone()
      setup('/items?item=3084')
      expect(await screen.findByRole('dialog', { name: '강철심장' })).toBeInTheDocument()
    })
  })
})
