import { useAugments, useChampions } from '../api/gamedata'
import type { AugmentRarity } from '../api/types'
import type { MentionKind } from '../lib/mentionCandidates'
import AugmentHoverCard from './augment/AugmentHoverCard'
import AugmentIcon from './augment/AugmentIcon'

/** 증강 박스의 테두리와 옅은 바탕. 등급 색을 따라요. */
const AUGMENT_BOX: Record<AugmentRarity, string> = {
  SILVER: 'border-silver bg-ice',
  GOLD: 'border-gold-rarity bg-gold-pale',
  PRISMATIC: 'border-prismatic bg-[#f3e8fb]',
}

type Props = { kind: MentionKind; id: string; label: string }

/**
 * 본문 속 챔피언·증강 박스. 아이콘과 등급은 받아 둔 목록에서 찾고, 목록에 없으면 저장된 이름만 보여줘요.
 * 박스는 눌러도 아무 데도 가지 않아요. 증강 박스는 마우스를 올리거나 누르면 증강 카드가 떠요.
 */
export default function TagMentionChip({ kind, id, label }: Props) {
  const champions = useChampions()
  const augments = useAugments()
  const champion = kind === 'champion' ? champions.data?.find((c) => c.id === id) : undefined
  const augment = kind === 'augment' ? augments.data?.find((a) => a.id === id) : undefined

  const look = augment ? AUGMENT_BOX[augment.rarity] : 'border-line-soft bg-ice'
  const box = (
    <span
      data-mention-box=""
      className={`mx-px inline-flex h-[26px] items-center gap-[5px] rounded-mark border pr-2 pl-0.5 align-middle whitespace-nowrap ${look}`}
    >
      {champion?.imageUrl && <img src={champion.imageUrl} alt="" className="h-5 w-5 flex-none rounded-full" />}
      {augment?.iconUrl && (
        <AugmentIcon
          src={augment.iconUrl}
          rarity={augment.rarity}
          tinted={augment.iconTinted}
          className="h-5 w-5 flex-none rounded-mark bg-night"
        />
      )}
      <span className="text-[15px] leading-none font-bold text-ink">{label}</span>
    </span>
  )
  if (kind !== 'augment') return box
  return (
    <AugmentHoverCard augmentId={id} label={label}>
      {box}
    </AugmentHoverCard>
  )
}
