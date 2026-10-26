import { useEffect, useRef, type ReactNode } from 'react'

type Props = {
  open: boolean
  onClose: () => void
  /** 화면 읽기 프로그램이 읽는 창 이름. */
  label: string
  children: ReactNode
}

/**
 * 휴대폰에서 아래서 올라오는 창. 뒤 화면을 어둡게 덮고, 덮개·Esc·「닫기」로 닫혀요.
 * 열린 동안 뒤 화면은 스크롤되지 않고, 닫히면 열기 전에 초점이 있던 곳(누른 칸)으로 초점이 돌아가요.
 */
export default function BottomSheet({ open, onClose, label, children }: Props) {
  const closeButton = useRef<HTMLButtonElement>(null)
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  })

  useEffect(() => {
    if (!open) return
    const returnTo = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeButton.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
      returnTo?.focus()
    }
  }, [open])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div data-testid="sheet-backdrop" aria-hidden="true" onClick={onClose} className="absolute inset-0 bg-night/60" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className="relative flex max-h-[85vh] flex-col rounded-t-touch border-t border-gold bg-night shadow-pop"
      >
        <div className="flex justify-end p-1">
          <button
            ref={closeButton}
            type="button"
            onClick={onClose}
            className="grid h-11 w-11 place-items-center rounded-touch text-nav hover:text-surface focus-visible:outline-2 focus-visible:outline-teal"
          >
            <span aria-hidden="true" className="text-xl leading-none">
              ✕
            </span>
            <span className="sr-only">닫기</span>
          </button>
        </div>
        <div className="overflow-y-auto px-4 pb-6">{children}</div>
      </div>
    </div>
  )
}
