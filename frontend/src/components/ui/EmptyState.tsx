import type { ReactNode } from 'react'
import { LockIcon } from './icons'

type Props = {
  icon?: 'diamond' | 'lock'
  title: string
  children?: ReactNode
  /** 다음에 할 일 버튼 하나. 막다른 화면이 없게 해요. */
  action?: ReactNode
}

/** 없는 글, 빈 목록, 비공개 프로필처럼 보여줄 내용이 없을 때의 화면. */
export default function EmptyState({ icon = 'diamond', title, children, action }: Props) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-16 text-center">
      {icon === 'lock' ? (
        <span className="grid h-11 w-11 place-items-center rounded-full border border-line bg-surface text-ink-3">
          <LockIcon className="h-[22px] w-[22px]" />
        </span>
      ) : (
        <span aria-hidden="true" className="h-7 w-7 rotate-45 border-2 border-gold bg-linear-to-br from-[#e7f7f8] to-white" />
      )}
      <h2 className="mt-2 font-display text-xl text-night">{title}</h2>
      {children && <div className="text-[15px] text-ink-2">{children}</div>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}
