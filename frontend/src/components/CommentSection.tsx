import { useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Link, useLocation } from 'react-router'
import { ApiError } from '../api/client'
import { addComment, commentsKey, deleteComment, editComment, useComments } from '../api/comments'
import { startDiscordLogin, useMe } from '../api/me'
import { postKey } from '../api/posts'
import type { Comment, Me } from '../api/types'
import { relativeTime } from '../lib/relativeTime'
import Avatar from './Avatar'
import { useToast } from './toastContext'
import { buttonClass } from './ui/button'

function errorText(e: unknown) {
  if (e instanceof ApiError) return e.fieldErrors?.content ?? e.message
  return '잠시 후 다시 시도해주세요'
}

/** 댓글 목록과 입력칸. 오래된 순서로 한 줄씩 보여줘요. */
export default function CommentSection({ postId }: { postId: number }) {
  const { data: me } = useMe()
  const { data: comments } = useComments(postId)
  const queryClient = useQueryClient()
  const location = useLocation()
  const [draft, setDraft] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)

  function refresh() {
    void queryClient.invalidateQueries({ queryKey: commentsKey(postId) })
    void queryClient.invalidateQueries({ queryKey: postKey(postId) })
    void queryClient.invalidateQueries({ queryKey: ['posts', 'list'] })
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSending(true)
    setError(null)
    try {
      await addComment(postId, draft)
      setDraft('')
      refresh()
    } catch (e) {
      setError(errorText(e))
    } finally {
      setSending(false)
    }
  }

  return (
    <section className="mt-12">
      <h2 className="mb-4 text-xl font-bold text-night">
        댓글 <span className="text-gold-deep tabular-nums">{comments?.length ?? 0}</span>
      </h2>
      <ul>
        {comments?.map((c) => (
          <CommentItem key={c.id} comment={c} me={me ?? null} onChanged={refresh} />
        ))}
      </ul>
      {me ? (
        <form onSubmit={submit} className="mt-4">
          <div className="flex gap-2">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="댓글을 입력하세요"
              maxLength={1000}
              rows={2}
              className="min-h-16 min-w-0 flex-1 rounded-touch border border-line bg-white p-3 text-[15px] text-ink placeholder:text-ink-3 focus:border-teal focus:ring-3 focus:ring-teal-hi/20 focus:outline-none"
            />
            <button type="submit" disabled={sending} className={`${buttonClass('primary', 44)} min-w-[88px] self-end`}>
              등록
            </button>
          </div>
          {error && <p className="mt-1 text-sm text-danger">{error}</p>}
        </form>
      ) : (
        <button
          type="button"
          onClick={() => startDiscordLogin(location.pathname + location.search)}
          className={`${buttonClass('ghost', 48)} mt-4 w-full`}
        >
          로그인하고 댓글 달기
        </button>
      )}
    </section>
  )
}

function CommentItem({ comment, me, onChanged }: { comment: Comment; me: Me | null; onChanged: () => void }) {
  const toast = useToast()
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(comment.content)
  const [error, setError] = useState<string | null>(null)
  const mine = me?.id === comment.author.id
  const canDelete = mine || !!me?.admin

  async function save() {
    setError(null)
    try {
      await editComment(comment.id, text)
      setEditing(false)
      onChanged()
    } catch (e) {
      setError(errorText(e))
    }
  }

  async function remove() {
    if (!window.confirm('댓글을 삭제할까요?')) return
    try {
      await deleteComment(comment.id)
      onChanged()
    } catch (e) {
      toast.show(errorText(e))
    }
  }

  return (
    <li className="flex gap-3 border-t border-line-soft py-4">
      <Link to={`/users/${comment.author.id}`} tabIndex={-1} aria-hidden="true" className="flex-none">
        <Avatar src={comment.author.avatarUrl} name={comment.author.nickname} size={36} />
      </Link>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2 text-[13px] text-ink-3">
          <Link to={`/users/${comment.author.id}`} className="text-[15px] font-bold text-ink hover:text-teal-ink">
            {comment.author.nickname}
          </Link>
          <span>{relativeTime(comment.createdAt)}</span>
          {comment.edited && <span>수정됨</span>}
          <span className="ml-auto flex gap-1 self-center">
            {mine && !editing && (
              <button type="button" onClick={() => setEditing(true)} className={buttonClass('quiet')}>
                수정
              </button>
            )}
            {canDelete && !editing && (
              <button type="button" onClick={remove} className={buttonClass('quietDanger')}>
                삭제
              </button>
            )}
          </span>
        </div>
        {editing ? (
          <div className="mt-1.5">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={1000}
              rows={2}
              className="w-full rounded-touch border border-line bg-white p-3 text-[15px] text-ink focus:border-teal focus:ring-3 focus:ring-teal-hi/20 focus:outline-none"
            />
            {error && <p className="text-sm text-danger">{error}</p>}
            <div className="mt-2 flex gap-2">
              <button type="button" onClick={save} className={buttonClass('primary', 40)}>
                저장
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditing(false)
                  setText(comment.content)
                }}
                className={buttonClass('ghost', 40)}
              >
                취소
              </button>
            </div>
          </div>
        ) : (
          <p className="mt-1 text-[15px] break-words whitespace-pre-wrap text-ink">{comment.content}</p>
        )}
      </div>
    </li>
  )
}
