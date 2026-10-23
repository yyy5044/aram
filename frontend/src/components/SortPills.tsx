import type { PostSort } from '../api/posts'

const OPTIONS: { value: PostSort; label: string }[] = [
  { value: 'latest', label: '최신순' },
  { value: 'likes', label: '추천순' },
]

export default function SortPills({ value, onChange }: { value: PostSort; onChange: (sort: PostSort) => void }) {
  return (
    <div className="mb-2 flex gap-2">
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={
            value === o.value
              ? 'rounded-full border border-amber-300 bg-slate-900 px-3 py-1 text-sm text-slate-100'
              : 'rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-sm text-slate-400 hover:text-slate-100'
          }
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
