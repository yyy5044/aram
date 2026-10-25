import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router'
import { ApiError } from '../api/client'
import { logout, meKey, startDiscordLogin, useMe } from '../api/me'
import Avatar from './Avatar'
import LanguageSelect from './LanguageSelect'
import { useToast } from './toastContext'
import { buttonClass } from './ui/button'
import { DiscordIcon, PenIcon } from './ui/icons'
import { PAGE_WIDE } from './ui/layout'

const TABS = [
  { to: '/', label: '전체 글', end: true },
  { to: '/augments', label: '증강', end: false },
  { to: '/champions', label: '챔피언', end: false },
  { to: '/items', label: '아이템', end: false },
]

/**
 * 밤하늘 머리말. 1024px 이상은 한 줄(64px), 그보다 좁으면 로고 줄(56px) 아래 메뉴 탭 줄(48px)이에요.
 * 글쓰기는 넓은 화면에서만 여기 있고, 좁은 화면은 오른쪽 아래 떠 있는 버튼(WriteFab)이 맡아요.
 */
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

  const menuItem = 'flex h-11 w-full items-center px-4 text-left text-[15px] hover:bg-ice'

  return (
    <header className="bg-nightsky relative z-20 border-b border-gold shadow-[0_3px_0_-1px_var(--color-night),0_4px_0_-1px_#c8aa6e66]">
      <div className={`${PAGE_WIDE} flex flex-wrap items-center gap-x-2 py-1.5 lg:h-16 lg:flex-nowrap lg:py-0`}>
        <Link to="/" className="mr-2 flex items-center gap-2.5 font-display text-[19px] whitespace-nowrap text-gold-pale lg:mr-6 lg:text-[22px]">
          <img src="/logo.png" alt="" className="h-8 w-8 lg:h-9 lg:w-9" />
          ARAM
        </Link>
        {/* 1024px보다 좁으면(휴대폰·태블릿) 이 메뉴가 로고 줄 아래 한 줄 전체(4등분 탭)로 내려가요. */}
        <nav
          aria-label="주요 메뉴"
          className="order-last -mx-4 mt-1.5 grid basis-[calc(100%+2rem)] grid-cols-4 border-t border-white/10 sm:-mx-6 sm:basis-[calc(100%+3rem)] lg:order-none lg:mx-0 lg:mt-0 lg:flex lg:basis-auto lg:self-stretch lg:border-0"
        >
          {TABS.map(({ to, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `relative flex h-12 items-center justify-center px-4 text-[15px] font-medium whitespace-nowrap lg:h-full ${
                  isActive
                    ? 'text-gold-pale after:absolute after:inset-x-4 after:-bottom-px after:h-[3px] after:bg-gold'
                    : 'text-nav hover:text-white'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>
        <span className="flex-1" />
        <LanguageSelect />
        <div className="hidden lg:block">
          <Link to="/write" className={buttonClass('primary', 44)}>
            <PenIcon className="h-[18px] w-[18px]" />
            글쓰기
          </Link>
        </div>
        {!isPending && !me && (
          <button
            type="button"
            aria-label="디스코드로 로그인"
            onClick={() => startDiscordLogin(location.pathname + location.search)}
            className={buttonClass('discord', 44)}
          >
            <DiscordIcon className="h-5 w-5" />
            <span>
              <span className="hidden lg:inline">디스코드로 </span>로그인
            </span>
          </button>
        )}
        {me && (
          <div className="relative">
            <button
              type="button"
              aria-label="내 메뉴"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
              className="flex h-11 items-center gap-1.5 rounded-touch px-1 text-nav hover:text-white focus-visible:outline-2 focus-visible:outline-gold lg:ml-2"
            >
              <Avatar src={me.avatarUrl} name={me.nickname} size={36} />
              <span aria-hidden="true" className="text-xs">
                ▾
              </span>
            </button>
            {menuOpen && (
              <div
                role="menu"
                className="absolute top-[calc(100%+8px)] right-0 w-[220px] border border-line bg-surface py-1 text-ink shadow-pop"
              >
                <div className="mb-1 border-b border-line-soft px-4 pt-2.5 pb-3">
                  <b className="block truncate text-[15px]">{me.nickname ?? '닉네임 없음'}</b>
                  <span className="text-[13px] text-ink-3">디스코드로 로그인함</span>
                </div>
                <Link to={`/users/${me.id}`} role="menuitem" onClick={() => setMenuOpen(false)} className={menuItem}>
                  내 프로필
                </Link>
                <Link to="/settings/profile" role="menuitem" onClick={() => setMenuOpen(false)} className={menuItem}>
                  프로필 수정
                </Link>
                <button type="button" role="menuitem" onClick={handleLogout} className={`${menuItem} text-danger`}>
                  로그아웃
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  )
}
