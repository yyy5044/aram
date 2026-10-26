import type { Language } from '../lib/language'
import type { JSONContent } from '@tiptap/core'

/** 백엔드 응답 타입. 필드 이름은 서버 record와 똑같아요. */

export type Me = {
  id: number
  nickname: string | null
  avatarUrl: string | null
  admin: boolean
  suggestedNickname: string | null
  profilePublic: boolean
  profileImageId: string | null
  discordAvatarUrl: string | null
}

export type Author = {
  id: number
  nickname: string
  avatarUrl: string | null
}

export type Champion = {
  id: string
  nameKo: string
  imageUrl: string | null
}

export type AugmentRarity = 'PRISMATIC' | 'GOLD' | 'SILVER'

export type Augment = {
  id: string
  nameKo: string
  iconUrl: string
  /** 색 있는 큰 아이콘이 없어 흰 작은 아이콘을 줬을 때 true. 화면이 등급 색을 입혀요. */
  iconTinted?: boolean
  active: boolean
  rarity: AugmentRarity
}

/** 증강의 언어별 이름과 설명. description에는 서버가 남긴 색 표식(<magicDamage> 등)과 <br>만 있어요. */
export type AugmentText = {
  locale: Language
  name: string
  description: string
}

/** 카드용 상세. original은 영어, translation은 선택 언어(원문과 같거나 없으면 null). */
export type AugmentDetail = {
  id: string
  rarity: AugmentRarity
  iconUrl: string
  /** 색 있는 큰 아이콘이 없어 흰 작은 아이콘을 줬을 때 true. 화면이 등급 색을 입혀요. */
  iconTinted?: boolean
  original: AugmentText | null
  translation: AugmentText | null
}

/** 아이템 단계. 화면 순서와 이름은 lib/itemTiers.ts에 있어요. */
export type ItemTier = 'AUGMENT_MODE' | 'LEGENDARY' | 'EPIC' | 'BOOTS' | 'BASIC' | 'STARTER'

/** 증강 칼바람에서 살 수 있는 아이템. 재료·상위 아이템은 번호 목록(같은 재료가 여러 번 나올 수 있어요). */
export type Item = {
  id: string
  nameKo: string
  tier: ItemTier
  priceTotal: number
  /** 첫 게임 데이터 동기화 전에는 없을 수 있어요. */
  iconUrl: string | null
  fromIds: string[]
  intoIds: string[]
  active: boolean
}

/** 카드용 아이템 상세. original은 영어, translation은 선택 언어(원문과 같거나 없으면 null). */
export type ItemDetail = {
  id: string
  tier: ItemTier
  priceTotal: number
  iconUrl: string | null
  fromIds: string[]
  intoIds: string[]
  original: AugmentText | null
  translation: AugmentText | null
}

/** 태그 id → 글 수. 글이 있는 태그만 들어 있어요. */
export type TagCounts = {
  champions: Record<string, number>
  augments: Record<string, number>
  /** 아이템 탭 묶음 글 수. 서버는 더 이상 보내지 않아요(아이템 탭을 새로 만들 때 함께 빠짐). */
  items?: Record<string, number>
}

export type TopAugment = { augment: Augment; postCount: number }

export type Patches = {
  current: string | null
  patches: string[]
}

export type PostListItem = {
  id: number
  title: string
  gamePatch: string
  author: Author
  champions: Champion[]
  augments: Augment[]
  likeCount: number
  commentCount: number
  viewCount: number
  createdAt: string
}

export type PostDetail = {
  id: number
  title: string
  content: JSONContent
  gamePatch: string
  author: Author
  champions: Champion[]
  augments: Augment[]
  likeCount: number
  commentCount: number
  viewCount: number
  likedByMe: boolean
  scrappedByMe: boolean
  createdAt: string
  updatedAt: string
  edited: boolean
}

export type Comment = {
  id: number
  author: Author
  content: string
  createdAt: string
  updatedAt: string
  edited: boolean
}

export type Page<T> = {
  items: T[]
  page: number
  size: number
  totalItems: number
  totalPages: number
}

export type PostRequest = {
  title: string
  content: JSONContent
  championIds: string[]
  augmentIds: string[]
  gamePatch: string
}

export type ActivityDay = { date: string; posts: number; comments: number }

export type Activity = { from: string; to: string; days: ActivityDay[] }

export type Profile = {
  id: number
  nickname: string
  avatarUrl: string | null
  joinedAt: string
  profilePublic: boolean
  mine: boolean
  locked: boolean
  /** receivedLikeCount: 이 사람이 쓴 글들이 받은 추천 수의 합 */
  stats: { postCount: number; commentCount: number; scrapCount: number; receivedLikeCount: number } | null
  activity: Activity | null
}

export type MyComment = {
  id: number
  content: string
  createdAt: string
  post: { id: number; title: string }
}

export type ProfileUpdate = {
  nickname: string
  profileImageId: string | null
  profilePublic: boolean
}
