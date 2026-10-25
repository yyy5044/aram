import type { ReactNode } from 'react'
import { Link } from 'react-router'
import type { AugmentRarity } from '../../api/types'
import AugmentIcon from '../augment/AugmentIcon'
import { tagPath } from './tagPath'

export type TagChipSize = 'sm' | 'md' | 'lg'

type Props = {
  kind: 'champion' | 'augment' | 'item'
  id: string
  nameKo: string
  imageUrl: string | null
  /** 증강이면 등급(아이콘 테두리 색), tinted면 흰 아이콘에 등급 색을 입혀요. */
  rarity?: AugmentRarity
  tinted?: boolean
  /** sm 28px(목록), md 36px(글쓰기에서 고른 것), lg 48px(글 상세, 누르는 링크). */
  size: TagChipSize
  /** true면 그 태그의 모아보기로 가는 링크. */
  link?: boolean
  /** 링크 주소를 직접 정할 때(예: 증강 탭에서 펼치기). */
  to?: string
  /** 있으면 끝에 ✕(빼기) 버튼. */
  onRemove?: () => void
  /** 이름 뒤에 붙는 것(함께 쓴 글 수 등). */
  extra?: ReactNode
}

const BOX: Record<TagChipSize, string> = {
  sm: 'h-7 gap-1.5 pl-[3px] text-[13px] border-line-soft text-ink-2',
  md: 'h-9 gap-2 pl-1 text-[15px] border-line text-ink',
  lg: 'h-12 gap-2 pl-1.5 text-[15px] border-line text-ink',
}
const PAD_RIGHT: Record<TagChipSize, string> = { sm: 'pr-2.5', md: 'pr-3', lg: 'pr-4' }
const ICON: Record<TagChipSize, string> = { sm: 'h-5 w-5', md: 'h-7 w-7', lg: 'h-9 w-9' }

/** 챔피언·증강·아이템 태그. 아이콘과 이름을 한 덩어리로 보여줘서 순서를 맞춰 읽을 필요가 없어요. */
export default function TagChip({ kind, id, nameKo, imageUrl, rarity, tinted, size, link, to, onRemove, extra }: Props) {
  const icon = ICON[size]
  const picture = !imageUrl ? (
    <span aria-hidden="true" className={`${icon} flex-none ${kind === 'item' ? 'rounded-mark' : 'rounded-full'} bg-line`} />
  ) : kind === 'augment' && rarity ? (
    <AugmentIcon src={imageUrl} rarity={rarity} tinted={tinted} frame="ring" className={`${icon} flex-none rounded-mark bg-night`} />
  ) : kind === 'item' ? (
    <img src={imageUrl} alt="" className={`${icon} flex-none rounded-mark bg-night-2`} />
  ) : (
    <img src={imageUrl} alt="" className={`${icon} flex-none rounded-full ring-1 ring-gold`} />
  )
  const body = (
    <>
      {picture}
      <span className="min-w-0 truncate">{nameKo}</span>
      {extra}
    </>
  )
  // ✕ 버튼이 있으면 오른쪽 여백은 버튼이 대신해요.
  const box = `inline-flex max-w-full flex-none items-center rounded-touch border bg-ice font-medium whitespace-nowrap ${BOX[size]} ${
    onRemove ? 'pr-1' : PAD_RIGHT[size]
  }`
  const href = to ?? (link ? tagPath(kind, id) : null)

  if (href) {
    return (
      <Link to={href} className={`${box} hover:border-gold hover:bg-surface focus-visible:outline-2 focus-visible:outline-teal`}>
        {body}
      </Link>
    )
  }
  return (
    <span className={box}>
      {body}
      {onRemove && (
        <button
          type="button"
          aria-label={`${nameKo} 빼기`}
          onClick={onRemove}
          className="ml-1 grid h-7 w-7 flex-none place-items-center rounded-[6px] text-xs text-ink-3 hover:bg-[#fde7e7] hover:text-danger"
        >
          ✕
        </button>
      )}
    </span>
  )
}
