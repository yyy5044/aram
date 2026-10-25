import { Navigate, Outlet, useLocation } from 'react-router'
import { useMe } from '../api/me'
import Header from './Header'
import WriteFab from './WriteFab'

/** 모든 화면의 틀. 닉네임을 아직 안 정한 사용자는 /welcome으로 보내요. */
export default function AppLayout() {
  const { data: me } = useMe()
  const location = useLocation()
  if (me && me.nickname === null && location.pathname !== '/welcome') {
    return <Navigate to="/welcome" replace />
  }
  return (
    <div className="min-h-screen bg-ice text-ink">
      <Header />
      {/* 폭은 화면마다 정해요(목록 1120, 글·폼 768). 좁은 화면은 떠 있는 글쓰기 버튼이 마지막 줄을 가리지 않게 아래를 더 비워요. */}
      <main className="pt-8 pb-12 max-lg:pb-24">
        <Outlet />
      </main>
      <WriteFab />
    </div>
  )
}
