import { useSearchParams } from 'react-router'
import { ApiError } from '../../api/client'
import { useUserComments, useUserPosts, useUserScraps } from '../../api/profile'
import type { Profile } from '../../api/types'
import Pagination from '../Pagination'
import PastLastPage from '../PastLastPage'
import EmptyState from '../ui/EmptyState'
import PostListItem from '../PostListItem'
import MyCommentItem from './MyCommentItem'

type Tab = 'posts' | 'comments' | 'scraps'

const EMPTY: Record<Tab, string> = {
  posts: '아직 쓴 글이 없어요',
  comments: '아직 쓴 댓글이 없어요',
  scraps: '아직 스크랩한 글이 없어요',
}

/** 쓴 글 · 쓴 댓글 · 스크랩 탭. 선택한 탭과 페이지는 주소(?tab=&page=)에 남아요. */
export default function ProfileTabs({ userId, stats }: { userId: number; stats: NonNullable<Profile['stats']> }) {
  const [params, setParams] = useSearchParams()
  const raw = params.get('tab')
  const tab: Tab = raw === 'comments' || raw === 'scraps' ? raw : 'posts'
  const page = Math.max(1, Number(params.get('page')) || 1)

  const posts = useUserPosts(userId, page, tab === 'posts')
  const comments = useUserComments(userId, page, tab === 'comments')
  const scraps = useUserScraps(userId, page, tab === 'scraps')
  const active = tab === 'posts' ? posts : tab === 'comments' ? comments : scraps

  function go(next: { tab?: Tab; page?: number }) {
    const p = new URLSearchParams(params)
    if (next.tab) {
      p.set('tab', next.tab)
      p.delete('page')
    }
    if (next.page === 1) p.delete('page')
    else if (next.page) p.set('page', String(next.page))
    setParams(p)
  }

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: 'posts', label: '쓴 글', count: stats.postCount },
    { key: 'comments', label: '쓴 댓글', count: stats.commentCount },
    { key: 'scraps', label: '스크랩', count: stats.scrapCount },
  ]

  return (
    <section>
      <div role="tablist" className="mb-4 flex border-b border-line">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => go({ tab: t.key })}
            className={`-mb-px flex h-12 items-center gap-1.5 border-b-[3px] px-4 text-[15px] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-teal sm:px-5 ${
              tab === t.key ? 'border-gold font-bold text-night' : 'border-transparent text-ink-2 hover:text-ink'
            }`}
          >
            {t.label}{' '}
            <span className="text-[13px] font-normal text-ink-3 tabular-nums">{t.count}</span>
          </button>
        ))}
      </div>

      {active.error && (
        <p className="py-10 text-center text-danger">
          {active.error instanceof ApiError ? active.error.message : '잠시 후 다시 시도해주세요'}
        </p>
      )}
      {active.data &&
        active.data.items.length === 0 &&
        (active.data.totalItems > 0 ? (
          <PastLastPage onFirstPage={() => go({ page: 1 })} />
        ) : (
          <EmptyState title={EMPTY[tab]} />
        ))}
      {tab === 'comments'
        ? comments.data &&
          comments.data.items.length > 0 && (
            <ul className="flex flex-col gap-2">
              {comments.data.items.map((c) => (
                <MyCommentItem key={c.id} comment={c} />
              ))}
            </ul>
          )
        : (tab === 'posts' ? posts.data : scraps.data) &&
          (tab === 'posts' ? posts.data! : scraps.data!).items.length > 0 && (
            <ul className="flex flex-col gap-2">
              {(tab === 'posts' ? posts.data! : scraps.data!).items.map((p) => (
                <PostListItem key={p.id} post={p} />
              ))}
            </ul>
          )}
      {active.data && (
        <Pagination page={active.data.page} totalPages={active.data.totalPages} onChange={(p) => go({ page: p })} />
      )}
    </section>
  )
}
