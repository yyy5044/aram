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

  it('lets the innermost tag win when nested', () => {
    expect(parseDescription('<status>a <shield>b</shield> c</status>')).toEqual([
      { kind: 'text', text: 'a ', color: '#f1e2a8', italic: false },
      { kind: 'text', text: 'b', color: '#9ad8ff', italic: false },
      { kind: 'text', text: ' c', color: '#f1e2a8', italic: false },
    ])
  })
})

describe('toPlainText', () => {
  it('makes plain text for copying', () => {
    expect(toPlainText('Gain <shield>150 Shield</shield>.<br><br><rules>Max.</rules>')).toBe('Gain 150 Shield.\n\nMax.')
  })
})
