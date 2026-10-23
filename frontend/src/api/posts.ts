import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { apiFetch } from './client'
import type { Page, PostListItem } from './types'

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
