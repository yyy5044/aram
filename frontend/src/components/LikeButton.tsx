import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { ApiError } from '../api/client'
import { useMe } from '../api/me'
import { likePost, unlikePost } from '../api/posts'
import { useToast } from './toastContext'
import { buttonClass } from './ui/button'

type Props = { postId: number; likeCount: number; likedByMe: boolean }

/** 추천 버튼. 누르면 바로 바뀌고, 실패하면 원래대로 돌아가요. 글을 다시 불러와 값이 바뀌면 그 값을 따라가요. */
export default function LikeButton({ postId, likeCount, likedByMe }: Props) {
  const { data: me } = useMe()
  const toast = useToast()
  const queryClient = useQueryClient()
  const [state, setState] = useState({ likeCount, likedByMe })
  const [shown, setShown] = useState({ likeCount, likedByMe })
  if (shown.likeCount !== likeCount || shown.likedByMe !== likedByMe) {
    setShown({ likeCount, likedByMe })
    setState({ likeCount, likedByMe })
  }
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
      className={`${buttonClass(state.likedByMe ? 'gold' : 'goldLine', 48)} min-w-36`}
    >
      <span aria-hidden="true" className="h-[9px] w-3 bg-current [clip-path:polygon(50%_0,100%_100%,0_100%)]" />
      추천 <span className="tabular-nums">{state.likeCount}</span>
    </button>
  )
}
