import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { apiFetch } from './client'
import type { Page, PostDetail, PostListItem, PostRequest } from './types'

export type PostSort = 'latest' | 'likes' | 'views'

/** 주소에 남은 정렬 값(?sort=, ?order=)을 읽어요. 모르는 값이면 최신순이에요. */
export function parsePostSort(value: string | null): PostSort {
  return value === 'likes' || value === 'views' ? value : 'latest'
}

export type PostListParams = {
  sort: PostSort
  page: number
  champion?: string
  augment?: string
}

export function usePostList(params: PostListParams) {
  const query = new URLSearchParams({ sort: params.sort, page: String(params.page) })
  if (params.champion) query.set('champion', params.champion)
  if (params.augment) query.set('augment', params.augment)
  return useQuery({
    queryKey: ['posts', 'list', params],
    queryFn: () => apiFetch<Page<PostListItem>>(`/api/posts?${query}`),
    placeholderData: keepPreviousData,
  })
}

export const TAG_POSTS_SIZE = 5

export type TagPostsParams = { champion?: string; augment?: string; item?: string; sort: PostSort }

/** 태그 하나의 글을 5개씩 이어서 불러와요(펼침 영역용). */
export function useTagPosts(params: TagPostsParams) {
  return useInfiniteQuery({
    queryKey: ['posts', 'tag', params],
    queryFn: ({ pageParam }) => {
      const query = new URLSearchParams({ sort: params.sort, page: String(pageParam), size: String(TAG_POSTS_SIZE) })
      if (params.champion) query.set('champion', params.champion)
      if (params.augment) query.set('augment', params.augment)
      if (params.item) query.set('item', params.item)
      return apiFetch<Page<PostListItem>>(`/api/posts?${query}`)
    },
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page < last.totalPages ? last.page + 1 : undefined),
    // 정렬을 바꿔도 새 목록이 올 때까지 예전 목록을 그대로 보여줘요(버튼이 사라지지 않게).
    placeholderData: keepPreviousData,
  })
}

export const postKey = (postId: number) => ['posts', 'detail', postId] as const

export function usePost(postId: number) {
  return useQuery({
    queryKey: postKey(postId),
    queryFn: () => apiFetch<PostDetail>(`/api/posts/${postId}`),
    enabled: Number.isFinite(postId),
  })
}

export function deletePost(postId: number) {
  return apiFetch<void>(`/api/posts/${postId}`, { method: 'DELETE' })
}

export type LikeState = { likeCount: number; likedByMe: boolean }

export function likePost(postId: number) {
  return apiFetch<LikeState>(`/api/posts/${postId}/like`, { method: 'PUT' })
}

export function unlikePost(postId: number) {
  return apiFetch<LikeState>(`/api/posts/${postId}/like`, { method: 'DELETE' })
}

export function createPost(body: PostRequest) {
  return apiFetch<{ id: number }>('/api/posts', { method: 'POST', json: body })
}

export function updatePost(postId: number, body: PostRequest) {
  return apiFetch<void>(`/api/posts/${postId}`, { method: 'PUT', json: body })
}

export type ScrapState = { scrappedByMe: boolean }

export function scrapPost(postId: number) {
  return apiFetch<ScrapState>(`/api/posts/${postId}/scrap`, { method: 'PUT' })
}

export function unscrapPost(postId: number) {
  return apiFetch<ScrapState>(`/api/posts/${postId}/scrap`, { method: 'DELETE' })
}
