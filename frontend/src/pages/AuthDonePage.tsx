import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { meKey } from '../api/me'
import { useToast } from '../components/toastContext'
import { consumeReturnTo } from '../lib/returnTo'

/** 디스코드 로그인 직후 거쳐가는 화면. 로그인 전에 보던 곳으로 돌려보내요. 로그인이 실패했으면(?error) 안내도 띄워요. */
export default function AuthDonePage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const toast = useToast()
  const failed = useSearchParams()[0].has('error')
  // 개발 모드에서는 효과가 두 번 실행돼요. 돌아갈 주소는 한 번만 꺼내야 해요.
  const handled = useRef(false)

  useEffect(() => {
    if (handled.current) return
    handled.current = true
    void queryClient.invalidateQueries({ queryKey: meKey })
    if (failed) toast.show('디스코드 로그인을 마치지 못했어요. 다시 시도해주세요')
    navigate(consumeReturnTo(), { replace: true })
  }, [navigate, queryClient, toast, failed])

  return null
}
