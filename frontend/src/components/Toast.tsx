import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { ToastContext } from './toastContext'

/** 화면 아래 가운데에 잠깐 뜨는 알림(휴대폰에서 엄지 근처, 머리말을 가리지 않아요). */
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
          className="pointer-events-none fixed bottom-[max(24px,env(safe-area-inset-bottom))] left-1/2 z-50 max-w-[calc(100%-32px)] -translate-x-1/2 border border-gold bg-night px-5 py-3 text-[15px] text-gold-pale shadow-pop"
        >
          {message}
        </div>
      )}
    </ToastContext.Provider>
  )
}
