import type { Profile } from '../../api/types'
import { dottedDate } from '../../lib/date'

type Props = { joinedAt: string; stats: NonNullable<Profile['stats']> }

/** 잔디 아래 통계: 가입일, 작성한 글, 작성한 댓글. */
export default function ProfileStats({ joinedAt, stats }: Props) {
  const items = [
    { value: dottedDate(joinedAt), label: '가입일' },
    { value: String(stats.postCount), label: '작성한 글' },
    { value: String(stats.commentCount), label: '작성한 댓글' },
  ]
  return (
    <div className="mt-3 grid grid-cols-3 gap-2 border-t border-slate-800 pt-3 text-center">
      {items.map((item) => (
        <div key={item.label}>
          <b className="block text-lg">{item.value}</b>
          <span className="text-xs text-slate-400">{item.label}</span>
        </div>
      ))}
    </div>
  )
}
