import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { AugmentText } from '../../api/types'
import { renderWithProviders } from '../../test/render'
import AugmentCard from './AugmentCard'

afterEach(() => vi.unstubAllGlobals())

const text: AugmentText = {
  locale: 'ko',
  name: '불길한 서약',
  description: '<magicDamage>주문력</magicDamage> 75~150<br>규칙',
}

describe('AugmentCard', () => {
  it('renders name, rarity label, colored text and frame by rarity', () => {
    renderWithProviders(<AugmentCard text={text} rarity="PRISMATIC" iconUrl="i.png" />)
    expect(screen.getByRole('article', { name: '불길한 서약' })).toBeInTheDocument()
    expect(screen.getByText('프리즘')).toBeInTheDocument()
    expect(screen.getByText('주문력')).toHaveStyle({ color: '#49b6ff' })
    expect(document.querySelector('img[src$="augmentcard_frame_prismatic.png"]')).toBeInTheDocument()
    expect(document.querySelector('img[src="i.png"]')).toBeInTheDocument()
  })

  it('paints a white icon when the server says it needs tinting', () => {
    renderWithProviders(<AugmentCard text={text} rarity="GOLD" iconUrl="small.png" iconTinted />)
    const article = screen.getByRole('article', { name: '불길한 서약' })
    expect(article.querySelector('img[src="small.png"]')).toBeNull()
  })

  it('uses English rarity labels for en text', () => {
    renderWithProviders(
      <AugmentCard text={{ locale: 'en', name: 'Ominous Pact', description: 'x' }} rarity="SILVER" iconUrl="i.png" />,
    )
    expect(screen.getByRole('article', { name: 'Ominous Pact' })).toBeInTheDocument()
    expect(screen.getByText('Silver')).toBeInTheDocument()
    expect(document.querySelector('img[src$="augmentcard_frame_silver.png"]')).toBeInTheDocument()
  })

  it('copies plain text and toasts', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } })
    renderWithProviders(<AugmentCard text={text} rarity="GOLD" iconUrl="i.png" />)
    await userEvent.click(screen.getByRole('button', { name: '복사' }))
    expect(writeText).toHaveBeenCalledWith('주문력 75~150\n규칙')
    expect(await screen.findByText('복사했어요')).toBeInTheDocument()
  })

  it('toasts when the clipboard is unavailable', async () => {
    vi.stubGlobal('navigator', { ...navigator, clipboard: undefined })
    renderWithProviders(<AugmentCard text={text} rarity="GOLD" iconUrl="i.png" />)
    await userEvent.click(screen.getByRole('button', { name: '복사' }))
    expect(await screen.findByText('복사하지 못했어요')).toBeInTheDocument()
  })
})
