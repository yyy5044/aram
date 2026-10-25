import { Link, useParams } from 'react-router'
import { useAugments, useChampions } from '../api/gamedata'
import type { AugmentRarity } from '../api/types'
import AugmentIcon from '../components/augment/AugmentIcon'
import PostList from '../components/PostList'
import { buttonClass } from '../components/ui/button'
import EmptyState from '../components/ui/EmptyState'
import HeroBand from '../components/ui/HeroBand'
import { PenIcon } from '../components/ui/icons'
import { PAGE_WIDE } from '../components/ui/layout'
import NotFoundPage from './NotFoundPage'

type Tag = { name: string; image: string | null; inactive: boolean; rarity?: AugmentRarity; tinted?: boolean }

const RARITY_LABEL: Record<AugmentRarity, string> = { PRISMATIC: '프리즘 증강', GOLD: '골드 증강', SILVER: '실버 증강' }

/** 챔피언이나 증강 하나가 붙은 글만 모아서 보여줘요. 위쪽 밤하늘 띠에 지금 무엇의 글인지 크게 보여요. */
export default function TagPage({ kind }: { kind: 'champion' | 'augment' }) {
  const { championId, augmentId } = useParams()
  const id = (kind === 'champion' ? championId : augmentId) ?? ''
  const champions = useChampions()
  const augments = useAugments()
  const source = kind === 'champion' ? champions : augments

  if (source.isPending) return null

  let tag: Tag | null = null
  if (kind === 'champion') {
    const c = champions.data?.find((x) => x.id === id)
    if (c) tag = { name: c.nameKo, image: c.imageUrl, inactive: false }
  } else {
    const a = augments.data?.find((x) => x.id === id)
    if (a) tag = { name: a.nameKo, image: a.iconUrl, inactive: !a.active, rarity: a.rarity, tinted: a.iconTinted }
  }
  if (!tag) return <NotFoundPage message="찾을 수 없는 태그예요" />
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
    ) : (
      <img src={found.image} alt="" className="h-[72px] w-[72px] rounded-full ring-2 ring-gold" />
    )
  ) : (
    <span aria-hidden="true" className="block h-[72px] w-[72px] rounded-mark bg-night-2" />
  )

  return (
    <div className={PAGE_WIDE}>
      <Link
        to={kind === 'champion' ? '/champions' : '/augments'}
        className="mb-4 inline-block text-[13px] text-ink-3 hover:text-ink"
      >
        {kind === 'champion' ? '‹ 챔피언 목록' : '‹ 증강 목록'}
      </Link>
      <PostList
        champion={kind === 'champion' ? id : undefined}
        augment={kind === 'augment' ? id : undefined}
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
            eyebrow={found.rarity ? RARITY_LABEL[found.rarity] : '챔피언'}
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
