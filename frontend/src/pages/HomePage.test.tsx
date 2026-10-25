import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { listItem, page } from '../test/fixtures'
import { json, mockApi } from '../test/mockApi'
import { renderWithProviders } from '../test/render'
import HomePage from './HomePage'

afterEach(() => vi.unstubAllGlobals())

describe('HomePage', () => {
  it('lists posts with tags, patch, author, time, and counts', async () => {
    mockApi({ 'GET /api/posts': () => json(page([listItem()])) })
    renderWithProviders(<HomePage />)

    const link = await screen.findByRole('link', { name: '아무무는 이 증강 두 개면 한타 지배합니다' })
    expect(link).toHaveAttribute('href', '/posts/1')
    expect(screen.getByRole('heading', { level: 1, name: '전체 글' })).toBeInTheDocument()
    expect(screen.getByText('글 1개')).toBeInTheDocument()
    expect(screen.getByText('아무무')).toBeInTheDocument()
    expect(screen.getByText('하체 운동의 날')).toBeInTheDocument()
    expect(screen.getByText('26.21')).toBeInTheDocument()
    expect(screen.getByText('양호')).toBeInTheDocument()
    expect(screen.getByText('2시간 전')).toBeInTheDocument()
    expect(screen.getByText('24')).toBeInTheDocument()
    expect(screen.getByText('댓글 8')).toBeInTheDocument()
  })

  it('offers the first page when the page number is past the end', async () => {
    const api = mockApi({
      'GET /api/posts': (req) =>
        json(req.query.get('page') === '1' ? page([listItem()]) : page([], { page: 9, totalItems: 1, totalPages: 1 })),
    })
    const { router } = renderWithProviders(<HomePage />, { route: '/?page=9' })
    expect(await screen.findByText('이 페이지는 비어 있어요')).toBeInTheDocument()
    expect(screen.queryByText(/아직 글이 없어요/)).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: '첫 페이지로' }))
    expect(await screen.findByText('26.21')).toBeInTheDocument()
    expect(router.state.location.search).toBe('')
    expect(api.find('GET', '/api/posts').at(-1)!.query.get('page')).toBe('1')
  })

  it('requests latest first by default', async () => {
    const api = mockApi({ 'GET /api/posts': () => json(page([listItem()])) })
    renderWithProviders(<HomePage />)
    await screen.findByText('26.21')
    expect(api.find('GET', '/api/posts')[0].query.get('sort')).toBe('latest')
    expect(api.find('GET', '/api/posts')[0].query.get('page')).toBe('1')
  })

  it('switches to 추천순 and updates the URL', async () => {
    const api = mockApi({ 'GET /api/posts': () => json(page([listItem()])) })
    const { router } = renderWithProviders(<HomePage />)
    await userEvent.click(await screen.findByRole('button', { name: '추천순' }))

    await vi.waitFor(() =>
      expect(api.find('GET', '/api/posts').some((c) => c.query.get('sort') === 'likes')).toBe(true),
    )
    expect(router.state.location.search).toContain('sort=likes')
    expect(screen.getByRole('button', { name: '추천순' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('moves between pages', async () => {
    const api = mockApi({
      'GET /api/posts': (req) =>
        json(page([listItem({ title: `${req.query.get('page')}쪽 글` })], { page: Number(req.query.get('page')), totalPages: 2, totalItems: 21 })),
    })
    renderWithProviders(<HomePage />)
    await userEvent.click(await screen.findByRole('button', { name: '2' }))
    expect(await screen.findByText('2쪽 글')).toBeInTheDocument()
    expect(api.find('GET', '/api/posts').at(-1)?.query.get('page')).toBe('2')
  })

  it('shows the empty state', async () => {
    mockApi({ 'GET /api/posts': () => json(page([])) })
    renderWithProviders(<HomePage />)
    expect(await screen.findByText('아직 글이 없어요. 첫 글을 써보세요')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '글쓰기' })).toHaveAttribute('href', '/write')
  })

  it('shows an error message when loading fails', async () => {
    mockApi({ 'GET /api/posts': () => json({ code: 'INTERNAL_ERROR', message: '잠시 후 다시 시도해주세요' }, 500) })
    renderWithProviders(<HomePage />)
    expect(await screen.findByText('잠시 후 다시 시도해주세요')).toBeInTheDocument()
  })
})
