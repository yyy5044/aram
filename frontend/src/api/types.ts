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

export type Augment = {
  id: string
  nameKo: string
  iconUrl: string
  active: boolean
}

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
