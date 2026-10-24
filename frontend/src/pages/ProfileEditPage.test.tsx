import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Me } from '../api/types'
import { meYangho } from '../test/fixtures'
import LocationProbe from '../test/LocationProbe'
import { json, mockApi, type MockRoutes } from '../test/mockApi'
import { renderRoutes } from '../test/render'
import ProfileEditPage from './ProfileEditPage'

afterEach(() => vi.unstubAllGlobals())

const discord = 'https://cdn.discordapp.com/avatars/1/a.png'
const routes = [
  { path: '/settings/profile', element: <ProfileEditPage /> },
  { path: '*', element: <LocationProbe /> },
]

function setup(me: Me | null, extra: MockRoutes = {}) {
  const api = mockApi({
    'GET /api/me': () => json(me),
    'PUT /api/me/profile': (req) => {
      const body = req.body as { nickname: string; profileImageId: string | null; profilePublic: boolean }
      return json({ ...me, ...body, avatarUrl: body.profileImageId ? `/api/images/${body.profileImageId}` : discord })
    },
    ...extra,
  })
  const utils = renderRoutes(routes, '/settings/profile')
  return { api, ...utils }
}

const withPhoto: Me = { ...meYangho, avatarUrl: '/api/images/old', profileImageId: 'old', discordAvatarUrl: discord }

describe('ProfileEditPage', () => {
  it('prefills nickname and switch from me', async () => {
    setup({ ...meYangho, profilePublic: false })
    expect(await screen.findByLabelText('닉네임')).toHaveValue('양호')
    expect(screen.getByRole('switch', { name: '프로필 공개' })).toHaveAttribute('aria-checked', 'false')
  })

  it('uploads a new photo and sends its id on save', async () => {
    const { api } = setup(meYangho, { 'POST /api/images': () => json({ id: 'new-id', url: '/api/images/new-id' }, 201) })
    const png = new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], 'me.png', { type: 'image/png' })
    await userEvent.upload(await screen.findByLabelText('프로필 사진 고르기'), png)
    await vi.waitFor(() =>
      expect(document.querySelector('[data-testid="profile-preview"] img')).toHaveAttribute('src', '/api/images/new-id'),
    )
    await userEvent.click(screen.getByRole('button', { name: '저장' }))
    await vi.waitFor(() => expect(api.find('PUT', '/api/me/profile')).toHaveLength(1))
    expect(api.find('PUT', '/api/me/profile')[0].body).toEqual({
      nickname: '양호',
      profileImageId: 'new-id',
      profilePublic: true,
    })
  })

  it('reverts to the Discord photo', async () => {
    const { api } = setup(withPhoto)
    await userEvent.click(await screen.findByRole('button', { name: '디스코드 사진으로 되돌리기' }))
    expect(document.querySelector('[data-testid="profile-preview"] img')).toHaveAttribute('src', discord)
    await userEvent.click(screen.getByRole('button', { name: '저장' }))
    await vi.waitFor(() => expect(api.find('PUT', '/api/me/profile')).toHaveLength(1))
    expect((api.find('PUT', '/api/me/profile')[0].body as { profileImageId: unknown }).profileImageId).toBeNull()
  })

  it('disables revert when there is no custom photo', async () => {
    setup(meYangho)
    expect(await screen.findByRole('button', { name: '디스코드 사진으로 되돌리기' })).toBeDisabled()
  })

  it('toggles public off and saves', async () => {
    const { api } = setup(meYangho)
    await userEvent.click(await screen.findByRole('switch', { name: '프로필 공개' }))
    expect(screen.getByRole('switch', { name: '프로필 공개' })).toHaveAttribute('aria-checked', 'false')
    await userEvent.click(screen.getByRole('button', { name: '저장' }))
    await vi.waitFor(() => expect(api.find('PUT', '/api/me/profile')).toHaveLength(1))
    expect((api.find('PUT', '/api/me/profile')[0].body as { profilePublic: boolean }).profilePublic).toBe(false)
  })

  it('keeps other choices when the nickname is taken', async () => {
    setup(meYangho, {
      'POST /api/images': () => json({ id: 'new-id', url: '/api/images/new-id' }, 201),
      'PUT /api/me/profile': () => json({ code: 'NICKNAME_TAKEN', message: '이미 쓰고 있는 닉네임이에요' }, 409),
    })
    const png = new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], 'me.png', { type: 'image/png' })
    await userEvent.upload(await screen.findByLabelText('프로필 사진 고르기'), png)
    await vi.waitFor(() =>
      expect(document.querySelector('[data-testid="profile-preview"] img')).toHaveAttribute('src', '/api/images/new-id'),
    )
    await userEvent.click(screen.getByRole('switch', { name: '프로필 공개' }))
    await userEvent.clear(screen.getByLabelText('닉네임'))
    await userEvent.type(screen.getByLabelText('닉네임'), '민수')
    await userEvent.click(screen.getByRole('button', { name: '저장' }))

    expect(await screen.findByText('이미 쓰고 있는 닉네임이에요')).toBeInTheDocument()
    expect(screen.getByRole('switch', { name: '프로필 공개' })).toHaveAttribute('aria-checked', 'false')
    expect(document.querySelector('[data-testid="profile-preview"] img')).toHaveAttribute('src', '/api/images/new-id')
    expect(screen.getByLabelText('닉네임')).toHaveValue('민수')
  })

  it('rejects oversized photo before upload', async () => {
    const { api } = setup(meYangho)
    const big = new File([new Uint8Array(11 * 1024 * 1024)], 'big.png', { type: 'image/png' })
    await userEvent.upload(await screen.findByLabelText('프로필 사진 고르기'), big)
    expect(await screen.findByRole('status')).toHaveTextContent('이미지는 10MB 이하만 올릴 수 있어요')
    expect(api.find('POST', '/api/images')).toHaveLength(0)
  })

  it('navigates to my profile after saving with a toast', async () => {
    const { router } = setup(meYangho)
    await userEvent.click(await screen.findByRole('button', { name: '저장' }))
    await vi.waitFor(() => expect(router.state.location.pathname).toBe('/users/1'))
    expect(await screen.findByRole('status')).toHaveTextContent('프로필을 저장했어요')
  })

  it('cancel goes back to my profile without saving', async () => {
    const { api, router } = setup(meYangho)
    await userEvent.click(await screen.findByRole('link', { name: '취소' }))
    expect(router.state.location.pathname).toBe('/users/1')
    expect(api.find('PUT', '/api/me/profile')).toHaveLength(0)
  })

  it('asks anonymous users to log in', async () => {
    setup(null)
    expect(await screen.findByRole('button', { name: '로그인하고 프로필 수정하기' })).toBeInTheDocument()
  })
})
