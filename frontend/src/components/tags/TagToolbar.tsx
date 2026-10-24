import type { TagSort } from '../../lib/tagSearch'

type Props = {
  query: string
  onQueryChange: (query: string) => void
  sort: TagSort
  onSortChange: (sort: TagSort) => void
  placeholder: string
}

const SORTS: { value: TagSort; label: string }[] = [
  { value: 'name', label: '가나다순' },
  { value: 'count', label: '글 많은 순' },
]

/** 목록 위의 이름 검색칸과 정렬 버튼. */
export default function TagToolbar({ query, onQueryChange, sort, onSortChange, placeholder }: Props) {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-2">
      <input
        type="search"
        aria-label="이름 검색"
        placeholder={placeholder}
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        className="min-w-44 flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-amber-300 focus:outline-none"
      />
      {SORTS.map((s) => (
        <button
          key={s.value}
          type="button"
          aria-pressed={sort === s.value}
          onClick={() => onSortChange(s.value)}
          className={
            sort === s.value
              ? 'rounded-full border border-amber-300 bg-slate-900 px-3 py-1 text-sm text-slate-100'
              : 'rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-sm text-slate-400 hover:text-slate-100'
          }
        >
          {s.label}
        </button>
      ))}
    </div>
  )
}
