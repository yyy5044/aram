import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { ApiError } from '../api/client'
import { useMe } from '../api/me'
import { likePost, unlikePost } from '../api/posts'
import { useToast } from './toastContext'

type Props = { postId: number; likeCount: number; likedByMe: boolean }

/** 추천 버튼. 누르면 바로 바뀌고, 실패하면 원래대로 돌아가요. */
export default function LikeButton({ postId, likeCount, likedByMe }: Props) {
  const { data: me } = useMe()
  const toast = useToast()
  const queryClient = useQueryClient()
  const [state, setState] = useState({ likeCount, likedByMe })
  const [busy, setBusy] = useState(false)

  async function toggle() {
    if (!me) {
      toast.show('로그인이 필요해요')
      return
    }
    if (busy) return
    const before = state
    const next = before.likedByMe
      ? { likeCount: before.likeCount - 1, likedByMe: false }
      : { likeCount: before.likeCount + 1, likedByMe: true }
    setState(next)
    setBusy(true)
    try {
      const result = before.likedByMe ? await unlikePost(postId) : await likePost(postId)
      setState(result)
      void queryClient.invalidateQueries({ queryKey: ['posts', 'list'] })
    } catch (e) {
      setState(before)
      toast.show(e instanceof ApiError ? e.message : '잠시 후 다시 시도해주세요')
    } finally {
      setBusy(false)
    }
  }

  return (
    <button
      type="button"
      aria-pressed={state.likedByMe}
      onClick={toggle}
      className={
        state.likedByMe
          ? 'rounded-full border border-amber-300 bg-amber-300 px-6 py-2 font-extrabold text-slate-900'
          : 'rounded-full border border-amber-300 px-6 py-2 font-extrabold text-amber-300 hover:bg-amber-300/10'
      }
    >
      ▲ 추천 {state.likeCount}
    </button>
  )
}
