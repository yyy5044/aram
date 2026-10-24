import { useSearchParams } from 'react-router'
import { ApiError } from '../../api/client'
import { useUserComments, useUserPosts, useUserScraps } from '../../api/profile'
import type { Profile } from '../../api/types'
import Pagination from '../Pagination'
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
    if (next.page) p.set('page', String(next.page))
    setParams(p)
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'posts', label: `쓴 글 ${stats.postCount}` },
    { key: 'comments', label: `쓴 댓글 ${stats.commentCount}` },
    { key: 'scraps', label: `스크랩 ${stats.scrapCount}` },
  ]

  return (
    <section>
      <div role="tablist" className="mb-1 flex gap-1 border-b border-slate-800">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => go({ tab: t.key })}
            className={
              tab === t.key
                ? '-mb-px border-b-2 border-amber-300 px-3.5 py-2 text-sm font-bold text-slate-100'
                : '-mb-px border-b-2 border-transparent px-3.5 py-2 text-sm text-slate-400 hover:text-slate-200'
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      {active.error && (
        <p className="py-10 text-center text-rose-400">
          {active.error instanceof ApiError ? active.error.message : '잠시 후 다시 시도해주세요'}
        </p>
      )}
      {active.data && active.data.items.length === 0 && (
        <p className="py-12 text-center text-slate-400">{EMPTY[tab]}</p>
      )}
      {tab === 'comments'
        ? comments.data &&
          comments.data.items.length > 0 && (
            <ul>
              {comments.data.items.map((c) => (
                <MyCommentItem key={c.id} comment={c} />
              ))}
            </ul>
          )
        : (tab === 'posts' ? posts.data : scraps.data) &&
          (tab === 'posts' ? posts.data! : scraps.data!).items.length > 0 && (
            <ul>
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
