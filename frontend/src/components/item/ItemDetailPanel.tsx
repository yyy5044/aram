import { useItemDetail } from '../../api/gamedata'
import type { Item } from '../../api/types'
import { buildsInto, recipeTree, type RecipeNode } from '../../lib/itemShop'
import { ITEM_TIER_LABEL } from '../../lib/itemTiers'
import { useLanguage } from '../../lib/language'
import { DescriptionText } from '../augment/AugmentTooltip'

type Props = {
  itemId: string
  items: Item[]
  /** 나무의 재료나 만들 수 있는 아이템을 누르면 그 아이템으로 넘어가요. */
  onPick: (id: string) => void
}

function Icon({ item, size }: { item: Item | undefined; size: string }) {
  return item?.iconUrl ? (
    <img src={item.iconUrl} alt="" className={`${size} rounded-mark bg-night-2`} />
  ) : (
    <span aria-hidden="true" className={`${size} block rounded-mark bg-night-2`} />
  )
}

/** 아이콘 아래 가격이 붙은 칸. 지금 상점에 없거나 목록에 없는 아이템이면 흐리게, 누를 수 없게 해요. */
function PickButton({ id, item, onPick }: { id: string; item: Item | undefined; onPick: (id: string) => void }) {
  const usable = item !== undefined && item.active
  return (
    <button
      type="button"
      disabled={!usable}
      aria-label={item ? `${item.nameKo} ${item.priceTotal} 골드` : '알 수 없는 아이템'}
      title={item?.nameKo}
      onClick={() => onPick(id)}
      className="flex flex-col items-center gap-0.5 rounded-mark focus-visible:outline-2 focus-visible:outline-teal enabled:hover:brightness-125 disabled:opacity-50"
    >
      <Icon item={item} size="h-10 w-10" />
      <span aria-hidden="true" className="text-[13px] leading-none text-gold">
        {item?.priceTotal ?? ''}
      </span>
    </button>
  )
}

/** 나무의 한 갈래. 자식들 위로 가로선을 긋고, 칸마다 짧은 세로선으로 부모와 이어요. */
function Branch({ nodes, onPick }: { nodes: RecipeNode[]; onPick: (id: string) => void }) {
  if (nodes.length === 0) return null
  return (
    <>
      <span aria-hidden="true" className="h-3 w-px bg-nav/60" />
      <ul className="flex justify-center">
        {nodes.map((node, i) => (
          <li
            key={i}
            className="relative flex flex-col items-center px-1 pt-3 before:absolute before:top-0 before:left-1/2 before:h-3 before:w-px before:bg-nav/60 after:absolute after:top-0 after:right-0 after:left-0 after:h-px after:bg-nav/60 first:after:left-1/2 last:after:right-1/2"
          >
            <PickButton id={node.id} item={node.item} onPick={onPick} />
            <Branch nodes={node.children} onPick={onPick} />
          </li>
        ))}
      </ul>
    </>
  )
}

/** 고른 아이템: 조합 나무, 만들 수 있는 아이템, 선택 언어의 설명(설계 6.1). 바탕은 게임 설명 상자처럼 밤하늘색이에요. */
export default function ItemDetailPanel({ itemId, items, onPick }: Props) {
  const { language } = useLanguage()
  const detail = useItemDetail(itemId, language)
  const byId = new Map(items.map((it) => [it.id, it]))
  const item = byId.get(itemId)
  const tree = recipeTree(itemId, byId)
  const into = item ? buildsInto(item, byId) : []
  const text = detail.data ? (detail.data.translation ?? detail.data.original) : null

  return (
    <div className="flex flex-col gap-5 text-ice">
      <div role="group" aria-label="조합 나무">
        <p className="mb-3 text-[13px] text-silver">조합 나무</p>
        <div className="flex flex-col items-center overflow-x-auto overflow-y-hidden pb-1">
          <div className="flex flex-col items-center gap-0.5">
            <Icon item={item} size="h-12 w-12 ring-2 ring-gold" />
            <span className="text-[13px] leading-none text-gold">{item?.priceTotal}</span>
            <span className="sr-only">{item?.nameKo}</span>
          </div>
          <Branch nodes={tree.children} onPick={onPick} />
        </div>
      </div>

      {into.length > 0 && (
        <div role="group" aria-label="만들 수 있는 아이템" className="border-t border-gold/30 pt-4">
          <p className="mb-2 text-[13px] text-silver">만들 수 있는 아이템</p>
          <div className="flex flex-wrap gap-2">
            {into.map((it) => (
              <PickButton key={it.id} id={it.id} item={it} onPick={onPick} />
            ))}
          </div>
        </div>
      )}

      <div className="border-t border-gold/30 pt-4">
        <h3 className="text-xl leading-tight font-bold break-keep text-surface">{text?.name ?? item?.nameKo}</h3>
        {item && (
          <p className="mt-1 text-[13px] text-silver">
            {item.priceTotal} 골드 · {ITEM_TIER_LABEL[item.tier]}
          </p>
        )}
        <div className="mt-3">
          {text ? (
            <DescriptionText description={text.description} />
          ) : (
            <p className="text-[15px] text-nav">
              {detail.isPending ? '불러오는 중…' : detail.isError ? '설명을 불러오지 못했어요' : '아직 설명이 없어요'}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
