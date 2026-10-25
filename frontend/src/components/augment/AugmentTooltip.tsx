import type { AugmentRarity, AugmentText } from '../../api/types'
import { parseDescription } from '../../lib/augmentDescription'
import AugmentIcon from './AugmentIcon'

const RARITY_LABELS: Record<'ko' | 'other', Record<AugmentRarity, string>> = {
  ko: { SILVER: '실버 증강', GOLD: '골드 증강', PRISMATIC: '프리즘 증강' },
  other: { SILVER: 'Silver augment', GOLD: 'Gold augment', PRISMATIC: 'Prismatic augment' },
}

/** 밤하늘 바탕 위에서 읽히는 밝은 등급 색. */
const RARITY_TEXT: Record<AugmentRarity, string> = {
  SILVER: 'text-silver',
  GOLD: 'text-gold-rarity',
  PRISMATIC: 'text-prismatic',
}

/** 설명 상자 바깥 모양. 받는 중·오류 안내도 같은 상자에 담아요. */
export const TOOLTIP_BOX = 'w-[300px] rounded-mark border border-gold bg-night px-4 py-3 shadow-pop'

type Props = { text: AugmentText; rarity: AugmentRarity; iconUrl: string; iconTinted?: boolean }

/** 본문 증강 박스에 마우스를 올리면 뜨는 작은 설명 상자. 게임의 툴팁처럼 아이콘·이름·등급과 설명만 보여요. */
export default function AugmentTooltip({ text, rarity, iconUrl, iconTinted = false }: Props) {
  return (
    <article aria-label={text.name} className={`${TOOLTIP_BOX} select-text`}>
      <div className="flex items-center gap-3">
        <AugmentIcon
          src={iconUrl}
          rarity={rarity}
          tinted={iconTinted}
          frame="ring"
          className="h-9 w-9 flex-none rounded-mark bg-night-2"
        />
        <div className="min-w-0">
          <p className="text-[17px] leading-tight font-bold break-keep text-surface">{text.name}</p>
          <p className={`mt-0.5 text-[13px] ${RARITY_TEXT[rarity]}`}>
            {RARITY_LABELS[text.locale === 'ko' ? 'ko' : 'other'][rarity]}
          </p>
        </div>
      </div>
      <div className="my-3 h-px bg-gold/40" />
      <p className="text-[15px] leading-relaxed break-keep text-ice">
        {parseDescription(text.description).map((seg, i) =>
          seg.kind === 'break' ? (
            <br key={i} />
          ) : (
            <span
              key={i}
              style={seg.color ? { color: seg.color } : undefined}
              className={seg.italic ? 'italic' : seg.color ? 'font-semibold' : undefined}
            >
              {seg.text}
            </span>
          ),
        )}
      </p>
    </article>
  )
}
