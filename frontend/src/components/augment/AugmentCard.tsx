import type { AugmentRarity, AugmentText } from '../../api/types'
import { parseDescription, toPlainText } from '../../lib/augmentDescription'
import { useToast } from '../toastContext'

const SELECTION = 'https://raw.communitydragon.org/latest/game/assets/ux/cherry/augments/augmentselection/'

/** 게임이 쓰는 카드 그림. 512×512 그림 가운데 312px만 카드라서 492px로 키워 좌우 96px씩 잘라 보여요. */
const CARD_ASSETS = {
  background: SELECTION + 'augmentcard_bg.png',
  frame: {
    SILVER: SELECTION + 'augmentcard_frame_silver.png',
    GOLD: SELECTION + 'augmentcard_frame_gold.png',
    PRISMATIC: SELECTION + 'augmentcard_frame_prismatic.png',
  } satisfies Record<AugmentRarity, string>,
}

const RARITY_LABELS: Record<'ko' | 'other', Record<AugmentRarity, string>> = {
  ko: { SILVER: '일반', GOLD: '골드', PRISMATIC: '프리즘' },
  other: { SILVER: 'Silver', GOLD: 'Gold', PRISMATIC: 'Prismatic' },
}

const RARITY_PILL: Record<AugmentRarity, string> = {
  SILVER: 'bg-slate-400 text-slate-900',
  GOLD: 'bg-amber-300 text-amber-950',
  PRISMATIC: 'bg-violet-300 text-violet-950',
}

const OCTAGON = '[clip-path:polygon(29%_0,71%_0,100%_29%,100%_71%,71%_100%,29%_100%,0_71%,0_29%)]'

const BOLTS = ['left-1/2 top-1.5', 'left-1/2 bottom-1.5', 'left-3.5 top-[30%]', 'left-3.5 bottom-[30%]', 'right-3.5 top-[30%]', 'right-3.5 bottom-[30%]']

type Props = { text: AugmentText; rarity: AugmentRarity; iconUrl: string }

/** 게임 카드를 닮은 증강 카드 한 장. 마우스를 올리면 복사 버튼이 나타나요. */
export default function AugmentCard({ text, rarity, iconUrl }: Props) {
  const toast = useToast()
  const label = RARITY_LABELS[text.locale === 'ko' ? 'ko' : 'other'][rarity]

  async function copy() {
    try {
      if (!navigator.clipboard) throw new Error('clipboard unavailable')
      await navigator.clipboard.writeText(toPlainText(text.description))
      toast.show('복사했어요')
    } catch {
      toast.show('복사하지 못했어요')
    }
  }

  return (
    <article
      aria-label={text.name}
      className="group relative h-[492px] w-[300px] flex-none overflow-clip rounded-[14px] select-text"
    >
      <img src={CARD_ASSETS.background} alt="" className="absolute top-0 -left-24 h-[492px] w-[492px] max-w-none" />
      <img src={CARD_ASSETS.frame[rarity]} alt="" className="absolute top-0 -left-24 h-[492px] w-[492px] max-w-none" />
      <button
        type="button"
        aria-label="복사"
        onClick={() => void copy()}
        className="absolute top-4 right-[22px] z-10 flex -translate-y-1.5 items-center gap-1 rounded-lg border border-slate-600 bg-slate-800/90 px-2.5 py-1 text-xs font-semibold text-slate-200 opacity-0 transition duration-200 group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100 hover:bg-slate-700 [@media(hover:none)]:translate-y-0 [@media(hover:none)]:opacity-100"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <rect x="9" y="9" width="13" height="13" rx="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
        복사
      </button>
      <div className="relative z-[1] flex h-full flex-col items-center px-8 pt-[52px] pb-7 text-center">
        <div
          className={`relative grid h-[120px] w-[120px] flex-none place-items-center bg-gradient-to-b from-slate-500 to-slate-700 ${OCTAGON}`}
        >
          <div className={`grid h-[106px] w-[106px] place-items-center bg-[#141922] ${OCTAGON}`}>
            <img src={iconUrl} alt="" className="h-[84px] w-[84px] object-contain" />
          </div>
          {BOLTS.map((pos) => (
            <span
              key={pos}
              aria-hidden="true"
              className={`absolute h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-slate-400 shadow-[inset_0_0_0_1px_#3a414b] ${pos}`}
            />
          ))}
        </div>
        <h2 className="mt-6 mb-2 text-2xl font-bold tracking-tight text-slate-50">{text.name}</h2>
        <span className={`rounded px-2.5 py-0.5 text-xs font-bold tracking-wide ${RARITY_PILL[rarity]}`}>{label}</span>
        <p className="mt-4 min-h-0 flex-1 card-scroll overflow-y-auto pr-1.5 pb-5 text-sm leading-relaxed break-keep text-slate-200">
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
      </div>
    </article>
  )
}
