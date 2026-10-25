import { describe, expect, it } from 'vitest'
import type { Augment, Champion, Item } from '../api/types'
import { mentionCandidates } from './mentionCandidates'

const champ = (id: string, nameKo: string): Champion => ({ id, nameKo, imageUrl: `https://x/${id}.png` })
const aug = (id: string, nameKo: string, active = true): Augment => ({
  id,
  nameKo,
  iconUrl: `https://x/${id}.png`,
  active,
  rarity: 'GOLD',
})

const item = (id: string, nameKo: string, active = true): Item => ({
  id,
  nameKo,
  tier: 'LEGENDARY',
  priceTotal: 3000,
  iconUrl: `https://x/item/${id}.png`,
  fromIds: [],
  intoIds: [],
  active,
})

const champions = [champ('XinZhao', '신짜오'), champ('Jinx', '징크스'), champ('Amumu', '아무무')]
const augments = [aug('StoneGuts', '거석상의 용기'), aug('GiantSlayer', '만능 거인'), aug('Old', '신짜오의 옛 증강', false)]

describe('mentionCandidates', () => {
  it('finds by initial consonants', () => {
    expect(mentionCandidates('ㅅㅉ', champions, augments, []).map((c) => c.name)).toEqual(['신짜오'])
  })

  it('ignores spaces', () => {
    expect(mentionCandidates('거석상의용기', champions, augments, []).map((c) => c.id)).toEqual(['StoneGuts'])
  })

  it('puts names that start with the query first', () => {
    expect(mentionCandidates('거', champions, augments, []).map((c) => c.name)).toEqual(['거석상의 용기', '만능 거인'])
  })

  it('caps the list at eight', () => {
    const many = Array.from({ length: 12 }, (_, i) => champ(`C${i}`, `가${i}`))
    expect(mentionCandidates('가', many, [], [])).toHaveLength(8)
  })

  it('skips augments that are no longer in the game', () => {
    expect(mentionCandidates('옛', champions, augments, [])).toEqual([])
  })

  it('gives nothing for a blank query', () => {
    expect(mentionCandidates('  ', champions, augments, [])).toEqual([])
  })

  it('mixes champions and augments with their kind and look', () => {
    const both = mentionCandidates('ㅁ', [champ('Amumu', '아무무')], [aug('GiantSlayer', '만능 거인')], [])
    expect(both).toEqual([
      { kind: 'augment', id: 'GiantSlayer', name: '만능 거인', iconUrl: 'https://x/GiantSlayer.png', rarity: 'GOLD', tinted: undefined },
      { kind: 'champion', id: 'Amumu', name: '아무무', iconUrl: 'https://x/Amumu.png' },
    ])
  })

  it('includes active items found by initial consonants', () => {
    const found = mentionCandidates('ㄱㅊ', champions, augments, [item('3084', '강철심장'), item('3068', '태양불꽃 방패')])
    expect(found).toEqual([
      { kind: 'item', id: '3084', name: '강철심장', iconUrl: 'https://x/item/3084.png' },
    ])
  })

  it('skips items that are no longer in the game', () => {
    expect(mentionCandidates('강철', champions, augments, [item('3084', '강철심장', false)])).toEqual([])
  })

  it('mixes the three kinds and still stops at eight', () => {
    const tail = ['가', '나', '다', '라', '마', '바', '사', '아', '자', '차', '카', '타']
    const cs = tail.slice(0, 4).map((t, i) => champ(`C${i}`, `가${t}`))
    const as = tail.slice(4, 8).map((t, i) => aug(`A${i}`, `가${t}`))
    const is = tail.slice(8, 12).map((t, i) => item(`${1000 + i}`, `가${t}`))
    const found = mentionCandidates('가', cs, as, is)
    expect(found).toHaveLength(8)
    expect(found.map((c) => c.kind)).toEqual(['champion', 'champion', 'champion', 'champion', 'augment', 'augment', 'augment', 'augment'])
    const onlyItemsLeft = mentionCandidates('가', [], [], is)
    expect(onlyItemsLeft.map((c) => c.kind)).toEqual(['item', 'item', 'item', 'item'])
  })
})
