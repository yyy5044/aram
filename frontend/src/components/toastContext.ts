import { createContext, useContext } from 'react'

export type ToastApi = { show: (message: string) => void }

export const ToastContext = createContext<ToastApi>({ show: () => {} })

/** 화면 위쪽 알림 띄우기. */
export function useToast() {
  return useContext(ToastContext)
}
