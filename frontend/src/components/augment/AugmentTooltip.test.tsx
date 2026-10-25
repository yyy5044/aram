import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { AugmentText } from '../../api/types'
import AugmentTooltip from './AugmentTooltip'

const ko: AugmentText = { locale: 'ko', name: '거석상의 용기', description: '<status>이동 불가</status> 상태로 만들면<br>보호막을 얻습니다.' }

describe('AugmentTooltip', () => {
  it('shows the icon, name, rarity and coloured description', () => {
    render(<AugmentTooltip text={ko} rarity="PRISMATIC" iconUrl="i.png" />)
    const box = screen.getByRole('article', { name: '거석상의 용기' })
    expect(box).toHaveTextContent('거석상의 용기')
    expect(screen.getByText('프리즘 증강')).toBeInTheDocument()
    expect(screen.getByText('이동 불가')).toHaveStyle({ color: '#f1e2a8' })
    expect(box.querySelector('br')).not.toBeNull()
    expect(box.querySelector('img')).toHaveAttribute('src', 'i.png')
  })

  it('is a small box, not the big game card', () => {
    render(<AugmentTooltip text={ko} rarity="GOLD" iconUrl="i.png" />)
    const box = screen.getByRole('article')
    expect(box.className).toContain('w-[300px]')
    expect(box.className).not.toContain('h-[492px]')
    // 상자 안에는 복사 버튼이 없어요(복사는 증강 탭의 큰 카드에서).
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('names the rarity in the card language', () => {
    const { rerender } = render(<AugmentTooltip text={ko} rarity="SILVER" iconUrl="i.png" />)
    expect(screen.getByText('실버 증강')).toBeInTheDocument()
    rerender(<AugmentTooltip text={{ ...ko, locale: 'en', name: 'Stone Guts' }} rarity="GOLD" iconUrl="i.png" />)
    expect(screen.getByText('Gold augment')).toBeInTheDocument()
  })

  it('paints a white icon in the rarity colour', () => {
    render(<AugmentTooltip text={ko} rarity="PRISMATIC" iconUrl="small.png" iconTinted />)
    expect(screen.getByRole('article').querySelector('img')).toBeNull()
    expect(screen.getByRole('article').querySelector('[data-rarity-ring="PRISMATIC"]')).not.toBeNull()
  })
})
