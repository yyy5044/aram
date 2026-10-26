import type { ItemTier } from '../api/types'

/** 아이템 탭에서 줄이 보이는 순서(게임 상점처럼 시작 → 전설, 증강 칼바람 전용은 맨 위). */
export const ITEM_TIERS: ItemTier[] = ['AUGMENT_MODE', 'STARTER', 'BOOTS', 'BASIC', 'EPIC', 'LEGENDARY']

export const ITEM_TIER_LABEL: Record<ItemTier, string> = {
  AUGMENT_MODE: '증강 칼바람 전용',
  LEGENDARY: '전설',
  EPIC: '서사',
  BOOTS: '신발',
  BASIC: '기본',
  STARTER: '시작·소모품',
}
