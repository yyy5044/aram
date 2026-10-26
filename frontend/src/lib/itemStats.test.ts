import { describe, expect, it } from 'vitest'
import { ITEM_STATS, matchesStats, type ItemStat } from './itemStats'

describe('itemStats', () => {
  it('has the 14 stat buttons in spec order', () => {
    const labels = ITEM_STATS.map((s) => s.label)
    expect(labels).toEqual([
      '공격력',
      '치명타',
      '공격 속도',
      '적중 시 효과',
      '방어구 관통력',
      '흡혈',
      '주문력',
      '마나',
      '마법 관통력',
      '체력',
      '방어력',
      '마법 저항력',
      '스킬 가속',
      '이동 속도',
    ])
  })

  it('matches any category inside one button', () => {
    expect(matchesStats(['ManaRegen'], new Set<ItemStat>(['mana']))).toBe(true)
    expect(matchesStats(['SpellVamp'], new Set<ItemStat>(['vamp']))).toBe(true)
    expect(matchesStats(['Boots'], new Set<ItemStat>(['moveSpeed']))).toBe(true)
    expect(matchesStats(['CooldownReduction'], new Set<ItemStat>(['haste']))).toBe(true)
  })

  it('needs every chosen button', () => {
    expect(matchesStats(['Damage'], new Set<ItemStat>(['damage', 'crit']))).toBe(false)
    expect(matchesStats(['Damage', 'CriticalStrike'], new Set<ItemStat>(['damage', 'crit']))).toBe(true)
  })

  it('matches everything with no buttons', () => {
    expect(matchesStats([], new Set())).toBe(true)
    expect(matchesStats(['Active'], new Set())).toBe(true)
  })

  it('ignores categories that no button uses', () => {
    expect(matchesStats(['Active', 'Tenacity'], new Set<ItemStat>(['damage']))).toBe(false)
  })
})
