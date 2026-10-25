import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { json, mockApi, noContent } from '../test/mockApi'
import { renderRoutes, renderWithProviders } from '../test/render'
import Header from './Header'

afterEach(() => {
  vi.unstubAllGlobals()
  sessionStorage.clear()
  localStorage.clear()
})

const me = { id: 1, nickname: '양호', avatarUrl: null, admin: false, suggestedNickname: '양호' }

describe('Header', () => {
  it('shows the ARAM logo linking home', async () => {
    mockApi({ 'GET /api/me': () => json(null) })
    renderWithProviders(<Header />)
    const home = await screen.findByRole('link', { name: 'ARAM' })
    expect(home).toHaveAttribute('href', '/')
    expect(home.querySelector('img')).toHaveAttribute('src', '/logo.png')
  })

  it('shows Discord login and 글쓰기 when logged out', async () => {
    mockApi({ 'GET /api/me': () => json(null) })
    renderWithProviders(<Header />)
    expect(await screen.findByRole('button', { name: '디스코드로 로그인' })).toBeInTheDocument()
    // 로그인 전에도 글쓰기는 같은 자리에 있어요. 누르면 로그인 안내 화면이 나와요.
    expect(screen.getByRole('link', { name: '글쓰기' })).toHaveAttribute('href', '/write')
  })

  it('remembers the current page before going to Discord', async () => {
    mockApi({ 'GET /api/me': () => json(null) })
    const assign = vi.fn()
    vi.stubGlobal('location', { ...window.location, assign })
    renderWithProviders(<Header />, { path: '/posts/:postId', route: '/posts/7' })
    await userEvent.click(await screen.findByRole('button', { name: '디스코드로 로그인' }))
    expect(sessionStorage.getItem('aram.returnTo')).toBe('/posts/7')
    expect(assign).toHaveBeenCalledWith('/oauth2/authorization/discord')
  })

  it('offers a language select that changes the setting', async () => {
    mockApi({ 'GET /api/me': () => json(null) })
    renderWithProviders(<Header />)
    const select = await screen.findByRole('combobox', { name: '언어' })
    expect(select).toHaveValue('ko')
    await userEvent.selectOptions(select, 'en')
    expect(select).toHaveValue('en')
    expect(localStorage.getItem('lang')).toBe('en')
  })

  it('shows my menu button and 글쓰기 when logged in', async () => {
    mockApi({ 'GET /api/me': () => json(me) })
    renderWithProviders(<Header />)
    expect(await screen.findByRole('button', { name: '내 메뉴' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '글쓰기' })).toHaveAttribute('href', '/write')
    expect(screen.getByRole('link', { name: 'ARAM' })).toHaveAttribute('href', '/')
  })

  it('has my nickname, 내 프로필 and 프로필 수정 in the menu, above 로그아웃', async () => {
    mockApi({ 'GET /api/me': () => json(me) })
    renderWithProviders(<Header />)
    await userEvent.click(await screen.findByRole('button', { name: '내 메뉴' }))
    expect(within(screen.getByRole('menu')).getByText('양호')).toBeInTheDocument()
    const items = screen.getAllByRole('menuitem')
    expect(items.map((i) => i.textContent)).toEqual(['내 프로필', '프로필 수정', '로그아웃'])
    expect(items[0]).toHaveAttribute('href', '/users/1')
    expect(items[1]).toHaveAttribute('href', '/settings/profile')
  })

  it.each([
    ['/', '전체 글'],
    ['/augments', '증강'],
    ['/augments/ARAM_LegDay', '증강'],
    ['/champions', '챔피언'],
    ['/champions/Amumu', '챔피언'],
  ])('marks the tab for %s', async (path, tab) => {
    mockApi({ 'GET /api/me': () => json(null) })
    renderRoutes([{ path: '*', element: <Header /> }], path)
    const nav = await screen.findByRole('navigation', { name: '주요 메뉴' })
    expect(within(nav).getByRole('link', { name: tab })).toHaveAttribute('aria-current', 'page')
    const others = within(nav)
      .getAllByRole('link')
      .filter((l) => l.textContent !== tab)
    expect(others).toHaveLength(2)
    for (const other of others) expect(other).not.toHaveAttribute('aria-current')
  })

  it('posts page marks no tab', async () => {
    mockApi({ 'GET /api/me': () => json(null) })
    renderRoutes([{ path: '*', element: <Header /> }], '/posts/1')
    const nav = await screen.findByRole('navigation', { name: '주요 메뉴' })
    for (const link of within(nav).getAllByRole('link')) expect(link).not.toHaveAttribute('aria-current')
  })

  it('logs out from the profile menu', async () => {
    let loggedIn = true
    const api = mockApi({
      'GET /api/me': () => json(loggedIn ? me : null),
      'POST /api/logout': () => {
        loggedIn = false
        return noContent()
      },
    })
    renderWithProviders(<Header />)
    await userEvent.click(await screen.findByRole('button', { name: '내 메뉴' }))
    await userEvent.click(screen.getByRole('menuitem', { name: '로그아웃' }))
    expect(await screen.findByRole('button', { name: '디스코드로 로그인' })).toBeInTheDocument()
    expect(api.find('POST', '/api/logout')).toHaveLength(1)
  })
})
