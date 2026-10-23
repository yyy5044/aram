import { Navigate, Outlet, useLocation } from 'react-router'
import { useMe } from '../api/me'
import Header from './Header'

/** 모든 화면의 틀. 닉네임을 아직 안 정한 사용자는 /welcome으로 보내요. */
export default function AppLayout() {
  const { data: me } = useMe()
  const location = useLocation()
  if (me && me.nickname === null && location.pathname !== '/welcome') {
    return <Navigate to="/welcome" replace />
  }
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
