import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { amumu, jinx, page } from '../test/fixtures'
import { json, mockApi } from '../test/mockApi'
import { renderWithProviders } from '../test/render'
import ChampionsPage from './ChampionsPage'

afterEach(() => vi.unstubAllGlobals())

function setup(route = '/champions', champions = [jinx, amumu]) {
  mockApi({
    'GET /api/champions': () => json(champions),
    'GET /api/tag-counts': () => json({ champions: { Jinx: 5 }, augments: {} }),
    'GET /api/posts': () => json(page([])),
    'GET /api/champions/Amumu/top-augments': () => json([]),
  })
  return renderWithProviders(<ChampionsPage />, { path: '/champions', route })
}

const names = () => screen.getAllByRole('button', { name: /^(아무무|징크스)$/ }).map((b) => b.getAttribute('aria-label'))

describe('ChampionsPage', () => {
  it('lists champions without counts and sorts by post count', async () => {
    setup()
    await screen.findByRole('button', { name: '아무무' })
    expect(names()).toEqual(['아무무', '징크스'])
    expect(screen.getByRole('button', { name: '징크스' })).not.toHaveTextContent('글 5개')
    await userEvent.click(screen.getByRole('button', { name: '글 많은 순' }))
    expect(names()).toEqual(['징크스', '아무무'])
  })

  it('opens champion panel with ?open=', async () => {
    const { router } = setup()
    await userEvent.click(await screen.findByRole('button', { name: '아무무' }))
    expect(router.state.location.search).toBe('?open=Amumu')
    const region = await screen.findByRole('region', { name: '아무무 게시글' })
    expect(within(region).getByText('게시글 0개')).toBeInTheDocument()
    expect(within(region).getByRole('link', { name: '모아보기 ›' })).toHaveAttribute('href', '/champions/Amumu')
  })

  it('opening another champion starts its posts from the latest', async () => {
    const { router } = setup('/champions?open=Amumu&order=likes')
    await userEvent.click(await screen.findByRole('button', { name: '징크스' }))
    expect(router.state.location.search).toBe('?open=Jinx')
  })

  it('says the list is not ready yet when there are no champions', async () => {
    setup('/champions', [])
    expect(await screen.findByText('아직 챔피언 정보를 받아오지 못했어요. 잠시 후 다시 확인해주세요')).toBeInTheDocument()
    expect(screen.queryByText('검색 결과가 없어요')).not.toBeInTheDocument()
  })

  it('search with no result', async () => {
    setup()
    await userEvent.type(await screen.findByLabelText('이름 검색'), 'zzz')
    expect(screen.getByText('검색 결과가 없어요')).toBeInTheDocument()
  })
})
