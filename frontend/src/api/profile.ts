import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { apiFetch } from './client'
import type { Me, MyComment, Page, PostListItem, Profile, ProfileUpdate } from './types'

export const profileKey = (userId: number) => ['profile', userId] as const

export function useProfile(userId: number) {
  return useQuery({
    queryKey: profileKey(userId),
    queryFn: () => apiFetch<Profile>(`/api/users/${userId}/profile`),
    enabled: Number.isFinite(userId),
  })
}

function useUserList<T>(userId: number, list: 'posts' | 'comments' | 'scraps', page: number, enabled: boolean) {
  return useQuery({
    queryKey: [...profileKey(userId), list, page],
    queryFn: () => apiFetch<Page<T>>(`/api/users/${userId}/${list}?page=${page}`),
    enabled: enabled && Number.isFinite(userId),
    placeholderData: keepPreviousData,
  })
}

export function useUserPosts(userId: number, page: number, enabled = true) {
  return useUserList<PostListItem>(userId, 'posts', page, enabled)
}

export function useUserComments(userId: number, page: number, enabled = true) {
  return useUserList<MyComment>(userId, 'comments', page, enabled)
}

export function useUserScraps(userId: number, page: number, enabled = true) {
  return useUserList<PostListItem>(userId, 'scraps', page, enabled)
}

export function updateProfile(body: ProfileUpdate): Promise<Me> {
  return apiFetch<Me>('/api/me/profile', { method: 'PUT', json: body })
}
