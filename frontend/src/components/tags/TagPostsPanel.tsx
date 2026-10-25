import type { ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router'
import { ApiError } from '../../api/client'
import { useTagPosts, type PostSort } from '../../api/posts'
import PostListItem from '../PostListItem'
import SortPills from '../SortPills'
import { buttonClass } from '../ui/button'
import CornerFrame from '../ui/CornerFrame'
import TopAugments from './TopAugments'

type Props = {
  kind: 'augment' | 'champion' | 'item'
  id: string
  title: string
  subtitle: string
  onClose: () => void
  /** 제목 왼쪽 그림(증강·아이템 아이콘, 챔피언 얼굴 48px). */
  media?: ReactNode
  /** 있으면 부제 옆에 「모아보기 ›」 링크. */
  moreTo?: string
  /** 제목 줄 아래, 글 목록 위에 넣을 내용(증강 카드). */
  children?: ReactNode
  /** 있으면 넓은 화면에서 왼쪽(300px)에 이 내용, 오른쪽에 글 목록을 나란히 둬요. 좁은 화면에서는 글 목록 위예요(아이템 설명 상자). */
  aside?: ReactNode
  /** 있으면 글 목록 위에 이 제목과 정렬 버튼을 두고, 제목 줄에서는 정렬 버튼을 빼요. */
  postsHeading?: string
  /** 글 목록을 한 줄짜리로 보여줘요. */
  compact?: boolean
}

/**
 * 칸 아래로 펼쳐지는 영역(금색 모서리 틀). 글은 5개씩 보여주고 「더 보기」로 이어 붙여요.
 * 정렬은 주소의 ?order=에 남겨요. 창 크기가 바뀌어 펼침 영역이 다른 줄로 옮겨 다시 그려져도 그대로예요.
 */
export default function TagPostsPanel({
  kind,
  id,
  title,
  subtitle,
  onClose,
  media,
  moreTo,
  children,
  aside,
  postsHeading,
  compact = false,
}: Props) {
  const [params, setParams] = useSearchParams()
  const sort: PostSort = params.get('order') === 'likes' ? 'likes' : 'latest'
  function setSort(next: PostSort) {
    const p = new URLSearchParams(params)
    if (next === 'latest') p.delete('order')
    else p.set('order', next)
    setParams(p, { replace: true })
  }
  const { data, error, isPending, hasNextPage, fetchNextPage, isFetchingNextPage } = useTagPosts({
    sort,
    champion: kind === 'champion' ? id : undefined,
    augment: kind === 'augment' ? id : undefined,
    item: kind === 'item' ? id : undefined,
  })
  const posts = data?.pages.flatMap((p) => p.items) ?? []
  const total = data?.pages[0]?.totalItems ?? 0
  // 그 사이 글이 지워지거나 늘 수 있어서, 남은 개수는 마지막으로 받은 페이지의 전체 수로 세요.
  const remaining = Math.max(0, (data?.pages.at(-1)?.totalItems ?? 0) - posts.length)
  const pills = total > 0 && <SortPills value={sort} onChange={setSort} />
  // 옆에 설명 상자가 있으면 넓은 화면에서 글 목록 제목 위 여백을 없애 상자와 위를 맞춰요.
  const postsBlock = (
    <>
      {postsHeading && (
        <div className={`${aside ? 'mt-6 lg:mt-0' : 'mt-6'} mb-3 flex flex-wrap items-center justify-between gap-2`}>
          <h3 className="text-[17px] font-bold text-night">{postsHeading}</h3>
          {pills}
        </div>
      )}
      {error && (
        <p className="py-6 text-center text-danger">{error instanceof ApiError ? error.message : '잠시 후 다시 시도해주세요'}</p>
      )}
      {!error && isPending && <p className="py-6 text-center text-ink-3">불러오는 중이에요</p>}
      {!error && !isPending && total === 0 && (
        <p className="py-6 text-center text-ink-3">아직 이 태그가 붙은 글이 없어요</p>
      )}
      {posts.length > 0 && (
        <ul className={compact ? 'border border-line-soft' : 'flex flex-col gap-2'}>
          {posts.map((post) => (
            <PostListItem key={post.id} post={post} compact={compact} />
          ))}
        </ul>
      )}
      {hasNextPage && (
        <button
          type="button"
          disabled={isFetchingNextPage}
          onClick={() => void fetchNextPage()}
          className={`${buttonClass('ghost', 44)} mt-3 w-full`}
        >
          더 보기 ({remaining}개 남음)
        </button>
      )}
    </>
  )

  return (
    <CornerFrame
      as="section"
      size={16}
      role="region"
      aria-label={`${title} 게시글`}
      className="border border-line bg-surface p-4 sm:p-6"
    >
      <div data-panel-head className="mb-4 flex flex-wrap items-start gap-x-4 gap-y-2">
        {media && <div className="flex-none">{media}</div>}
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-xl leading-snug break-words text-night">{title}</h2>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[13px] text-ink-3">
            <span>{subtitle}</span>
            {moreTo && (
              <Link to={moreTo} className="font-medium text-teal-ink hover:underline">
                모아보기 ›
              </Link>
            )}
          </p>
        </div>
        {!postsHeading && pills}
        <button
          type="button"
          aria-label="닫기"
          onClick={onClose}
          className="grid h-10 w-10 flex-none place-items-center rounded-touch border border-line bg-surface text-ink-2 hover:border-ink-3 hover:text-ink focus-visible:outline-2 focus-visible:outline-teal"
        >
          ✕
        </button>
      </div>
      {children}
      {kind === 'champion' && <TopAugments championId={id} />}
      {aside ? (
        <div className="lg:grid lg:grid-cols-[300px_minmax(0,1fr)] lg:items-start lg:gap-6">
          <div>{aside}</div>
          <div>{postsBlock}</div>
        </div>
      ) : (
        postsBlock
      )}
    </CornerFrame>
  )
}
