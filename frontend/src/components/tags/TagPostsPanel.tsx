import { useState } from 'react'
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
}

/** 칸 아래로 펼쳐지는 글 목록. 5개씩 보여주고 「더 보기」로 이어 붙여요. */
export default function TagPostsPanel({ kind, id, title, subtitle, onClose }: Props) {
  const [sort, setSort] = useState<PostSort>('latest')
  const { data, error, isPending, hasNextPage, fetchNextPage, isFetchingNextPage } = useTagPosts({
    sort,
    champion: kind === 'champion' ? id : undefined,
    augment: kind === 'augment' ? id : undefined,
  })
  const posts = data?.pages.flatMap((p) => p.items) ?? []
  const total = data?.pages[0]?.totalItems ?? 0

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
        {total > 0 && <SortPills value={sort} onChange={setSort} />}
        <button
          type="button"
          aria-label="닫기"
          onClick={onClose}
          className="-mr-1 mb-2 rounded px-1.5 text-slate-400 hover:text-slate-100"
        >
          ✕
        </button>
      </div>
      {kind === 'champion' && <TopAugments championId={id} />}
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
        <ul>
          {posts.map((post) => (
            <PostListItem key={post.id} post={post} />
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
          더 보기 ({total - posts.length}개 남음)
        </button>
      )}
    </section>
  )
}
