import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router'
import { meKey } from '../api/me'
import { consumeReturnTo } from '../lib/returnTo'

/** 디스코드 로그인 직후 거쳐가는 화면. 로그인 전에 보던 곳으로 돌려보내요. */
export default function AuthDonePage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  // 개발 모드에서는 효과가 두 번 실행돼요. 돌아갈 주소는 한 번만 꺼내야 해요.
  const handled = useRef(false)

  useEffect(() => {
    if (handled.current) return
    handled.current = true
    void queryClient.invalidateQueries({ queryKey: meKey })
    navigate(consumeReturnTo(), { replace: true })
  }, [navigate, queryClient])

  return null
}
