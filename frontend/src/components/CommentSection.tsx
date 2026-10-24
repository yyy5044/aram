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
    <section className="mt-6">
      <h2 className="mb-2 text-base font-bold">댓글 {comments?.length ?? 0}</h2>
      <ul>
        {comments?.map((c) => (
          <CommentItem key={c.id} comment={c} me={me ?? null} onChanged={refresh} />
        ))}
      </ul>
      {me ? (
        <form onSubmit={submit} className="mt-3">
          <div className="flex gap-2">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="댓글을 입력하세요"
              maxLength={1000}
              rows={2}
              className="min-h-16 flex-1 rounded-lg border border-slate-700 bg-slate-900 p-2.5 text-slate-100"
            />
            <button
              type="submit"
              disabled={sending}
              className="rounded-lg bg-amber-300 px-4 font-bold text-slate-900 disabled:opacity-60"
            >
              등록
            </button>
          </div>
          {error && <p className="mt-1 text-sm text-rose-400">{error}</p>}
        </form>
      ) : (
        <button
          type="button"
          onClick={() => startDiscordLogin(location.pathname + location.search)}
          className="mt-3 w-full rounded-lg border border-slate-700 py-3 text-sm text-slate-300 hover:bg-slate-900"
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
    <li className="flex gap-2.5 border-b border-slate-800 py-2.5">
      <Link to={`/users/${comment.author.id}`} tabIndex={-1} aria-hidden="true" className="flex-none">
        <Avatar src={comment.author.avatarUrl} size={32} />
      </Link>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 text-sm">
          <Link to={`/users/${comment.author.id}`} className="font-bold hover:underline">
            {comment.author.nickname}
          </Link>
          <span className="text-xs text-slate-500">{relativeTime(comment.createdAt)}</span>
          {comment.edited && <span className="text-xs text-slate-500">수정됨</span>}
          <span className="ml-auto flex gap-1.5">
            {mine && !editing && (
              <button type="button" onClick={() => setEditing(true)} className="text-xs text-slate-400 hover:text-slate-100">
                수정
              </button>
            )}
            {canDelete && !editing && (
              <button type="button" onClick={remove} className="text-xs text-slate-400 hover:text-rose-300">
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
              className="w-full rounded-lg border border-slate-700 bg-slate-900 p-2 text-slate-100"
            />
            {error && <p className="text-sm text-rose-400">{error}</p>}
            <div className="mt-1 flex gap-2">
              <button type="button" onClick={save} className="rounded-md bg-amber-300 px-3 py-1 text-sm font-bold text-slate-900">
                저장
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditing(false)
                  setText(comment.content)
                }}
                className="rounded-md border border-slate-700 px-3 py-1 text-sm text-slate-300"
              >
                취소
              </button>
            </div>
          </div>
        ) : (
          <p className="mt-0.5 text-sm break-words whitespace-pre-wrap text-slate-200">{comment.content}</p>
        )}
      </div>
    </li>
  )
}
