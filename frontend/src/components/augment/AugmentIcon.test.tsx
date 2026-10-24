import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import AugmentIcon from './AugmentIcon'

describe('AugmentIcon', () => {
  it('shows a colored icon file as an image', () => {
    const { container } = render(<AugmentIcon src="large.png" rarity="GOLD" className="h-6 w-6" />)
    const img = container.querySelector('img')
    expect(img).toHaveAttribute('src', 'large.png')
    expect(img).toHaveClass('h-6', 'w-6')
  })

  it('paints a white icon with the rarity color when tinted', () => {
    const { container } = render(<AugmentIcon src="small.png" rarity="PRISMATIC" tinted className="h-6 w-6 bg-slate-800" />)
    expect(container.querySelector('img')).toBeNull()
    const outer = container.firstElementChild as HTMLElement
    expect(outer).toHaveClass('h-6', 'w-6', 'bg-slate-800')
    const paint = outer.firstElementChild as HTMLElement
    expect(paint.style.maskImage || paint.style.webkitMaskImage).toContain('small.png')
    expect(paint.style.backgroundImage).toContain('linear-gradient')
  })

  it('keeps the name for screen readers when given', () => {
    const plain = render(<AugmentIcon src="l.png" rarity="GOLD" alt="소나타" />)
    expect(plain.getByAltText('소나타')).toBeInTheDocument()
    const painted = render(<AugmentIcon src="s.png" rarity="GOLD" tinted alt="장갑 충격" />)
    expect(painted.getByRole('img', { name: '장갑 충격' })).toBeInTheDocument()
  })

  it('uses different colors per rarity', () => {
    const colorOf = (rarity: 'PRISMATIC' | 'GOLD' | 'SILVER') => {
      const { container } = render(<AugmentIcon src="s.png" rarity={rarity} tinted />)
      return (container.firstElementChild!.firstElementChild as HTMLElement).style.backgroundImage
    }
    expect(new Set([colorOf('PRISMATIC'), colorOf('GOLD'), colorOf('SILVER')]).size).toBe(3)
  })
})
