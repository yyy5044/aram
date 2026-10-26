import { describe, expect, it } from 'vitest'
import type { Item } from '../api/types'
import { buildsInto, recipeTree, shopRows } from './itemShop'
import type { ItemStat } from './itemStats'

function item(id: string, nameKo: string, extra: Partial<Item> = {}): Item {
  return { id, nameKo, tier: 'BASIC', priceTotal: 900, iconUrl: null, fromIds: [], intoIds: [], active: true, categories: [], ...extra }
}

const longSword = item('1036', '롱소드', { priceTotal: 350, categories: ['Damage'] })
const belt = item('1011', '거인의 허리띠', { priceTotal: 900, categories: ['Health'] })
const ruby = item('1028', '루비 수정', { priceTotal: 400, categories: ['Health'] })
const heartsteel = item('3084', '강철심장', { tier: 'LEGENDARY', priceTotal: 3000, fromIds: ['1011', '1028'], categories: ['Health', 'HealthRegen'] })
const warmog = item('3083', '워모그의 갑옷', { tier: 'LEGENDARY', priceTotal: 3000, fromIds: ['1011'], categories: ['Health'] })
const boots = item('1001', '장화', { tier: 'BOOTS', priceTotal: 300, categories: ['Boots'] })
const special = item('6032', '특수 아이템', { tier: 'AUGMENT_MODE', priceTotal: 2500 })
const potion = item('2003', '체력 물약', { tier: 'STARTER', priceTotal: 50 })
const gone = item('9999', '사라진 아이템', { tier: 'EPIC', active: false, categories: ['Health'] })

const none = new Set<ItemStat>()

describe('shopRows', () => {
  it('orders rows by tier and items by price then name', () => {
    const rows = shopRows([heartsteel, warmog, longSword, belt, ruby, boots, special, potion], '', none)
    expect(rows.map((r) => r.label)).toEqual(['증강 칼바람 전용', '시작·소모품', '신발', '기본', '전설'])
    expect(rows.find((r) => r.tier === 'BASIC')!.items.map((i) => i.nameKo)).toEqual(['롱소드', '루비 수정', '거인의 허리띠'])
    // 가격이 같으면 가나다순
    expect(rows.find((r) => r.tier === 'LEGENDARY')!.items.map((i) => i.nameKo)).toEqual(['강철심장', '워모그의 갑옷'])
  })

  it('drops inactive items and empty rows', () => {
    const rows = shopRows([gone, longSword], '', none)
    expect(rows.map((r) => r.tier)).toEqual(['BASIC'])
  })

  it('combines search (with initials) and stats', () => {
    const rows = shopRows([heartsteel, warmog, longSword, belt], 'ㄱㅊ', new Set<ItemStat>(['health']))
    expect(rows.flatMap((r) => r.items.map((i) => i.nameKo))).toEqual(['강철심장'])
    expect(shopRows([heartsteel, longSword], '', new Set<ItemStat>(['damage'])).flatMap((r) => r.items)).toEqual([longSword])
  })
})

describe('recipeTree', () => {
  const byId = (items: Item[]) => new Map(items.map((i) => [i.id, i]))

  it('puts the item on top and its ingredients below, recursively', () => {
    const tree = recipeTree('3084', byId([heartsteel, belt, ruby]))
    expect(tree.item).toBe(heartsteel)
    expect(tree.children.map((c) => c.id)).toEqual(['1011', '1028'])
    expect(tree.children[0].children).toEqual([])
  })

  it('treeKeepsDuplicateIngredients', () => {
    const doubled = item('3031', '무한의 대검', { tier: 'LEGENDARY', fromIds: ['1036', '1036'] })
    const tree = recipeTree('3031', byId([doubled, longSword]))
    expect(tree.children.map((c) => c.id)).toEqual(['1036', '1036'])
  })

  it('treeStopsOnCycle', () => {
    const a = item('1', 'A', { fromIds: ['2'] })
    const b = item('2', 'B', { fromIds: ['1'] })
    const tree = recipeTree('1', byId([a, b]))
    expect(tree.children[0].id).toBe('2')
    expect(tree.children[0].children[0].id).toBe('1')
    expect(tree.children[0].children[0].children).toEqual([])
  })

  it('marks unknown ingredients', () => {
    const odd = item('5', '이상한 아이템', { fromIds: ['4242'] })
    const tree = recipeTree('5', byId([odd]))
    expect(tree.children[0]).toEqual({ id: '4242', item: undefined, children: [] })
  })
})

describe('buildsInto', () => {
  it('keeps only known active items, by price then name', () => {
    const cheap = item('3067', '점화석', { tier: 'EPIC', priceTotal: 800, fromIds: ['1028'] })
    const ruby2 = { ...ruby, intoIds: ['3084', '9999', '3067', '4242'] }
    const map = new Map([heartsteel, gone, cheap].map((i) => [i.id, i]))
    expect(buildsInto(ruby2, map).map((i) => i.id)).toEqual(['3067', '3084'])
  })
})
