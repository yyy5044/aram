import type { ReactNode } from 'react'
import { ApiError } from '../../api/client'
import { useAugmentDetail } from '../../api/gamedata'
import type { AugmentRarity, AugmentText } from '../../api/types'
import { languageName, ORIGINAL_LANGUAGE, useLanguage } from '../../lib/language'
import AugmentCard from './AugmentCard'

/** 원문 카드와 번역 카드. 선택 언어가 원문 언어와 같으면 원문 한 장만 보여요. */
export default function AugmentCards({ augmentId }: { augmentId: string }) {
  const { language } = useLanguage()
  const { data, error, isPending } = useAugmentDetail(augmentId, language)

  if (error) {
    return (
      <p className="py-6 text-center text-rose-400">
        {error instanceof ApiError ? error.message : '잠시 후 다시 시도해주세요'}
      </p>
    )
  }
  if (isPending) {
    return <p className="py-6 text-center text-slate-400">불러오는 중이에요</p>
  }

  const showTranslation = language !== ORIGINAL_LANGUAGE
  return (
    <div className="flex flex-wrap justify-center gap-9 py-2">
      <Column tag="원문" name={languageName(ORIGINAL_LANGUAGE)}>
        <CardOrEmpty text={data.original} rarity={data.rarity} iconUrl={data.iconUrl} iconTinted={data.iconTinted} />
      </Column>
      {showTranslation && (
        <Column tag="번역" name={languageName(language)}>
          <CardOrEmpty text={data.translation} rarity={data.rarity} iconUrl={data.iconUrl} iconTinted={data.iconTinted} />
        </Column>
      )}
    </div>
  )
}

function Column({ tag, name, children }: { tag: string; name: string; children: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2.5">
      <div className="flex h-7 items-center gap-2 text-xs text-slate-400">
        <span className="rounded-md bg-slate-800 px-2 py-0.5 font-semibold text-slate-300">{tag}</span>
        <span>{name}</span>
      </div>
      {children}
    </div>
  )
}

function CardOrEmpty({
  text,
  rarity,
  iconUrl,
  iconTinted,
}: {
  text: AugmentText | null
  rarity: AugmentRarity
  iconUrl: string
  iconTinted?: boolean
}) {
  if (text) return <AugmentCard text={text} rarity={rarity} iconUrl={iconUrl} iconTinted={iconTinted} />
  return (
    <div className="grid h-[492px] w-[300px] place-items-center rounded-[14px] border border-dashed border-slate-700 text-sm text-slate-500">
      아직 설명이 없어요
    </div>
  )
}
