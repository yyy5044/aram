import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Me } from '../api/types'
import { meMinsu } from '../test/fixtures'
import { json, mockApi, type MockRoutes } from '../test/mockApi'
import { renderWithProviders } from '../test/render'
import ScrapButton from './ScrapButton'

afterEach(() => vi.unstubAllGlobals())

function setup(me: Me | null, extra: MockRoutes = {}) {
  const api = mockApi({ 'GET /api/me': () => json(me), ...extra })
  renderWithProviders(<ScrapButton postId={5} scrappedByMe={false} />, { path: '/posts/:postId', route: '/posts/5' })
  return api
}

describe('ScrapButton', () => {
  it('scraps and unscraps', async () => {
    const api = setup(meMinsu, {
      'PUT /api/posts/5/scrap': () => json({ scrappedByMe: true }),
      'DELETE /api/posts/5/scrap': () => json({ scrappedByMe: false }),
    })
    await userEvent.click(await screen.findByRole('button', { name: '☆ 스크랩' }))
    expect(await screen.findByRole('button', { name: '★ 스크랩됨' })).toHaveAttribute('aria-pressed', 'true')
    await userEvent.click(screen.getByRole('button', { name: '★ 스크랩됨' }))
    expect(await screen.findByRole('button', { name: '☆ 스크랩' })).toHaveAttribute('aria-pressed', 'false')
    expect(api.find('PUT', '/api/posts/5/scrap')).toHaveLength(1)
    expect(api.find('DELETE', '/api/posts/5/scrap')).toHaveLength(1)
  })

  it('reverts and toasts on failure', async () => {
    setup(meMinsu, {
      'PUT /api/posts/5/scrap': () => json({ code: 'INTERNAL_ERROR', message: '잠시 후 다시 시도해주세요' }, 500),
    })
    await userEvent.click(await screen.findByRole('button', { name: '☆ 스크랩' }))
    expect(await screen.findByRole('status')).toHaveTextContent('잠시 후 다시 시도해주세요')
    expect(screen.getByRole('button', { name: '☆ 스크랩' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('asks anonymous users to log in', async () => {
    const api = setup(null)
    await userEvent.click(await screen.findByRole('button', { name: '☆ 스크랩' }))
    expect(await screen.findByRole('status')).toHaveTextContent('로그인이 필요해요')
    expect(api.find('PUT', '/api/posts/5/scrap')).toHaveLength(0)
  })
})
