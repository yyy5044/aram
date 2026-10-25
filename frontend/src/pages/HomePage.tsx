import { Link } from 'react-router'
import PostList from '../components/PostList'
import { buttonClass } from '../components/ui/button'
import EmptyState from '../components/ui/EmptyState'
import { PenIcon } from '../components/ui/icons'
import { PAGE_WIDE } from '../components/ui/layout'

export default function HomePage() {
  return (
    <div className={PAGE_WIDE}>
      <PostList
        header={(data) => (
          <div className="mb-4 flex items-baseline gap-3">
            <h1 className="font-display text-[28px] leading-tight text-night">전체 글</h1>
            {data && <span className="text-[13px] text-ink-3">글 {data.totalItems}개</span>}
          </div>
        )}
        empty={
          <EmptyState
            title="아직 글이 없어요. 첫 글을 써보세요"
            action={
              <Link to="/write" className={buttonClass('primary', 44)}>
                <PenIcon className="h-[18px] w-[18px]" />
                글쓰기
              </Link>
            }
          />
        }
      />
    </div>
  )
}
