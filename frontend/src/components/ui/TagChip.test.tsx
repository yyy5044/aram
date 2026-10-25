import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { amumu, legDay } from '../../test/fixtures'
import { renderWithProviders } from '../../test/render'
import TagChip from './TagChip'

describe('TagChip', () => {
  it('shows the icon and name as one plain chip', () => {
    renderWithProviders(<TagChip kind="champion" id={amumu.id} nameKo={amumu.nameKo} imageUrl={amumu.imageUrl} size="sm" />)
    expect(screen.getByText('아무무')).toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('links a large augment chip to its collection page', () => {
    renderWithProviders(
      <TagChip
        kind="augment"
        id={legDay.id}
        nameKo={legDay.nameKo}
        imageUrl={legDay.iconUrl}
        rarity={legDay.rarity}
        size="lg"
        link
      />,
    )
    expect(screen.getByRole('link', { name: /하체 운동의 날/ })).toHaveAttribute('href', '/augments/ARAM_LegDay')
  })

  it('removes with the ✕ button', async () => {
    const onRemove = vi.fn()
    renderWithProviders(
      <TagChip kind="champion" id={amumu.id} nameKo={amumu.nameKo} imageUrl={amumu.imageUrl} size="md" onRemove={onRemove} />,
    )
    await userEvent.click(screen.getByRole('button', { name: '아무무 빼기' }))
    expect(onRemove).toHaveBeenCalledTimes(1)
  })

  it('links an item chip to its page with a square icon', () => {
    renderWithProviders(<TagChip kind="item" id="3084" nameKo="강철심장" imageUrl="https://example.test/3084.png" size="lg" link />)
    const link = screen.getByRole('link', { name: /강철심장/ })
    expect(link).toHaveAttribute('href', '/items/3084')
    expect(link.querySelector('img')?.className).not.toContain('rounded-full')
  })
})
