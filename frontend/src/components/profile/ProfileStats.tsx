import type { Profile } from '../../api/types'

type Props = { stats: NonNullable<Profile['stats']> }

/** 잔디 아래 숫자 3칸: 작성한 글, 작성한 댓글, 받은 추천. 가입일은 위쪽 띠에 있어요. */
export default function ProfileStats({ stats }: Props) {
  const items = [
    { value: stats.postCount, label: '작성한 글' },
    { value: stats.commentCount, label: '작성한 댓글' },
    { value: stats.receivedLikeCount, label: '받은 추천' },
  ]
  return (
    <div className="mt-5 grid grid-cols-3 border-t border-line-soft pt-5 text-center">
      {items.map((item) => (
        <div key={item.label} className="[&+div]:border-l [&+div]:border-line-soft">
          <b className="block font-display text-[28px] leading-tight text-night tabular-nums">{item.value}</b>
          <span className="text-[13px] text-ink-3">{item.label}</span>
        </div>
      ))}
    </div>
  )
}
