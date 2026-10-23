import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { json, mockApi } from '../test/mockApi'
import { renderWithProviders } from '../test/render'
import WelcomePage from './WelcomePage'

afterEach(() => {
  vi.unstubAllGlobals()
  sessionStorage.clear()
})

const newbie = { id: 1, nickname: null, avatarUrl: null, admin: false, suggestedNickname: '양호' }

describe('WelcomePage', () => {
  it('prefills suggested nickname, saves, and returns to the remembered page', async () => {
    sessionStorage.setItem('aram.returnTo', '/posts/3')
    const api = mockApi({
      'GET /api/me': () => json(newbie),
      'PUT /api/me/nickname': (req) => json({ ...newbie, nickname: (req.body as { nickname: string }).nickname }),
    })
    renderWithProviders(<WelcomePage />, { path: '/welcome' })

    const input = await screen.findByLabelText('닉네임')
    expect(input).toHaveValue('양호')
    await userEvent.clear(input)
    await userEvent.type(input, '양호_1')
    await userEvent.click(screen.getByRole('button', { name: '시작하기' }))

    expect(await screen.findByTestId('location')).toHaveTextContent('/posts/3')
    expect(api.find('PUT', '/api/me/nickname')[0].body).toEqual({ nickname: '양호_1' })
    expect(sessionStorage.getItem('aram.returnTo')).toBeNull()
  })

  it('shows duplicate nickname error', async () => {
    mockApi({
      'GET /api/me': () => json(newbie),
      'PUT /api/me/nickname': () => json({ code: 'NICKNAME_TAKEN', message: '이미 쓰고 있는 닉네임이에요' }, 409),
    })
    renderWithProviders(<WelcomePage />, { path: '/welcome' })
    await userEvent.click(await screen.findByRole('button', { name: '시작하기' }))
    expect(await screen.findByText('이미 쓰고 있는 닉네임이에요')).toBeInTheDocument()
  })

  it('shows the rule message from the server', async () => {
    mockApi({
      'GET /api/me': () => json(newbie),
      'PUT /api/me/nickname': () =>
        json(
          {
            code: 'INVALID_INPUT',
            message: '입력값을 확인해주세요',
            fieldErrors: { nickname: '닉네임은 2~12자 한글, 영문, 숫자, 밑줄만 쓸 수 있어요' },
          },
          400,
        ),
    })
    renderWithProviders(<WelcomePage />, { path: '/welcome' })
    await userEvent.click(await screen.findByRole('button', { name: '시작하기' }))
    expect(await screen.findByText('닉네임은 2~12자 한글, 영문, 숫자, 밑줄만 쓸 수 있어요')).toBeInTheDocument()
  })
})
