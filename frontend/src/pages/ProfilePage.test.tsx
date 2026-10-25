import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { MyComment, Profile } from '../api/types'
import { listItem, page, profile } from '../test/fixtures'
import { json, mockApi, type MockRoutes } from '../test/mockApi'
import { renderWithProviders } from '../test/render'
import ProfilePage from './ProfilePage'

afterEach(() => vi.unstubAllGlobals())

const comment: MyComment = {
  id: 11,
  content: '첫 줄\n둘째 줄',
  createdAt: new Date(Date.now() - 3600_000).toISOString(),
  post: { id: 5, title: '아무무 글' },
}

function setup(p: Profile, extra: MockRoutes = {}, route = '/users/1') {
  const api = mockApi({
    'GET /api/me': () => json(null),
    'GET /api/users/1/profile': () => json(p),
    'GET /api/users/1/posts': () => json(page([listItem({ title: '내가 쓴 글' })])),
    'GET /api/users/1/comments': () => json(page([comment])),
    'GET /api/users/1/scraps': () => json(page([])),
    ...extra,
  })
  const utils = renderWithProviders(<ProfilePage />, { path: '/users/:userId', route })
  return { api, ...utils }
}

describe('ProfilePage', () => {
  it('shows my profile with edit link and public badge', async () => {
    setup(profile({ mine: true }))
    expect(await screen.findByRole('heading', { name: '하포' })).toBeInTheDocument()
    expect(screen.getByText('내 프로필이에요')).toBeInTheDocument()
    expect(screen.getByText('공개')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '프로필 수정' })).toHaveAttribute('href', '/settings/profile')
  })

  it('shows a friend profile without edit controls', async () => {
    setup(profile())
    expect(await screen.findByText('가입 2026.10.24')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: '프로필 수정' })).not.toBeInTheDocument()
    expect(screen.queryByText('공개')).not.toBeInTheDocument()
  })

  it('shows the lock for private profiles', async () => {
    const { api } = setup(profile({ locked: true, profilePublic: false, stats: null, activity: null }))
    expect(await screen.findByText('프로필이 비공개로 설정되었어요')).toBeInTheDocument()
    expect(screen.queryByText('활동')).not.toBeInTheDocument()
    expect(screen.queryByRole('tab')).not.toBeInTheDocument()
    expect(api.find('GET', '/api/users/1/posts')).toHaveLength(0)
  })

  it('shows the private notice to the owner', async () => {
    setup(profile({ mine: true, profilePublic: false }))
    expect(await screen.findByText('비공개 상태예요. 다른 친구에게는 자물쇠만 보여요')).toBeInTheDocument()
    expect(screen.getByText('비공개')).toBeInTheDocument()
    expect(screen.getByText('활동')).toBeInTheDocument()
  })

  it('shows stats under the heatmap', async () => {
    setup(profile())
    expect(await screen.findByText('작성한 글')).toBeInTheDocument()
    expect(screen.getByText('12')).toBeInTheDocument()
    expect(screen.getByText('37')).toBeInTheDocument()
    expect(screen.getByText('2026.10.24')).toBeInTheDocument()
    expect(screen.getByText('최근 1년 동안 1일 활동')).toBeInTheDocument()
  })

  it('lists my posts first and switches tabs via the URL', async () => {
    const { api, router } = setup(profile())
    expect(await screen.findByRole('link', { name: '내가 쓴 글' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: '쓴 글 12' })).toHaveAttribute('aria-selected', 'true')

    await userEvent.click(screen.getByRole('tab', { name: '쓴 댓글 37' }))

    expect(router.state.location.search).toContain('tab=comments')
    expect(await screen.findByRole('link', { name: '「아무무 글」' })).toHaveAttribute('href', '/posts/5')
    expect(screen.getByText(/에 단 댓글/)).toBeInTheDocument()
    expect(api.find('GET', '/api/users/1/comments')[0].query.get('page')).toBe('1')
  })

  it('shows comment text with line breaks', async () => {
    setup(profile(), {}, '/users/1?tab=comments')
    const text = await screen.findByText(/첫 줄/)
    expect(text.textContent).toBe('첫 줄\n둘째 줄')
    expect(text).toHaveClass('whitespace-pre-wrap', 'line-clamp-3')
  })

  it('offers the first page when the tab page is past the end', async () => {
    setup(profile(), { 'GET /api/users/1/posts': (req) =>
      json(req.query.get('page') === '1' ? page([listItem({ title: '내가 쓴 글' })]) : page([], { page: 9, totalItems: 1, totalPages: 1 })),
    }, '/users/1?page=9')
    expect(await screen.findByText('이 페이지는 비어 있어요')).toBeInTheDocument()
    expect(screen.queryByText('아직 쓴 글이 없어요')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: '첫 페이지로' }))
    expect(await screen.findByText('내가 쓴 글')).toBeInTheDocument()
  })

  it('shows empty messages per tab', async () => {
    setup(profile(), {}, '/users/1?tab=scraps')
    expect(await screen.findByText('아직 스크랩한 글이 없어요')).toBeInTheDocument()
  })

  it('shows not found for unknown users', async () => {
    mockApi({
      'GET /api/me': () => json(null),
      'GET /api/users/1/profile': () => json({ code: 'USER_NOT_FOUND', message: '사용자를 찾을 수 없어요' }, 404),
    })
    renderWithProviders(<ProfilePage />, { path: '/users/:userId', route: '/users/1' })
    expect(await screen.findByText('사용자를 찾을 수 없어요')).toBeInTheDocument()
  })
})
