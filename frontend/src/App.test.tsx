import { screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { appRoutes } from './routes'
import { json, mockApi } from './test/mockApi'
import { renderRoutes } from './test/render'

afterEach(() => {
  vi.unstubAllGlobals()
  sessionStorage.clear()
})

describe('App routing', () => {
  it('redirects to /welcome when nickname is missing', async () => {
    mockApi({
      'GET /api/me': () => json({ id: 1, nickname: null, avatarUrl: null, admin: false, suggestedNickname: '양호' }),
    })
    const { router } = renderRoutes(appRoutes, '/')
    expect(await screen.findByRole('heading', { name: '닉네임 정하기' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/welcome')
  })

  it('auth done page returns to the remembered page', async () => {
    sessionStorage.setItem('aram.returnTo', '/write')
    mockApi({ 'GET /api/me': () => json({ id: 1, nickname: '양호', avatarUrl: null, admin: false, suggestedNickname: '양호' }) })
    const { router } = renderRoutes(appRoutes, '/auth/done')
    await vi.waitFor(() => expect(router.state.location.pathname).toBe('/write'))
  })

  it('shows not found for unknown pages', async () => {
    mockApi({ 'GET /api/me': () => json(null) })
    renderRoutes(appRoutes, '/nope')
    expect(await screen.findByText('페이지를 찾을 수 없어요')).toBeInTheDocument()
  })
})
