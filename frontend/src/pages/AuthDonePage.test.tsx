import { screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { rememberReturnTo } from '../lib/returnTo'
import { json, mockApi } from '../test/mockApi'
import { renderWithProviders } from '../test/render'
import AuthDonePage from './AuthDonePage'

afterEach(() => {
  vi.unstubAllGlobals()
  sessionStorage.clear()
})

function setup(route: string) {
  mockApi({ 'GET /api/me': () => json(null) })
  return renderWithProviders(<AuthDonePage />, { path: '/auth/done', route })
}

describe('AuthDonePage', () => {
  it('returns to the page seen before login', async () => {
    rememberReturnTo('/posts/5')
    setup('/auth/done')
    expect(await screen.findByTestId('location')).toHaveTextContent('/posts/5')
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('tells that login did not finish and returns when Discord login failed', async () => {
    rememberReturnTo('/posts/5')
    setup('/auth/done?error')
    expect(await screen.findByTestId('location')).toHaveTextContent('/posts/5')
    expect(screen.getByRole('status')).toHaveTextContent('디스코드 로그인을 마치지 못했어요')
  })
})
