import { Link } from 'react-router'
import type { PostListItem as Item } from '../api/types'
import { relativeTime } from '../lib/relativeTime'
import AugmentIcon from './augment/AugmentIcon'

/**
 * 목록 한 줄: 추천 수, 제목, 챔피언·증강 아이콘, 패치, 글쓴이, 시간, 댓글 수.
 * compact면 태그 아이콘 없이 한 줄로 줄여요(증강 카드 아래 목록).
 */
export default function PostListItem({ post, compact = false }: { post: Item; compact?: boolean }) {
  if (compact) {
    return (
      <li className="flex items-center gap-3 border-b border-slate-800 px-3 py-2.5 text-sm last:border-b-0">
        <span className="w-9 flex-none text-center font-extrabold text-amber-300">
          <span aria-hidden="true">▲ </span>
          {post.likeCount}
        </span>
        <Link to={`/posts/${post.id}`} className="min-w-0 flex-1 truncate font-semibold text-slate-100 hover:underline">
          {post.title}
        </Link>
        <span className="rounded-md border border-emerald-900 bg-emerald-950 px-1.5 text-xs font-bold text-emerald-400">
          {post.gamePatch}
        </span>
        <span className="hidden flex-none text-xs text-slate-400 sm:inline">
          <Link to={`/users/${post.author.id}`} className="hover:text-slate-100 hover:underline">
            {post.author.nickname}
          </Link>
          {' · '}
          {relativeTime(post.createdAt)}
        </span>
        <span className="flex-none text-xs text-slate-400" aria-label={`댓글 ${post.commentCount}개`}>
          💬 {post.commentCount}
        </span>
      </li>
    )
  }
  return (
    <li className="flex gap-4 border-b border-slate-800 px-1 py-3.5 last:border-b-0">
      <div className="w-10 flex-none pt-0.5 text-center font-extrabold text-amber-300">
        <span aria-hidden="true">▲ </span>
        <span>{post.likeCount}</span>
        <span className="block text-[11px] font-normal text-slate-500">추천</span>
      </div>
      <div className="min-w-0 flex-1">
        <Link to={`/posts/${post.id}`} className="mb-1.5 block font-semibold break-words text-slate-100 hover:underline">
          {post.title}
        </Link>
        {(post.champions.length > 0 || post.augments.length > 0) && (
          <div className="mb-1.5 flex flex-wrap gap-1">
            {post.champions.map((c) =>
              c.imageUrl ? (
                <img
                  key={c.id}
                  src={c.imageUrl}
                  alt={c.nameKo}
                  title={c.nameKo}
                  className="h-6 w-6 rounded-full border border-slate-700"
                />
              ) : (
                <span key={c.id} className="text-xs text-slate-400">
                  {c.nameKo}
                </span>
              ),
            )}
            {post.augments.map((a) => (
              <AugmentIcon
                key={a.id}
                src={a.iconUrl}
                rarity={a.rarity}
                tinted={a.iconTinted}
                alt={a.nameKo}
                className="h-6 w-6 rounded-md border border-slate-700 bg-slate-800"
              />
            ))}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
          <span className="rounded-md border border-emerald-900 bg-emerald-950 px-1.5 font-bold text-emerald-400">
            {post.gamePatch}
          </span>
          <Link to={`/users/${post.author.id}`} className="hover:text-slate-100 hover:underline">
            {post.author.nickname}
          </Link>
          <span>{relativeTime(post.createdAt)}</span>
          <span aria-label={`댓글 ${post.commentCount}개`}>💬 {post.commentCount}</span>
        </div>
      </div>
    </li>
  )
}
