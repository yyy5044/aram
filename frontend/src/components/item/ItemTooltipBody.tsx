import { useItemDetail, useItems } from '../../api/gamedata'
import { useLanguage } from '../../lib/language'
import { TOOLTIP_BOX } from '../augment/AugmentTooltip'
import ItemTooltip from './ItemTooltip'

/** 선택 언어의 아이템 설명 상자. 번역이 없으면 원문을 보여줘요. 재료·상위 아이템은 그림만 보여줘요(눌러도 가지 않아요). */
export default function ItemTooltipBody({ itemId }: { itemId: string }) {
  const { language } = useLanguage()
  const { data, isPending, isError } = useItemDetail(itemId, language)
  const items = useItems().data

  const text = data ? (data.translation ?? data.original) : null
  if (data && text) return <ItemTooltip detail={data} text={text} items={items ?? []} />
  const message = isPending ? '불러오는 중…' : isError ? '아이템 정보를 불러오지 못했어요' : '아직 설명이 없어요'
  return <p className={`${TOOLTIP_BOX} text-center text-[15px] text-nav`}>{message}</p>
}
