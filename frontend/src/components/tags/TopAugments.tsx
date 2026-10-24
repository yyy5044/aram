import { Link } from 'react-router'
import { ApiError } from '../../api/client'
import { useTopAugments } from '../../api/gamedata'
import AugmentIcon from '../augment/AugmentIcon'

/** 이 챔피언 글에 함께 태그된 증강을 많이 쓰인 순으로. 누르면 증강 탭에서 그 증강이 펼쳐져요. */
export default function TopAugments({ championId }: { championId: string }) {
  const { data, error } = useTopAugments(championId)
  if (error) {
    return (
      <p className="mb-3 text-xs text-rose-400">
        <span className="mr-1 text-slate-400">자주 함께 쓰는 증강</span>
        <span>{error instanceof ApiError ? error.message : '잠시 후 다시 시도해주세요'}</span>
      </p>
    )
  }
  if (!data || data.length === 0) return null
  return (
    <div className="mb-3 flex flex-wrap items-center gap-1.5 text-xs text-slate-400">
      <span className="mr-1">자주 함께 쓰는 증강</span>
      {data.map(({ augment, postCount }) => (
        <Link
          key={augment.id}
          to={`/augments?open=${encodeURIComponent(augment.id)}`}
          className="inline-flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-900 py-0.5 pr-2.5 pl-0.5 text-slate-200 hover:border-amber-300"
        >
          <AugmentIcon
            src={augment.iconUrl}
            rarity={augment.rarity}
            tinted={augment.iconTinted}
            className="h-5 w-5 rounded-full bg-slate-800"
          />
          {augment.nameKo} <span className="text-slate-400">{postCount}</span>
        </Link>
      ))}
    </div>
  )
}
