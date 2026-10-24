import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router'
import { ApiError } from '../api/client'
import { logout, meKey, startDiscordLogin, useMe } from '../api/me'
import Avatar from './Avatar'
import { useToast } from './toastContext'

const TABS = [
  { to: '/', label: '전체 글', end: true },
  { to: '/augments', label: '증강', end: false },
  { to: '/champions', label: '챔피언', end: false },
]

export default function Header() {
  const { data: me, isPending } = useMe()
  const location = useLocation()
  const queryClient = useQueryClient()
  const toast = useToast()
  const [menuOpen, setMenuOpen] = useState(false)

  async function handleLogout() {
    setMenuOpen(false)
    try {
      await logout()
    } catch (e) {
      toast.show(e instanceof ApiError ? e.message : '잠시 후 다시 시도해주세요')
      return
    }
    queryClient.setQueryData(meKey, null)
    await queryClient.invalidateQueries()
  }

  return (
    <header className="border-b border-slate-800 bg-slate-950/80">
      <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3">
        <Link to="/" className="font-extrabold tracking-wide text-amber-300">
          증강 칼바람
        </Link>
        {/* 좁은 화면에서는 탭 줄이 로고·글쓰기 줄 아래로 내려가요. */}
        <nav aria-label="주요 메뉴" className="order-last flex w-full gap-1 min-[480px]:order-none min-[480px]:w-auto">
          {TABS.map(({ to, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `rounded-lg px-2.5 py-1 text-sm ${isActive ? 'bg-slate-800 font-bold text-slate-100' : 'text-slate-400 hover:text-slate-200'}`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>
        <span className="flex-1" />
        {!isPending && !me && (
          <button
            type="button"
            onClick={() => startDiscordLogin(location.pathname + location.search)}
            className="rounded-lg bg-indigo-500 px-3 py-1.5 text-sm font-bold text-white hover:bg-indigo-400"
          >
            디스코드로 로그인
          </button>
        )}
        {me && (
          <>
            <Link
              to="/write"
              className="rounded-lg bg-amber-300 px-3 py-1.5 text-sm font-bold text-slate-900 hover:bg-amber-200"
            >
              글쓰기
            </Link>
            <div className="relative">
              <button
                type="button"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((open) => !open)}
                className="flex items-center gap-2 rounded-lg px-2 py-1 text-sm text-slate-300 hover:bg-slate-800"
              >
                <Avatar src={me.avatarUrl} size={28} />
                <span>{me.nickname ?? '닉네임 없음'}</span>
              </button>
              {menuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 z-10 mt-1 w-32 overflow-hidden rounded-lg border border-slate-700 bg-slate-900 shadow-lg"
                >
                  <Link
                    to={`/users/${me.id}`}
                    role="menuitem"
                    onClick={() => setMenuOpen(false)}
                    className="block w-full px-3 py-2 text-left text-sm text-slate-200 hover:bg-slate-800"
                  >
                    내 프로필
                  </Link>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={handleLogout}
                    className="block w-full px-3 py-2 text-left text-sm text-slate-200 hover:bg-slate-800"
                  >
                    로그아웃
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </header>
  )
}
