import type { PostSort } from '../api/posts'
import Segmented from './ui/Segmented'

const OPTIONS: { value: PostSort; label: string }[] = [
  { value: 'latest', label: '최신순' },
  { value: 'likes', label: '추천순' },
  { value: 'views', label: '조회순' },
]

/** 글 정렬(최신순·추천순·조회순). */
export default function SortPills({ value, onChange }: { value: PostSort; onChange: (sort: PostSort) => void }) {
  return <Segmented options={OPTIONS} value={value} onChange={onChange} label="정렬" />
}
