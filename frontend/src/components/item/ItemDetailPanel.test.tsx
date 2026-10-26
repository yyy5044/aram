import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { Item, ItemDetail } from '../../api/types'
import { json, mockApi } from '../../test/mockApi'
import { renderWithProviders } from '../../test/render'
import ItemDetailPanel from './ItemDetailPanel'

function item(id: string, nameKo: string, extra: Partial<Item> = {}): Item {
  return { id, nameKo, tier: 'BASIC', priceTotal: 350, iconUrl: `https://example.test/${id}.png`, fromIds: [], intoIds: [], active: true, categories: [], ...extra }
}

const sword = item('1036', '롱소드', { intoIds: ['3031'] })
const oldGem = item('9999', '옛 보석', { priceTotal: 400, active: false })
const edge = item('3031', '무한의 대검', { tier: 'LEGENDARY', priceTotal: 3450, fromIds: ['1036', '1036', '9999'], intoIds: [] })
const items = [sword, oldGem, edge]

const detail: ItemDetail = {
  id: '3031',
  tier: 'LEGENDARY',
  priceTotal: 3450,
  iconUrl: 'https://example.test/3031.png',
  fromIds: ['1036', '1036', '9999'],
  intoIds: [],
  original: { locale: 'en', name: 'Infinity Edge', description: 'Gain <attention>65</attention> AD' },
  translation: { locale: 'ko', name: '무한의 대검', description: '공격력 <attention>65</attention>' },
}

function setup(itemId = '3031', detailResponse = () => json(detail)) {
  mockApi({ 'GET /api/items': () => json(items), [`GET /api/items/${itemId}`]: detailResponse })
  const onPick = vi.fn()
  renderWithProviders(<ItemDetailPanel itemId={itemId} items={items} onPick={onPick} />)
  return { onPick }
}

describe('ItemDetailPanel', () => {
  it('draws the recipe tree with the item on top and every ingredient below', () => {
    setup()
    const tree = screen.getByRole('group', { name: '조합 나무' })
    expect(within(tree).getByText('무한의 대검')).toBeInTheDocument()
    // 같은 재료가 두 번이면 두 칸이에요.
    expect(within(tree).getAllByRole('button', { name: '롱소드 350 골드' })).toHaveLength(2)
    expect(within(tree).getAllByText('350')).toHaveLength(2)
    expect(within(tree).getByText('3450')).toBeInTheDocument()
  })

  it('picks an ingredient from the tree', async () => {
    const { onPick } = setup()
    await userEvent.click(screen.getAllByRole('button', { name: '롱소드 350 골드' })[0])
    expect(onPick).toHaveBeenCalledWith('1036')
  })

  it('cannot pick an ingredient that is no longer in the shop', () => {
    setup()
    expect(screen.getByRole('button', { name: '옛 보석 400 골드' })).toBeDisabled()
  })

  it('lists and picks what the item builds into', async () => {
    const { onPick } = setup('1036', () => json({ ...detail, id: '1036', tier: 'BASIC', priceTotal: 350, fromIds: [], intoIds: ['3031'] }))
    const into = screen.getByRole('group', { name: '만들 수 있는 아이템' })
    await userEvent.click(within(into).getByRole('button', { name: '무한의 대검 3450 골드' }))
    expect(onPick).toHaveBeenCalledWith('3031')
  })

  it('hides the builds-into part when there is nothing to build', () => {
    setup()
    expect(screen.queryByText('만들 수 있는 아이템')).not.toBeInTheDocument()
  })

  it('shows the name, price and description in the chosen language', async () => {
    setup()
    expect(await screen.findByRole('heading', { name: '무한의 대검' })).toBeInTheDocument()
    expect(screen.getByText('3450 골드 · 전설')).toBeInTheDocument()
    expect(await screen.findByText('65')).toBeInTheDocument()
  })

  it('says so when the description fails to load, keeping the tree', async () => {
    setup('3031', () => json({ code: 'INTERNAL_ERROR', message: 'x' }, 500))
    expect(await screen.findByText('설명을 불러오지 못했어요')).toBeInTheDocument()
    expect(screen.getByRole('group', { name: '조합 나무' })).toBeInTheDocument()
  })
})
