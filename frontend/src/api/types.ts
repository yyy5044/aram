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

/** 태그 id → 글 수. 글이 있는 태그만 들어 있어요. */
export type TagCounts = {
  champions: Record<string, number>
  augments: Record<string, number>
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
  stats: { postCount: number; commentCount: number; scrapCount: number } | null
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
