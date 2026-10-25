import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Me, PostDetail } from '../api/types'
import { amumu, legDay, meAdmin, meMinsu, meYangho } from '../test/fixtures'
import { json, mockApi, noContent, type MockRoutes } from '../test/mockApi'
import { renderWithProviders } from '../test/render'
import PostDetailPage from './PostDetailPage'

afterEach(() => vi.unstubAllGlobals())

function detail(overrides: Partial<PostDetail> = {}): PostDetail {
  return {
    id: 5,
    title: '아무무는 이 증강 두 개면 한타 지배합니다',
    content: {
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: '첫 증강은 ' }, { type: 'text', text: '무조건', marks: [{ type: 'bold' }] }] },
      ],
    },
    gamePatch: '26.21',
    author: { id: 1, nickname: '양호', avatarUrl: null },
    champions: [amumu],
    augments: [legDay],
    items: [],
    likeCount: 24,
    commentCount: 0,
    likedByMe: false,
    scrappedByMe: false,
    createdAt: new Date(Date.now() - 2 * 3600_000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 3600_000).toISOString(),
    edited: false,
    ...overrides,
  }
}

function setup(me: Me | null, post: PostDetail = detail(), extra: MockRoutes = {}) {
  const api = mockApi({
    'GET /api/me': () => json(me),
    'GET /api/posts/5': () => json(post),
    'GET /api/posts/5/comments': () => json([]),
    ...extra,
  })
  const utils = renderWithProviders(<PostDetailPage />, { path: '/posts/:postId', route: '/posts/5' })
  return { api, ...utils }
}

describe('PostDetailPage', () => {
  it.each(['abc', '1.5', '0'])('shows not found for the malformed address /posts/%s', async (id) => {
    const api = mockApi({ 'GET /api/me': () => json(null) })
    renderWithProviders(<PostDetailPage />, { path: '/posts/:postId', route: `/posts/${id}` })
    expect(await screen.findByText('없는 글이에요')).toBeInTheDocument()
    expect(api.calls.filter((c) => c.path.startsWith('/api/posts'))).toHaveLength(0)
  })

  it('renders title, meta, content, and tag chips', async () => {
    setup(null, detail({ edited: true }))
    expect(await screen.findByRole('heading', { name: '아무무는 이 증강 두 개면 한타 지배합니다' })).toBeInTheDocument()
    expect(screen.getByText('26.21')).toBeInTheDocument()
    expect(screen.getByText('양호')).toBeInTheDocument()
    expect(screen.getByText('수정됨')).toBeInTheDocument()
    expect(await screen.findByText('무조건')).toContainHTML('')
    expect((await screen.findByText('무조건')).tagName).toBe('STRONG')
    expect(screen.getByRole('link', { name: /아무무$/ })).toHaveAttribute('href', '/champions/Amumu')
    expect(screen.getByRole('link', { name: /하체 운동의 날/ })).toHaveAttribute('href', '/augments/ARAM_LegDay')
    expect(screen.getByRole('link', { name: '‹ 목록으로' })).toHaveAttribute('href', '/')
  })

  it('links the author nickname to the profile', async () => {
    setup(null)
    expect(await screen.findByRole('link', { name: '양호' })).toHaveAttribute('href', '/users/1')
  })

  it('shows edit and delete only to the author', async () => {
    setup(meYangho)
    expect(await screen.findByRole('link', { name: '수정' })).toHaveAttribute('href', '/posts/5/edit')
    expect(screen.getByRole('button', { name: '삭제' })).toBeInTheDocument()
  })

  it('hides edit and delete from other users', async () => {
    setup(meMinsu)
    await screen.findByRole('heading', { name: '아무무는 이 증강 두 개면 한타 지배합니다' })
    expect(screen.queryByRole('link', { name: '수정' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '삭제' })).not.toBeInTheDocument()
  })

  it('shows only delete to an admin', async () => {
    setup(meAdmin)
    expect(await screen.findByRole('button', { name: '삭제' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: '수정' })).not.toBeInTheDocument()
  })

  it('deletes after confirm and goes home', async () => {
    vi.stubGlobal('confirm', vi.fn(() => true))
    const { api } = setup(meYangho, detail(), { 'DELETE /api/posts/5': () => noContent() })
    await userEvent.click(await screen.findByRole('button', { name: '삭제' }))
    expect(await screen.findByTestId('location')).toHaveTextContent('/')
    expect(api.find('DELETE', '/api/posts/5')).toHaveLength(1)
  })

  it('does not delete when confirm is cancelled', async () => {
    vi.stubGlobal('confirm', vi.fn(() => false))
    const { api } = setup(meYangho, detail(), { 'DELETE /api/posts/5': () => noContent() })
    await userEvent.click(await screen.findByRole('button', { name: '삭제' }))
    expect(api.find('DELETE', '/api/posts/5')).toHaveLength(0)
  })

  it('shows 없는 글이에요 for 404', async () => {
    mockApi({
      'GET /api/me': () => json(null),
      'GET /api/posts/5': () => json({ code: 'POST_NOT_FOUND', message: '글을 찾을 수 없어요' }, 404),
    })
    renderWithProviders(<PostDetailPage />, { path: '/posts/:postId', route: '/posts/5' })
    expect(await screen.findByText('없는 글이에요')).toBeInTheDocument()
  })

  it('toggles like optimistically and reverts on error', async () => {
    setup(meMinsu, detail(), {
      'PUT /api/posts/5/like': () => json({ code: 'INTERNAL_ERROR', message: '잠시 후 다시 시도해주세요' }, 500),
    })
    const button = await screen.findByRole('button', { name: /추천 24/ })
    await userEvent.click(button)
    expect(await screen.findByRole('status')).toHaveTextContent('잠시 후 다시 시도해주세요')
    expect(screen.getByRole('button', { name: /추천 24/ })).toHaveAttribute('aria-pressed', 'false')
  })

  it('shows like and scrap changes made elsewhere when the post reloads', async () => {
    let current = detail()
    const api = mockApi({
      'GET /api/me': () => json(meMinsu),
      'GET /api/posts/5': () => json(current),
      'GET /api/posts/5/comments': () => json([]),
    })
    const { queryClient } = renderWithProviders(<PostDetailPage />, { path: '/posts/:postId', route: '/posts/5' })
    expect(await screen.findByRole('button', { name: /추천 24/ })).toHaveAttribute('aria-pressed', 'false')
    current = detail({ likeCount: 30, likedByMe: true, scrappedByMe: true })
    await queryClient.invalidateQueries({ queryKey: ['posts', 'detail', 5] })
    expect(await screen.findByRole('button', { name: /추천 30/ })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: '★ 스크랩됨' })).toBeInTheDocument()
    expect(api.find('GET', '/api/posts/5').length).toBeGreaterThan(1)
  })

  it('shows the scrap button next to the like button', async () => {
    setup(meMinsu, detail({ scrappedByMe: true }))
    const like = await screen.findByRole('button', { name: /추천 24/ })
    const scrap = screen.getByRole('button', { name: '★ 스크랩됨' })
    expect(like.parentElement).toBe(scrap.parentElement)
    expect(like.compareDocumentPosition(scrap) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('likes and unlikes', async () => {
    setup(meMinsu, detail(), {
      'PUT /api/posts/5/like': () => json({ likeCount: 25, likedByMe: true }),
      'DELETE /api/posts/5/like': () => json({ likeCount: 24, likedByMe: false }),
    })
    await userEvent.click(await screen.findByRole('button', { name: /추천 24/ }))
    expect(await screen.findByRole('button', { name: /추천 25/ })).toHaveAttribute('aria-pressed', 'true')
    await userEvent.click(screen.getByRole('button', { name: /추천 25/ }))
    expect(await screen.findByRole('button', { name: /추천 24/ })).toHaveAttribute('aria-pressed', 'false')
  })

  it('asks anonymous users to log in when liking', async () => {
    const { api } = setup(null)
    await userEvent.click(await screen.findByRole('button', { name: /추천 24/ }))
    expect(await screen.findByRole('status')).toHaveTextContent('로그인이 필요해요')
    expect(api.find('PUT', '/api/posts/5/like')).toHaveLength(0)
  })
})
