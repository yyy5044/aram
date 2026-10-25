import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { ApiError } from '../api/client'
import { useMe } from '../api/me'
import { scrapPost, unscrapPost } from '../api/posts'
import { useToast } from './toastContext'

type Props = { postId: number; scrappedByMe: boolean }

/** 스크랩 버튼. 누르면 바로 바뀌고, 실패하면 원래대로 돌아가요. 글을 다시 불러와 값이 바뀌면 그 값을 따라가요. 스크랩한 글은 내 프로필의 스크랩 탭에 모여요. */
export default function ScrapButton({ postId, scrappedByMe }: Props) {
  const { data: me } = useMe()
  const toast = useToast()
  const queryClient = useQueryClient()
  const [scrapped, setScrapped] = useState(scrappedByMe)
  const [shown, setShown] = useState(scrappedByMe)
  if (shown !== scrappedByMe) {
    setShown(scrappedByMe)
    setScrapped(scrappedByMe)
  }
  const [busy, setBusy] = useState(false)

  async function toggle() {
    if (!me) {
      toast.show('로그인이 필요해요')
      return
    }
    if (busy) return
    const before = scrapped
    setScrapped(!before)
    setBusy(true)
    try {
      const result = before ? await unscrapPost(postId) : await scrapPost(postId)
      setScrapped(result.scrappedByMe)
      void queryClient.invalidateQueries({ queryKey: ['profile'] })
    } catch (e) {
      setScrapped(before)
      toast.show(e instanceof ApiError ? e.message : '잠시 후 다시 시도해주세요')
    } finally {
      setBusy(false)
    }
  }

  return (
    <button
      type="button"
      aria-pressed={scrapped}
      onClick={toggle}
      className={
        scrapped
          ? 'rounded-full border border-sky-400 bg-sky-400 px-5 py-2 font-extrabold text-slate-900'
          : 'rounded-full border border-sky-400 px-5 py-2 font-extrabold text-sky-400 hover:bg-sky-400/10'
      }
    >
      {scrapped ? '★ 스크랩됨' : '☆ 스크랩'}
    </button>
  )
}
