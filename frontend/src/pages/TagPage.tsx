import { Link, useParams } from 'react-router'
import { useAugments, useChampions } from '../api/gamedata'
import type { AugmentRarity } from '../api/types'
import AugmentIcon from '../components/augment/AugmentIcon'
import PostList from '../components/PostList'
import NotFoundPage from './NotFoundPage'

type Tag = { name: string; image: string | null; inactive: boolean; tint?: AugmentRarity }

/** 챔피언이나 증강 하나가 붙은 글만 모아서 보여줘요. */
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
    if (a) tag = { name: a.nameKo, image: a.iconUrl, inactive: !a.active, tint: a.iconTinted ? a.rarity : undefined }
  }
  if (!tag) return <NotFoundPage message="찾을 수 없는 태그예요" />
  const found = tag

  return (
    <PostList
      champion={kind === 'champion' ? id : undefined}
      augment={kind === 'augment' ? id : undefined}
      empty={<p className="py-16 text-center text-slate-400">이 태그가 붙은 글이 아직 없어요</p>}
      header={(data) => (
        <div className="mb-3 flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900 px-3 py-2.5">
          {found.image && (
            <AugmentIcon
              src={found.image}
              rarity={found.tint ?? 'SILVER'}
              tinted={found.tint !== undefined}
              className="h-9 w-9 rounded-lg bg-slate-800"
            />
          )}
          <div className="min-w-0">
            <h1 className="flex items-center gap-2 font-bold">
              {found.name}
            </h1>
            {found.inactive && <span className="text-xs text-rose-300">현재 게임에 없음</span>}
            {data && <p className="text-xs text-slate-400">이 태그가 붙은 글 {data.totalItems}개</p>}
          </div>
          <Link to="/" className="ml-auto rounded-md border border-slate-700 px-2 py-1 text-xs text-slate-400">
            ✕ 전체 글 보기
          </Link>
        </div>
      )}
    />
  )
}
