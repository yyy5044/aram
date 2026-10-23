import { useQuery } from '@tanstack/react-query'
import { apiFetch } from './client'
import type { Augment, Champion, Patches } from './types'

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

export function usePatches() {
  return useQuery({
    queryKey: ['patches'],
    queryFn: () => apiFetch<Patches>('/api/patches'),
    staleTime: Infinity,
  })
}
