import type { ReactNode } from 'react'
import { useSearchParams } from 'react-router'
import { ApiError } from '../../api/client'
import { useTagPosts, type PostSort } from '../../api/posts'
import PostListItem from '../PostListItem'
import SortPills from '../SortPills'
import TopAugments from './TopAugments'

type Props = {
  kind: 'augment' | 'champion'
  id: string
  title: string
  subtitle: string
  onClose: () => void
  /** 제목 줄 아래, 글 목록 위에 넣을 내용(증강 카드). */
  children?: ReactNode
  /** 있으면 글 목록 위에 이 제목과 정렬 버튼을 두고, 제목 줄에서는 정렬 버튼을 빼요. */
  postsHeading?: string
  /** 글 목록을 한 줄짜리로 보여줘요. */
  compact?: boolean
}

/**
 * 칸 아래로 펼쳐지는 글 목록. 5개씩 보여주고 「더 보기」로 이어 붙여요.
 * 정렬은 주소의 ?order=에 남겨요. 창 크기가 바뀌어 펼침 영역이 다른 줄로 옮겨 다시 그려져도 그대로예요.
 */
export default function TagPostsPanel({ kind, id, title, subtitle, onClose, children, postsHeading, compact = false }: Props) {
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
  })
  const posts = data?.pages.flatMap((p) => p.items) ?? []
  const total = data?.pages[0]?.totalItems ?? 0
  // 그 사이 글이 지워지거나 늘 수 있어서, 남은 개수는 마지막으로 받은 페이지의 전체 수로 세요.
  const remaining = Math.max(0, (data?.pages.at(-1)?.totalItems ?? 0) - posts.length)
  const pills = total > 0 && <SortPills value={sort} onChange={setSort} />

  return (
    <section
      role="region"
      aria-label={`${title} 게시글`}
      className="rounded-xl border border-amber-300/60 bg-slate-950 px-3.5 py-3"
    >
      <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1">
        <h2 className="font-bold">{title}</h2>
        <span className="text-xs text-slate-400">{subtitle}</span>
        <span className="flex-1" />
        {!postsHeading && pills}
        <button
          type="button"
          aria-label="닫기"
          onClick={onClose}
          className="-mr-1 mb-2 rounded px-1.5 text-slate-400 hover:text-slate-100"
        >
          ✕
        </button>
      </div>
      {children}
      {kind === 'champion' && <TopAugments championId={id} />}
      {postsHeading && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-800 pt-3">
          <h3 className="text-sm font-bold">{postsHeading}</h3>
          {pills}
        </div>
      )}
      {error && (
        <p className="py-6 text-center text-rose-400">
          {error instanceof ApiError ? error.message : '잠시 후 다시 시도해주세요'}
        </p>
      )}
      {!error && isPending && <p className="py-6 text-center text-slate-400">불러오는 중이에요</p>}
      {!error && !isPending && total === 0 && (
        <p className="py-6 text-center text-slate-400">아직 이 태그가 붙은 글이 없어요</p>
      )}
      {posts.length > 0 && (
        <ul className={compact ? 'overflow-hidden rounded-xl border border-slate-800' : undefined}>
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
          className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-900 py-2 text-sm text-slate-200 hover:border-amber-300 disabled:opacity-60"
        >
          더 보기 ({remaining}개 남음)
        </button>
      )}
    </section>
  )
}
