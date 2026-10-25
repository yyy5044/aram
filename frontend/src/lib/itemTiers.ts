import type { ItemTier } from '../api/types'

/** 아이템 탭에서 묶음이 보이는 순서. */
export const ITEM_TIERS: ItemTier[] = ['AUGMENT_MODE', 'LEGENDARY', 'EPIC', 'BOOTS', 'BASIC', 'STARTER']

export const ITEM_TIER_LABEL: Record<ItemTier, string> = {
  AUGMENT_MODE: '증강 칼바람 전용',
  LEGENDARY: '전설',
  EPIC: '서사',
  BOOTS: '신발',
  BASIC: '기본',
  STARTER: '시작·소모품',
}
