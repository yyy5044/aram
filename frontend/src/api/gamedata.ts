import { useQuery } from '@tanstack/react-query'
import { apiFetch } from './client'
import type { Augment, Champion, Patches, TagCounts, TopAugment } from './types'

/** 게임 데이터는 자주 바뀌지 않아서 한 번 받으면 세션 동안 다시 받지 않아요. */
export function useChampions() {
  return useQuery({
    queryKey: ['champions'],
    queryFn: () => apiFetch<Champion[]>('/api/champions'),
    staleTime: Infinity,
  })
}

export function useAugments() {
  return useQuery({
    queryKey: ['augments'],
    queryFn: () => apiFetch<Augment[]>('/api/augments'),
    staleTime: Infinity,
  })
}

/** 글 수는 글이 늘면 바뀌니까 화면을 열 때마다 다시 받아요. */
export function useTagCounts() {
  return useQuery({
    queryKey: ['posts', 'tag-counts'],
    queryFn: () => apiFetch<TagCounts>('/api/tag-counts'),
  })
}

export function useTopAugments(championId: string) {
  return useQuery({
    queryKey: ['posts', 'top-augments', championId],
    queryFn: () => apiFetch<TopAugment[]>(`/api/champions/${encodeURIComponent(championId)}/top-augments`),
  })
}

export function usePatches() {
  return useQuery({
    queryKey: ['patches'],
    queryFn: () => apiFetch<Patches>('/api/patches'),
    staleTime: Infinity,
  })
}
