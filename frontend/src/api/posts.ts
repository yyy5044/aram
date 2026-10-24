import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { apiFetch } from './client'
import type { Page, PostDetail, PostListItem, PostRequest } from './types'

export type PostSort = 'latest' | 'likes'

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
