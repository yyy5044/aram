import { useAugments, useChampions } from '../api/gamedata'
import type { AugmentRarity } from '../api/types'
import type { MentionKind } from '../lib/mentionCandidates'
import AugmentHoverCard from './augment/AugmentHoverCard'
import AugmentIcon from './augment/AugmentIcon'

/** 증강 이름 글자색. 등급 색을 밝은 바탕에서 읽히게(4.5:1 이상) 짙게 했어요. */
const AUGMENT_TEXT: Record<AugmentRarity, string> = {
  SILVER: 'text-ink-2',
  GOLD: 'text-gold-deep',
  PRISMATIC: 'text-prismatic-ink',
}

/** 아이콘은 본문 글자 크기(em)를 따라 커지고, 글자 가운데 높이에 맞춰요. */
const ICON = 'mr-[0.2em] inline-block h-[1.15em] w-[1.15em] align-[-0.22em]'

type Props = {
  kind: MentionKind
  id: string
  label: string
  /** 글쓰기 편집기 안이면 true. 증강 박스가 초점을 받지 않아요. */
  inEditor?: boolean
}

/**
 * 본문 속 챔피언·증강 박스. 아이콘과 등급은 받아 둔 목록에서 찾고, 목록에 없으면 저장된 이름만 보여줘요.
 * 테두리 없이 아이콘과 색 글자로 본문 글자 크기를 그대로 따라요.
 * 눌러도 아무 데도 가지 않아요. 증강은 마우스를 올리거나 누르면 작은 설명 상자가 떠요.
 */
export default function TagMentionChip({ kind, id, label, inEditor = false }: Props) {
  const champions = useChampions()
  const augments = useAugments()
  const champion = kind === 'champion' ? champions.data?.find((c) => c.id === id) : undefined
  const augment = kind === 'augment' ? augments.data?.find((a) => a.id === id) : undefined

  const color = kind === 'champion' ? 'text-teal-ink' : augment ? AUGMENT_TEXT[augment.rarity] : 'text-ink-2'
  // 증강만 점선 밑줄: 마우스를 올리면 설명이 뜬다는 표시예요.
  const underline = kind === 'augment' ? 'underline decoration-dotted decoration-1 underline-offset-4' : ''
  const box = (
    <span data-mention-box="" className="mx-px whitespace-nowrap">
      {champion?.imageUrl && <img src={champion.imageUrl} alt="" className={`${ICON} rounded-full`} />}
      {augment?.iconUrl && (
        <AugmentIcon
          src={augment.iconUrl}
          rarity={augment.rarity}
          tinted={augment.iconTinted}
          className={`${ICON} rounded-mark bg-night`}
        />
      )}
      <span className={`font-medium whitespace-normal ${color} ${underline}`}>{label}</span>
    </span>
  )
  if (kind !== 'augment') return box
  return (
    <AugmentHoverCard augmentId={id} label={label} focusable={!inEditor}>
      {box}
    </AugmentHoverCard>
  )
}
