/**
 * 아이템 탭의 능력치 걸러내기 버튼(설계 docs/superpowers/specs/2026-10-26-item-shop-design.md 5장).
 * 버튼 하나는 적힌 게임 분류(mCategories) 중 하나라도 있으면 맞고, 여러 버튼을 켜면 모두 맞아야 해요.
 */
export type ItemStat =
  | 'damage'
  | 'crit'
  | 'attackSpeed'
  | 'onHit'
  | 'armorPen'
  | 'vamp'
  | 'ap'
  | 'mana'
  | 'magicPen'
  | 'health'
  | 'armor'
  | 'magicResist'
  | 'haste'
  | 'moveSpeed'

export const ITEM_STATS: { key: ItemStat; label: string; categories: string[] }[] = [
  { key: 'damage', label: '공격력', categories: ['Damage'] },
  { key: 'crit', label: '치명타', categories: ['CriticalStrike'] },
  { key: 'attackSpeed', label: '공격 속도', categories: ['AttackSpeed'] },
  { key: 'onHit', label: '적중 시 효과', categories: ['OnHit'] },
  { key: 'armorPen', label: '방어구 관통력', categories: ['ArmorPenetration'] },
  { key: 'vamp', label: '흡혈', categories: ['LifeSteal', 'SpellVamp'] },
  { key: 'ap', label: '주문력', categories: ['SpellDamage'] },
  { key: 'mana', label: '마나', categories: ['Mana', 'ManaRegen'] },
  { key: 'magicPen', label: '마법 관통력', categories: ['MagicPenetration'] },
  { key: 'health', label: '체력', categories: ['Health', 'HealthRegen'] },
  { key: 'armor', label: '방어력', categories: ['Armor'] },
  { key: 'magicResist', label: '마법 저항력', categories: ['SpellBlock', 'MagicResist'] },
  { key: 'haste', label: '스킬 가속', categories: ['AbilityHaste', 'CooldownReduction'] },
  { key: 'moveSpeed', label: '이동 속도', categories: ['NonbootsMovement', 'Boots'] },
]

const CATEGORIES_OF = new Map(ITEM_STATS.map((s) => [s.key, s.categories]))

/** 켠 버튼 모두와 맞는지. 아무것도 안 켰으면 늘 맞아요. */
export function matchesStats(categories: string[], stats: ReadonlySet<ItemStat>): boolean {
  for (const stat of stats) {
    if (!CATEGORIES_OF.get(stat)!.some((c) => categories.includes(c))) return false
  }
  return true
}
