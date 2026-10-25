import { Link, useParams } from 'react-router'
import { useAugments, useChampions, useItems } from '../api/gamedata'
import type { AugmentRarity } from '../api/types'
import AugmentIcon from '../components/augment/AugmentIcon'
import PostList from '../components/PostList'
import { buttonClass } from '../components/ui/button'
import EmptyState from '../components/ui/EmptyState'
import HeroBand from '../components/ui/HeroBand'
import { PenIcon } from '../components/ui/icons'
import { PAGE_WIDE } from '../components/ui/layout'
import { ITEM_TIER_LABEL } from '../lib/itemTiers'
import { parseRouteId } from '../lib/routeId'
import NotFoundPage from './NotFoundPage'

type Tag = {
  name: string
  image: string | null
  inactive: boolean
  rarity?: AugmentRarity
  tinted?: boolean
  /** 아이템이면 단계 이름(머리띠 윗줄). */
  tier?: string
  square?: boolean
}

const RARITY_LABEL: Record<AugmentRarity, string> = { PRISMATIC: '프리즘 증강', GOLD: '골드 증강', SILVER: '실버 증강' }

/** 챔피언·증강·아이템 하나가 붙은 글만 모아서 보여줘요. 위쪽 밤하늘 띠에 지금 무엇의 글인지 크게 보여요. */
export default function TagPage({ kind }: { kind: 'champion' | 'augment' | 'item' }) {
  const { championId, augmentId, itemId } = useParams()
  const id = (kind === 'champion' ? championId : kind === 'augment' ? augmentId : itemId) ?? ''
  const champions = useChampions()
  const augments = useAugments()
  const items = useItems()
  const source = kind === 'champion' ? champions : kind === 'augment' ? augments : items

  if (source.isPending) return null

  let tag: Tag | null = null
  if (kind === 'champion') {
    const c = champions.data?.find((x) => x.id === id)
    if (c) tag = { name: c.nameKo, image: c.imageUrl, inactive: false }
  } else if (kind === 'augment') {
    const a = augments.data?.find((x) => x.id === id)
    if (a) tag = { name: a.nameKo, image: a.iconUrl, inactive: !a.active, rarity: a.rarity, tinted: a.iconTinted }
  } else {
    const it = parseRouteId(id) === null ? undefined : items.data?.find((x) => x.id === id)
    if (it) tag = { name: it.nameKo, image: it.iconUrl, inactive: !it.active, tier: ITEM_TIER_LABEL[it.tier], square: true }
  }
  if (!tag) return <NotFoundPage message={kind === 'item' ? '없는 아이템이에요' : '찾을 수 없는 태그예요'} />
  const found = tag

  const media = found.image ? (
    found.rarity ? (
      <AugmentIcon
        src={found.image}
        rarity={found.rarity}
        tinted={found.tinted}
        frame="image"
        className="h-[72px] w-[72px] rounded-mark bg-night"
      />
    ) : found.square ? (
      <img src={found.image} alt="" className="h-[72px] w-[72px] rounded-mark bg-night-2" />
    ) : (
      <img src={found.image} alt="" className="h-[72px] w-[72px] rounded-full ring-2 ring-gold" />
    )
  ) : (
    <span aria-hidden="true" className="block h-[72px] w-[72px] rounded-mark bg-night-2" />
  )

  return (
    <div className={PAGE_WIDE}>
      <Link
        to={kind === 'champion' ? '/champions' : kind === 'augment' ? '/augments' : '/items'}
        className="mb-4 inline-block text-[13px] text-ink-3 hover:text-ink"
      >
        {kind === 'champion' ? '‹ 챔피언 목록' : kind === 'augment' ? '‹ 증강 목록' : '‹ 아이템 목록'}
      </Link>
      <PostList
        champion={kind === 'champion' ? id : undefined}
        augment={kind === 'augment' ? id : undefined}
        item={kind === 'item' ? id : undefined}
        empty={
          <EmptyState
            title="이 태그가 붙은 글이 아직 없어요"
            action={
              <Link to="/write" className={buttonClass('primary', 44)}>
                <PenIcon className="h-[18px] w-[18px]" />
                글쓰기
              </Link>
            }
          />
        }
        header={(data) => (
          <HeroBand
            media={media}
            eyebrow={found.tier ?? (found.rarity ? RARITY_LABEL[found.rarity] : '챔피언')}
            title={found.name}
            sub={
              <span className="flex flex-wrap items-center gap-x-2">
                {data && <span>이 태그가 붙은 글 {data.totalItems}개</span>}
                {found.inactive && (
                  <span className="rounded-mark border border-[#ffb4a8]/50 px-1.5 text-[#ffb4a8]">현재 게임에 없음</span>
                )}
              </span>
            }
          />
        )}
      />
    </div>
  )
}
