import type { TagSort } from '../../lib/tagSearch'
import SearchInput from '../ui/SearchInput'
import Segmented from '../ui/Segmented'

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

/** 목록 위의 이름 검색칸(대부분 이름으로 찾아서 가장 넓게)과 정렬. 휴대폰은 검색칸이 한 줄 전체예요. */
export default function TagToolbar({ query, onQueryChange, sort, onSortChange, placeholder }: Props) {
  return (
    <div className="mb-6 flex flex-wrap items-center gap-2 sm:gap-3">
      <SearchInput
        label="이름 검색"
        placeholder={placeholder}
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        wrapperClassName="min-w-0 basis-full sm:min-w-[220px] sm:basis-0 sm:flex-1"
      />
      <Segmented options={SORTS} value={sort} onChange={onSortChange} label="목록 정렬" />
    </div>
  )
}
