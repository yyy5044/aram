import { ApiError } from '../../api/client'
import { useTopAugments } from '../../api/gamedata'
import TagChip from '../ui/TagChip'

/** 이 챔피언 글에 함께 태그된 증강을 많이 쓰인 순으로. 금색 숫자는 함께 쓴 글 수, 누르면 증강 탭에서 그 증강이 펼쳐져요. */
export default function TopAugments({ championId }: { championId: string }) {
  const { data, error } = useTopAugments(championId)
  if (error) {
    return (
      <p className="mb-3 text-[13px] text-danger">
        <span className="mr-1 text-ink-2">자주 함께 쓰는 증강</span>
        <span>{error instanceof ApiError ? error.message : '잠시 후 다시 시도해주세요'}</span>
      </p>
    )
  }
  if (!data || data.length === 0) return null
  return (
    <div className="mb-2">
      <h3 className="mb-2 text-[15px] font-bold text-ink-2">자주 함께 쓰는 증강</h3>
      <div className="flex flex-wrap gap-1.5">
        {data.map(({ augment, postCount }) => (
          <TagChip
            key={augment.id}
            kind="augment"
            id={augment.id}
            nameKo={augment.nameKo}
            imageUrl={augment.iconUrl}
            rarity={augment.rarity}
            tinted={augment.iconTinted}
            size="sm"
            to={`/augments?open=${encodeURIComponent(augment.id)}`}
            extra={
              <>
                {' '}
                <em className="font-bold text-gold-deep not-italic tabular-nums">{postCount}</em>
              </>
            }
          />
        ))}
      </div>
    </div>
  )
}
