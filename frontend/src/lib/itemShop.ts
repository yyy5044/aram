import type { Item, ItemTier } from '../api/types'
import { ITEM_TIER_LABEL, ITEM_TIERS } from './itemTiers'
import { matchesStats, type ItemStat } from './itemStats'
import { matchesName } from './tagSearch'

/** 상점처럼 싼 것부터, 같으면 가나다순. */
const byPriceThenName = (a: Item, b: Item) => a.priceTotal - b.priceTotal || a.nameKo.localeCompare(b.nameKo, 'ko')

export type ShopRow = { tier: ItemTier; label: string; items: Item[] }

/** 아이템 탭의 단계별 줄. 지금 상점에 있는 것만, 검색어와 능력치에 맞는 것만 남기고 빈 줄은 빼요. */
export function shopRows(items: Item[], query: string, stats: ReadonlySet<ItemStat>): ShopRow[] {
  const shown = items.filter((it) => it.active && matchesName(it.nameKo, query) && matchesStats(it.categories, stats))
  return ITEM_TIERS.map((tier) => ({
    tier,
    label: ITEM_TIER_LABEL[tier],
    items: shown.filter((it) => it.tier === tier).sort(byPriceThenName),
  })).filter((row) => row.items.length > 0)
}

/** 조합 나무의 칸 하나. 목록에 없는 번호면 item이 비어 있어요. */
export type RecipeNode = { id: string; item: Item | undefined; children: RecipeNode[] }

/** 고른 아이템을 맨 위에, 재료를 아래로 끝까지. 재료 순서·중복은 자료 그대로이고, 지나온 아이템을 다시 만나면 거기서 멈춰요. */
export function recipeTree(id: string, byId: ReadonlyMap<string, Item>, path: ReadonlySet<string> = new Set()): RecipeNode {
  const item = byId.get(id)
  if (!item || path.has(id)) return { id, item, children: [] }
  const next = new Set(path).add(id)
  return { id, item, children: item.fromIds.map((child) => recipeTree(child, byId, next)) }
}

/** 이 아이템으로 만들 수 있는 아이템. 지금 상점에 있는 것만, 싼 것부터. */
export function buildsInto(item: Item, byId: ReadonlyMap<string, Item>): Item[] {
  return item.intoIds
    .map((id) => byId.get(id))
    .filter((it): it is Item => it !== undefined && it.active)
    .sort(byPriceThenName)
}
