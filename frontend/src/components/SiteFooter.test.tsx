import { screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { json, mockApi } from '../test/mockApi'
import { renderWithProviders } from '../test/render'
import SiteFooter, { CONTACT_EMAIL } from './SiteFooter'

afterEach(() => vi.unstubAllGlobals())

describe('SiteFooter', () => {
  it('shows the Riot Games notice in the original English', () => {
    mockApi({ 'GET /api/patches': () => json({ current: '26.21', patches: ['26.21'] }) })
    renderWithProviders(<SiteFooter />)
    const footer = screen.getByRole('contentinfo')
    expect(footer).toHaveTextContent("ARAM isn't endorsed by Riot Games and doesn't reflect the views or opinions of Riot Games")
    expect(footer).toHaveTextContent('trademarks or registered trademarks of Riot Games, Inc.')
  })

  it('shows the site name, copyright, data sources and the current patch', async () => {
    mockApi({ 'GET /api/patches': () => json({ current: '26.21', patches: ['26.21'] }) })
    renderWithProviders(<SiteFooter />)
    const footer = screen.getByRole('contentinfo')
    expect(footer).toHaveTextContent('ARAM · 증강 칼바람 커뮤니티')
    expect(footer).toHaveTextContent('© 2026 ARAM')
    expect(screen.getByRole('link', { name: 'Riot Data Dragon' })).toHaveAttribute('href', 'https://developer.riotgames.com/docs/lol#data-dragon')
    expect(screen.getByRole('link', { name: 'CommunityDragon' })).toHaveAttribute('href', 'https://www.communitydragon.org/')
    expect(await screen.findByText('26.21 패치 기준')).toBeInTheDocument()
  })

  it('leaves out the patch until the game data has arrived', () => {
    mockApi({ 'GET /api/patches': () => json({ current: null, patches: [] }) })
    renderWithProviders(<SiteFooter />)
    expect(screen.queryByText(/패치 기준/)).toBeNull()
  })

  it('links to the contact email and the source code', () => {
    mockApi({ 'GET /api/patches': () => json({ current: '26.21', patches: ['26.21'] }) })
    renderWithProviders(<SiteFooter />)
    expect(screen.getByRole('link', { name: '문의' })).toHaveAttribute('href', `mailto:${CONTACT_EMAIL}`)
    expect(screen.getByRole('link', { name: 'GitHub' })).toHaveAttribute('href', 'https://github.com/yyy5044/aram')
  })
})
