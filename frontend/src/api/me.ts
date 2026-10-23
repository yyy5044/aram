import { useQuery } from '@tanstack/react-query'
import { rememberReturnTo } from '../lib/returnTo'
import { apiFetch } from './client'
import type { Me } from './types'

export const meKey = ['me'] as const

export function useMe() {
  return useQuery({
    queryKey: meKey,
    queryFn: async () => (await apiFetch<Me | undefined>('/api/me')) ?? null,
    staleTime: 60_000,
  })
}

export function setNickname(nickname: string): Promise<Me> {
  return apiFetch<Me>('/api/me/nickname', { method: 'PUT', json: { nickname } })
}

export function logout(): Promise<void> {
  return apiFetch<void>('/api/logout', { method: 'POST' })
}

/** 지금 보던 주소를 기억하고 디스코드 로그인으로 보내요. */
export function startDiscordLogin(currentPath: string) {
  rememberReturnTo(currentPath)
  window.location.assign('/oauth2/authorization/discord')
}
