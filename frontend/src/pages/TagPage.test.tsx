import { screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { amumu, jinx, legDay, listItem, oldAugment, page } from '../test/fixtures'
import { json, mockApi } from '../test/mockApi'
import { renderWithProviders } from '../test/render'
import TagPage from './TagPage'

afterEach(() => vi.unstubAllGlobals())

const routes = {
  'GET /api/champions': () => json([amumu, jinx]),
  'GET /api/augments': () => json([legDay, oldAugment]),
  'GET /api/posts': () => json(page([listItem(), listItem({ id: 2 }), listItem({ id: 3 })])),
}

describe('TagPage', () => {
  it('shows champion header and filtered posts', async () => {
    const api = mockApi(routes)
    renderWithProviders(<TagPage kind="champion" />, { path: '/champions/:championId', route: '/champions/Amumu' })

    expect(await screen.findByRole('heading', { name: '아무무' })).toBeInTheDocument()
    expect(await screen.findByText('이 태그가 붙은 글 3개')).toBeInTheDocument()
    expect(api.find('GET', '/api/posts')[0].query.get('champion')).toBe('Amumu')
    expect(screen.getByRole('link', { name: '✕ 전체 글 보기' })).toHaveAttribute('href', '/')
  })

  it('shows augment header and filters by augment', async () => {
    const api = mockApi(routes)
    renderWithProviders(<TagPage kind="augment" />, { path: '/augments/:augmentId', route: '/augments/ARAM_LegDay' })
    expect(await screen.findByRole('heading', { name: '하체 운동의 날' })).toBeInTheDocument()
    await screen.findByText('이 태그가 붙은 글 3개')
    expect(api.find('GET', '/api/posts')[0].query.get('augment')).toBe('ARAM_LegDay')
  })

  it('marks inactive augments', async () => {
    mockApi(routes)
    renderWithProviders(<TagPage kind="augment" />, { path: '/augments/:augmentId', route: '/augments/OLD' })
    expect(await screen.findByText('현재 게임에 없음')).toBeInTheDocument()
  })

  it('shows not found for unknown tags', async () => {
    mockApi(routes)
    renderWithProviders(<TagPage kind="champion" />, { path: '/champions/:championId', route: '/champions/Nope' })
    expect(await screen.findByText('찾을 수 없는 태그예요')).toBeInTheDocument()
  })
})
