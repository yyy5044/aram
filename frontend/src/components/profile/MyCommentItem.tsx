import { Link } from 'react-router'
import type { MyComment } from '../../api/types'
import { relativeTime } from '../../lib/relativeTime'

/** 쓴 댓글 한 줄: 댓글 내용과 어느 글에 단 댓글인지. */
export default function MyCommentItem({ comment }: { comment: MyComment }) {
  return (
    <li className="border border-line-soft bg-surface px-4 py-3.5">
      <p className="mb-1.5 line-clamp-3 text-[15px] break-words whitespace-pre-wrap text-ink">{comment.content}</p>
      <p className="text-[13px] text-ink-3">
        <Link to={`/posts/${comment.post.id}`} className="font-medium text-teal-ink hover:underline">
          「{comment.post.title}」
        </Link>
        에 단 댓글 · {relativeTime(comment.createdAt)}
      </p>
    </li>
  )
}
