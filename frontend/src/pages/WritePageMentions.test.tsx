import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { Augment, Champion, Item } from '../api/types'
import type { MentionKind } from '../lib/mentionCandidates'
import { meYangho } from '../test/fixtures'
import { json, mockApi } from '../test/mockApi'
import { renderRoutes } from '../test/render'
import LocationProbe from '../test/LocationProbe'
import WritePage from './WritePage'

const champions: Champion[] = Array.from({ length: 6 }, (_, i) => ({ id: `C${i}`, nameKo: `챔피언${i}`, imageUrl: `https://x/C${i}.png` }))
const augments: Augment[] = Array.from({ length: 11 }, (_, i) => ({
  id: `A${i}`,
  nameKo: `증강${i}`,
  iconUrl: `https://x/A${i}.png`,
  active: true,
  rarity: 'GOLD',
}))

const items: Item[] = Array.from({ length: 11 }, (_, i) => ({
  id: `${3000 + i}`,
  nameKo: `아이템${i}`,
  tier: 'LEGENDARY',
  priceTotal: 3000,
  iconUrl: `https://x/${3000 + i}.png`,
  fromIds: [],
  intoIds: [],
  active: true,
}))

// 편집기 대신, @ 메뉴로 박스를 넣은 것을 버튼으로 흉내 내는 가짜 편집기예요.
vi.mock('../editor/PostEditor', () => ({
  default: ({ onMention }: { onMention?: (kind: MentionKind, id: string) => void }) => (
    <div>
      {Array.from({ length: 6 }, (_, i) => (
        <button key={`c${i}`} type="button" onClick={() => onMention?.('champion', `C${i}`)}>
          {`흉내: C${i}`}
        </button>
      ))}
      {Array.from({ length: 11 }, (_, i) => (
        <button key={`a${i}`} type="button" onClick={() => onMention?.('augment', `A${i}`)}>
          {`흉내: A${i}`}
        </button>
      ))}
      {Array.from({ length: 11 }, (_, i) => (
        <button key={`i${i}`} type="button" onClick={() => onMention?.('item', `${3000 + i}`)}>
          {`흉내: I${i}`}
        </button>
      ))}
    </div>
  ),
}))

function setup() {
  mockApi({
    'GET /api/me': () => json(meYangho),
    'GET /api/champions': () => json(champions),
    'GET /api/augments': () => json(augments),
    'GET /api/items': () => json(items),
    'GET /api/patches': () => json({ current: '26.21', patches: ['26.21'] }),
  })
  renderRoutes(
    [
      { path: '/write', element: <WritePage /> },
      { path: '*', element: <LocationProbe /> },
    ],
    '/write',
  )
}

const press = async (name: string) => userEvent.click(await screen.findByRole('button', { name }))

describe('WritePage with @ mentions', () => {
  it('adds a mentioned champion to the tags once', async () => {
    setup()
    await press('흉내: C0')
    expect(screen.getByRole('button', { name: '챔피언0 빼기' })).toBeInTheDocument()
    await press('흉내: C0')
    expect(screen.getAllByRole('button', { name: '챔피언0 빼기' })).toHaveLength(1)
  })

  it('keeps the box only in the body when the champion tags are full', async () => {
    setup()
    for (let i = 0; i < 5; i++) await press(`흉내: C${i}`)
    await press('흉내: C5')
    expect(screen.queryByRole('button', { name: '챔피언5 빼기' })).not.toBeInTheDocument()
    expect(await screen.findByText('태그 칸이 가득 차서 본문에만 넣었어요')).toBeInTheDocument()
  })

  it('applies the same rule to augments (ten)', async () => {
    setup()
    await press('흉내: A0')
    expect(screen.getByRole('button', { name: '증강0 빼기' })).toBeInTheDocument()
    for (let i = 1; i < 10; i++) await press(`흉내: A${i}`)
    await press('흉내: A10')
    expect(screen.queryByRole('button', { name: '증강10 빼기' })).not.toBeInTheDocument()
    expect(await screen.findByText('태그 칸이 가득 차서 본문에만 넣었어요')).toBeInTheDocument()
  })

  it('mentionAddsItemTag: adds a mentioned item to the item tags once, ten at most', async () => {
    setup()
    await press('흉내: I0')
    expect(screen.getByRole('button', { name: '아이템0 빼기' })).toBeInTheDocument()
    await press('흉내: I0')
    expect(screen.getAllByRole('button', { name: '아이템0 빼기' })).toHaveLength(1)
    for (let i = 1; i < 10; i++) await press(`흉내: I${i}`)
    await press('흉내: I10')
    expect(screen.queryByRole('button', { name: '아이템10 빼기' })).not.toBeInTheDocument()
    expect(await screen.findByText('태그 칸이 가득 차서 본문에만 넣었어요')).toBeInTheDocument()
  })
})
