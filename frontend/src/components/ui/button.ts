export type ButtonVariant = 'primary' | 'discord' | 'gold' | 'ghost' | 'goldLine' | 'tealLine' | 'quiet' | 'quietDanger'
export type ButtonSize = 56 | 48 | 44 | 40 | 36

/** 높이는 설계 3.5: 많이 누를수록 크게, 손가락 최소 44px. */
const SIZES: Record<ButtonSize, string> = {
  56: 'h-14 px-5 text-base',
  48: 'h-12 px-6 text-base',
  44: 'h-11 px-5 text-[15px]',
  40: 'h-10 px-4 text-[15px]',
  36: 'h-9 px-3 text-sm',
}

const VARIANTS: Record<Exclude<ButtonVariant, 'quiet' | 'quietDanger'>, string> = {
  primary: 'bg-linear-to-b from-teal-hi to-teal text-white shadow-[inset_0_0_0_1px_#7fe3ea66] hover:brightness-110',
  discord: 'bg-discord text-white hover:brightness-110',
  gold: 'bg-linear-to-b from-[#e7cf98] to-gold text-night hover:brightness-105',
  ghost:
    'bg-surface text-ink-2 shadow-[inset_0_0_0_1px_var(--color-line)] hover:text-ink hover:shadow-[inset_0_0_0_1px_var(--color-ink-3)]',
  /** 아직 안 누른 추천 */
  goldLine: 'bg-surface text-gold-deep shadow-[inset_0_0_0_1px_var(--color-gold)] hover:bg-[#fbf6ea]',
  /** 아직 안 누른 스크랩, 사진 바꾸기 */
  tealLine: 'bg-surface text-teal-ink shadow-[inset_0_0_0_1px_var(--color-teal)] hover:bg-[#eef8f9]',
}

const BASE =
  'inline-flex items-center justify-center gap-2 rounded-touch font-bold whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal disabled:cursor-not-allowed disabled:opacity-60'

/**
 * 버튼 모양 클래스. <button>과 <Link> 모두에 써요.
 * quiet·quietDanger는 글자만 있는 버튼(수정·삭제처럼 드물게 쓰고 실수하면 안 되는 것)이라 크기를 받지 않아요.
 */
export function buttonClass(variant: ButtonVariant, size: ButtonSize = 44): string {
  if (variant === 'quiet' || variant === 'quietDanger') {
    const hover = variant === 'quiet' ? 'hover:text-ink' : 'hover:text-danger'
    return `inline-flex h-8 items-center rounded-touch px-1.5 text-[13px] text-ink-3 ${hover} hover:underline focus-visible:outline-2 focus-visible:outline-teal disabled:opacity-60`
  }
  return `${BASE} ${SIZES[size]} ${VARIANTS[variant]}`
}
