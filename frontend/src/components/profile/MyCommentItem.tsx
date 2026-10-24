import { Link } from 'react-router'
import type { MyComment } from '../../api/types'
import { relativeTime } from '../../lib/relativeTime'

/** 쓴 댓글 한 줄: 댓글 내용과 어느 글에 단 댓글인지. */
export default function MyCommentItem({ comment }: { comment: MyComment }) {
  return (
    <li className="border-b border-slate-800 px-1 py-3 last:border-b-0">
      <p className="mb-1.5 line-clamp-3 text-sm break-words whitespace-pre-wrap text-slate-200">{comment.content}</p>
      <p className="text-xs text-slate-400">
        <Link to={`/posts/${comment.post.id}`} className="text-sky-400 hover:underline">
          「{comment.post.title}」
        </Link>
        에 단 댓글 · {relativeTime(comment.createdAt)}
      </p>
    </li>
  )
}
