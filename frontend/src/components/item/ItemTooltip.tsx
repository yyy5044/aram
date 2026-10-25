import type { AugmentText, Item, ItemDetail } from '../../api/types'
import { ITEM_TIER_LABEL } from '../../lib/itemTiers'
import { DescriptionText, TOOLTIP_BOX } from '../augment/AugmentTooltip'

type Props = {
  detail: ItemDetail
  text: AugmentText
  items: Item[]
  /** 있으면 재료·상위 아이템 아이콘이 버튼이 되어 그 아이템으로 넘어가요. */
  onPick?: (id: string) => void
}

function ItemIcon({ src, className }: { src: string | null; className: string }) {
  return src ? (
    <img src={src} alt="" className={`${className} rounded-mark bg-night-2`} />
  ) : (
    <span className={`${className} rounded-mark bg-night-2`} />
  )
}

function RecipeRow({ title, ids, byId, onPick }: { title: string; ids: string[]; byId: Map<string, Item>; onPick?: (id: string) => void }) {
  const shown = ids.map((id) => byId.get(id)).filter((it): it is Item => it !== undefined && it.active)
  if (shown.length === 0) return null
  return (
    <div className="mt-3">
      <p className="text-[13px] text-silver">{title}</p>
      <div className="mt-1 flex flex-wrap gap-1">
        {shown.map((it, i) =>
          onPick ? (
            <button key={i} type="button" aria-label={it.nameKo} onClick={() => onPick(it.id)} className="rounded-mark">
              <ItemIcon src={it.iconUrl} className="block h-6 w-6" />
            </button>
          ) : it.iconUrl ? (
            <img key={i} src={it.iconUrl} alt="" title={it.nameKo} className="h-6 w-6 rounded-mark bg-night-2" />
          ) : (
            <span key={i} title={it.nameKo} className="h-6 w-6 rounded-mark bg-night-2" />
          ),
        )}
      </div>
    </div>
  )
}

/** 아이템 설명 상자. 증강 설명 상자와 같은 모양에 가격·묶음, 재료와 상위 아이템 줄이 더 있어요. */
export default function ItemTooltip({ detail, text, items, onPick }: Props) {
  const byId = new Map(items.map((it) => [it.id, it]))
  return (
    <article aria-label={text.name} className={`${TOOLTIP_BOX} select-text`}>
      <div className="flex items-center gap-3">
        <ItemIcon src={detail.iconUrl} className="h-9 w-9 flex-none" />
        <div className="min-w-0">
          <p className="text-[17px] leading-tight font-bold break-keep text-surface">{text.name}</p>
          <p className="mt-0.5 text-[13px] text-silver">
            {detail.priceTotal} 골드 · {ITEM_TIER_LABEL[detail.tier]}
          </p>
        </div>
      </div>
      <div className="my-3 h-px bg-gold/40" />
      <DescriptionText description={text.description} />
      <RecipeRow title="재료" ids={detail.fromIds} byId={byId} onPick={onPick} />
      <RecipeRow title="상위 아이템" ids={detail.intoIds} byId={byId} onPick={onPick} />
    </article>
  )
}
