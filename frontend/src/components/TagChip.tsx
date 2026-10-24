import { Link } from 'react-router'
import type { AugmentRarity } from '../api/types'
import AugmentIcon from './augment/AugmentIcon'

type Props = {
  kind: 'champion' | 'augment'
  id: string
  nameKo: string
  imageUrl: string | null
  /** 증강 칩이면 등급(테두리 선), tinted면 흰 아이콘에 등급 색을 입혀요. */
  rarity?: AugmentRarity
  tinted?: boolean
}

/** 누르면 그 태그의 모아보기로 가는 칩. */
export default function TagChip({ kind, id, nameKo, imageUrl, rarity, tinted }: Props) {
  const to = kind === 'champion' ? `/champions/${encodeURIComponent(id)}` : `/augments/${encodeURIComponent(id)}`
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-900 py-0.5 pr-2.5 pl-0.5 text-sm text-slate-200 hover:border-sky-400"
    >
      {imageUrl ? (
        rarity ? (
          <AugmentIcon src={imageUrl} rarity={rarity} tinted={tinted} frame="ring" className="h-6 w-6 rounded-md bg-slate-800" />
        ) : (
          <img
            src={imageUrl}
            alt=""
            className={kind === 'champion' ? 'h-6 w-6 rounded-full' : 'h-6 w-6 rounded-md bg-slate-800'}
          />
        )
      ) : (
        <span aria-hidden="true" className="h-6 w-6 rounded-full bg-slate-700" />
      )}
      {nameKo}
    </Link>
  )
}
