import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Comment, Me } from '../api/types'
import { meAdmin, meMinsu, meYangho } from '../test/fixtures'
import { json, mockApi, noContent, type MockRoutes } from '../test/mockApi'
import { renderWithProviders } from '../test/render'
import CommentSection from './CommentSection'

afterEach(() => vi.unstubAllGlobals())

const ago = (h: number) => new Date(Date.now() - h * 3600_000).toISOString()

const comments: Comment[] = [
  { id: 11, author: { id: 2, nickname: '민수', avatarUrl: null }, content: '첫 줄\n둘째 줄', createdAt: ago(1), updatedAt: ago(1), edited: false },
  { id: 12, author: { id: 1, nickname: '양호', avatarUrl: null }, content: '내 댓글', createdAt: ago(0.5), updatedAt: ago(0.1), edited: true },
]

function setup(me: Me | null, extra: MockRoutes = {}) {
  const api = mockApi({
    'GET /api/me': () => json(me),
    'GET /api/posts/5/comments': () => json(comments),
    ...extra,
  })
  renderWithProviders(<CommentSection postId={5} />, { path: '/posts/:postId', route: '/posts/5' })
  return api
}

describe('CommentSection', () => {
  it('lists comments with line breaks, count, and edited mark', async () => {
    setup(null)
    expect(await screen.findByRole('heading', { name: '댓글 2' })).toBeInTheDocument()
    const first = await screen.findByText(/첫 줄/)
    expect(first).toHaveClass('whitespace-pre-wrap')
    expect(first.textContent).toBe('첫 줄\n둘째 줄')
    expect(screen.getByText('수정됨')).toBeInTheDocument()
  })

  it('links comment authors to their profiles', async () => {
    setup(null)
    expect(await screen.findByRole('link', { name: '민수' })).toHaveAttribute('href', '/users/2')
  })

  it('shows login button to anonymous users', async () => {
    setup(null)
    expect(await screen.findByRole('button', { name: '로그인하고 댓글 달기' })).toBeInTheDocument()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })

  it('adds a comment and clears the input', async () => {
    const api = setup(meMinsu, {
      'POST /api/posts/5/comments': () =>
        json({ id: 13, author: { id: 2, nickname: '민수', avatarUrl: null }, content: '좋아요', createdAt: ago(0), updatedAt: ago(0), edited: false }, 201),
    })
    const box = await screen.findByPlaceholderText('댓글을 입력하세요')
    await userEvent.type(box, '좋아요')
    await userEvent.click(screen.getByRole('button', { name: '등록' }))
    await vi.waitFor(() => expect(box).toHaveValue(''))
    expect(api.find('POST', '/api/posts/5/comments')[0].body).toEqual({ content: '좋아요' })
  })

  it('shows field error for blank comment', async () => {
    setup(meMinsu, {
      'POST /api/posts/5/comments': () =>
        json({ code: 'INVALID_INPUT', message: '입력값을 확인해주세요', fieldErrors: { content: '댓글을 입력해주세요' } }, 400),
    })
    await userEvent.type(await screen.findByPlaceholderText('댓글을 입력하세요'), '   ')
    await userEvent.click(screen.getByRole('button', { name: '등록' }))
    expect(await screen.findByText('댓글을 입력해주세요')).toBeInTheDocument()
  })

  it('lets the author edit and delete their own comment only', async () => {
    vi.stubGlobal('confirm', vi.fn(() => true))
    const api = setup(meYangho, {
      'PUT /api/comments/12': () => json({ ...comments[1], content: '고친 댓글' }),
      'DELETE /api/comments/12': () => noContent(),
    })
    const mine = (await screen.findByText('내 댓글')).closest('li')!
    const others = (await screen.findByText(/첫 줄/)).closest('li')!
    expect(within(others).queryByRole('button', { name: '수정' })).not.toBeInTheDocument()

    await userEvent.click(within(mine).getByRole('button', { name: '수정' }))
    const editor = within(mine).getByRole('textbox')
    await userEvent.clear(editor)
    await userEvent.type(editor, '고친 댓글')
    await userEvent.click(within(mine).getByRole('button', { name: '저장' }))
    await vi.waitFor(() => expect(api.find('PUT', '/api/comments/12')[0]?.body).toEqual({ content: '고친 댓글' }))

    await userEvent.click(within(mine).getByRole('button', { name: '삭제' }))
    await vi.waitFor(() => expect(api.find('DELETE', '/api/comments/12')).toHaveLength(1))
  })

  it('lets an admin delete any comment but not edit', async () => {
    setup(meAdmin)
    const others = (await screen.findByText(/첫 줄/)).closest('li')!
    expect(within(others).getByRole('button', { name: '삭제' })).toBeInTheDocument()
    expect(within(others).queryByRole('button', { name: '수정' })).not.toBeInTheDocument()
  })
})
