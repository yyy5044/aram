import { useSyncExternalStore } from 'react'

/** CSS 미디어 쿼리가 맞는지 알려줘요. 창 크기가 바뀌면 다시 그려요. */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query)
      list.addEventListener('change', onChange)
      return () => list.removeEventListener('change', onChange)
    },
    () => window.matchMedia(query).matches,
    () => false,
  )
}
