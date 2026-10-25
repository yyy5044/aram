import { useAugmentDetail } from '../../api/gamedata'
import { useLanguage } from '../../lib/language'
import AugmentTooltip, { TOOLTIP_BOX } from './AugmentTooltip'

/** 선택 언어의 증강 설명 상자. 번역이 없으면 원문을 보여줘요. */
export default function AugmentTooltipBody({ augmentId }: { augmentId: string }) {
  const { language } = useLanguage()
  const { data, isPending, isError } = useAugmentDetail(augmentId, language)

  const text = data ? (data.translation ?? data.original) : null
  if (data && text) {
    return <AugmentTooltip text={text} rarity={data.rarity} iconUrl={data.iconUrl} iconTinted={data.iconTinted} />
  }
  const message = isPending ? '불러오는 중…' : isError ? '증강 정보를 불러오지 못했어요' : '아직 설명이 없어요'
  // 다 받은 뒤 상자 크기가 바뀌면 autoUpdate가 자리를 다시 잡아요.
  return <p className={`${TOOLTIP_BOX} text-center text-[15px] text-nav`}>{message}</p>
}
