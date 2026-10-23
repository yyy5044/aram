import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { ToastContext } from './toastContext'

/** 화면 위쪽에 잠깐 뜨는 알림. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const show = useCallback((text: string) => {
    setMessage(text)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setMessage(null), 3000)
  }, [])

  useEffect(() => () => clearTimeout(timer.current), [])

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      {message && (
        <div
          role="status"
          className="fixed top-4 left-1/2 z-50 -translate-x-1/2 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-slate-100 shadow-lg"
        >
          {message}
        </div>
      )}
    </ToastContext.Provider>
  )
}
