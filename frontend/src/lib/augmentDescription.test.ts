import { describe, expect, it } from 'vitest'
import { parseDescription, toPlainText } from './augmentDescription'

describe('parseDescription', () => {
  it('maps known tags to colors and unknown tags to plain text', () => {
    expect(parseDescription('Gain <magicDamage>75~150 AP</magicDamage> and <foo>x</foo>')).toEqual([
      { kind: 'text', text: 'Gain ', color: null, italic: false },
      { kind: 'text', text: '75~150 AP', color: '#49b6ff', italic: false },
      { kind: 'text', text: ' and ', color: null, italic: false },
      { kind: 'text', text: 'x', color: null, italic: false },
    ])
  })

  it('turns <br> into breaks and rules into italic', () => {
    expect(parseDescription('a<br><br><rules>b</rules>')).toEqual([
      { kind: 'text', text: 'a', color: null, italic: false },
      { kind: 'break' },
      { kind: 'break' },
      { kind: 'text', text: 'b', color: '#8d99ae', italic: true },
    ])
  })

  it('colors item stat tags', () => {
    expect(parseDescription('<attention>900</attention>')).toEqual([
      { kind: 'text', text: '900', color: '#f0e6d2', italic: false },
    ])
    expect(parseDescription('<scaleMana>a</scaleMana><scaleHPRegen>b</scaleHPRegen>')).toEqual([
      { kind: 'text', text: 'a', color: '#49b6ff', italic: false },
      { kind: 'text', text: 'b', color: '#2ecc71', italic: false },
    ])
  })

  it('lets the innermost tag win when nested', () => {
    expect(parseDescription('<status>a <shield>b</shield> c</status>')).toEqual([
      { kind: 'text', text: 'a ', color: '#f1e2a8', italic: false },
      { kind: 'text', text: 'b', color: '#9ad8ff', italic: false },
      { kind: 'text', text: ' c', color: '#f1e2a8', italic: false },
    ])
  })
})

describe('unfilled placeholders', () => {
  it('shows unfilled numbers and references as ?', () => {
    expect(parseDescription('Every @Calc_Cooldown@ seconds, <shield>@X*100@% Shield</shield> {{Kiwi_Spell_Tooltip}}')).toEqual([
      { kind: 'text', text: 'Every ? seconds, ', color: null, italic: false },
      { kind: 'text', text: '?% Shield', color: '#9ad8ff', italic: false },
      { kind: 'text', text: ' ?', color: null, italic: false },
    ])
  })

  it('copies ? too', () => {
    expect(toPlainText('@Calc_Cooldown@초마다')).toBe('?초마다')
  })

  it('leaves a lone @ alone', () => {
    expect(toPlainText('email@example and 50%')).toBe('email@example and 50%')
  })
})

describe('toPlainText', () => {
  it('makes plain text for copying', () => {
    expect(toPlainText('Gain <shield>150 Shield</shield>.<br><br><rules>Max.</rules>')).toBe('Gain 150 Shield.\n\nMax.')
  })
})
