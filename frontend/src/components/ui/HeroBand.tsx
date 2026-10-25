import type { ReactNode } from 'react'

type Props = {
  /** 왼쪽 큰 그림(증강 아이콘 72, 프로필 사진 96 등). */
  media: ReactNode
  eyebrow?: ReactNode
  title: string
  sub?: ReactNode
  /** 오른쪽 버튼(내 프로필의 프로필 수정 등). */
  action?: ReactNode
}

/** 모아보기·프로필 맨 위의 밤하늘 띠. "지금 누구/무엇의 화면인지"를 가장 크게 보여줘요. */
export default function HeroBand({ media, eyebrow, title, sub, action }: Props) {
  return (
    <section className="bg-nightsky-wide mb-6 flex flex-wrap items-center gap-x-6 gap-y-4 border-b-2 border-gold px-5 py-6 text-gold-pale sm:px-8 sm:py-7">
      <div className="flex-none">{media}</div>
      <div className="min-w-0 flex-1">
        {eyebrow && <p className="mb-1 text-[13px] tracking-[.04em] text-gold">{eyebrow}</p>}
        <h1 className="font-display text-[28px] leading-tight break-words text-white">{title}</h1>
        {sub && <div className="mt-1 text-[13px] text-nav">{sub}</div>}
      </div>
      {action && <div className="flex-none">{action}</div>}
    </section>
  )
}
