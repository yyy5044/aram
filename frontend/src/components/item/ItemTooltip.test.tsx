import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { AugmentText, Item, ItemDetail } from '../../api/types'
import ItemTooltip from './ItemTooltip'

const text: AugmentText = { locale: 'ko', name: '무한의 대검', description: '<attention>80</attention> 공격력<br>치명타 피해량 증가' }

function item(id: string, nameKo: string, extra: Partial<Item> = {}): Item {
  return { id, nameKo, tier: 'BASIC', priceTotal: 100, iconUrl: `${id}.png`, fromIds: [], intoIds: [], active: true, ...extra }
}

const items: Item[] = [
  item('1038', 'B.F. 대검'),
  item('1037', '곡괭이'),
  item('1018', '민첩성의 망토'),
  item('3031', '무한의 대검', { tier: 'LEGENDARY', priceTotal: 3000 }),
  item('9999', '사라진 아이템', { active: false }),
]

const detail: ItemDetail = {
  id: '3031',
  tier: 'LEGENDARY',
  priceTotal: 3000,
  iconUrl: '3031.png',
  fromIds: ['1038', '1037', '1018'],
  intoIds: [],
  original: null,
  translation: text,
}

describe('ItemTooltip', () => {
  it('showsPriceAndTier', () => {
    render(<ItemTooltip detail={detail} text={text} items={items} />)
    const box = screen.getByRole('article', { name: '무한의 대검' })
    expect(box).toHaveTextContent('3000 골드 · 전설')
    expect(screen.getByText('80')).toBeInTheDocument()
    expect(box.querySelector('br')).not.toBeNull()
    expect(box.className).toContain('w-[300px]')
  })

  it('showsRecipeAndInto', () => {
    const withInto = { ...detail, intoIds: ['3031'] }
    render(<ItemTooltip detail={withInto} text={text} items={items} onPick={() => {}} />)
    expect(screen.getByText('재료')).toBeInTheDocument()
    expect(screen.getByText('상위 아이템')).toBeInTheDocument()
    expect(screen.getAllByRole('button')).toHaveLength(4)
    expect(screen.getByRole('button', { name: 'B.F. 대검' })).toBeInTheDocument()
  })

  it('draws plain images with the name as title when nothing can be picked', () => {
    render(<ItemTooltip detail={detail} text={text} items={items} />)
    expect(screen.queryByRole('button')).toBeNull()
    const img = screen.getByTitle('곡괭이')
    expect(img.tagName).toBe('IMG')
    expect(img).toHaveAttribute('alt', '')
  })

  it('hidesRowsWithNothingToShow', () => {
    render(<ItemTooltip detail={{ ...detail, fromIds: [], intoIds: [] }} text={text} items={items} />)
    expect(screen.queryByText('재료')).toBeNull()
    expect(screen.queryByText('상위 아이템')).toBeNull()
  })

  it('skipsIdsNotInList', () => {
    render(<ItemTooltip detail={{ ...detail, fromIds: ['1038', '0000', '9999'], intoIds: ['0000'] }} text={text} items={items} onPick={() => {}} />)
    expect(screen.getAllByRole('button')).toHaveLength(1)
    expect(screen.queryByText('상위 아이템')).toBeNull()
  })

  it('draws duplicate recipe ids twice', () => {
    render(<ItemTooltip detail={{ ...detail, fromIds: ['1038', '1037', '1038'] }} text={text} items={items} onPick={() => {}} />)
    expect(screen.getAllByRole('button', { name: 'B.F. 대검' })).toHaveLength(2)
  })

  it('pickCallsOnPick', async () => {
    const onPick = vi.fn()
    render(<ItemTooltip detail={detail} text={text} items={items} onPick={onPick} />)
    await userEvent.click(screen.getByRole('button', { name: '곡괭이' }))
    expect(onPick).toHaveBeenCalledWith('1037')
  })

  it('draws an empty square when the icon is missing', () => {
    render(<ItemTooltip detail={{ ...detail, iconUrl: null, fromIds: [] }} text={text} items={items} />)
    expect(screen.getByRole('article').querySelector('img')).toBeNull()
  })
})
