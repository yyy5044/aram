/** 서버가 남겨 둔 색 표식 → 색. 게임 툴팁의 색을 따라요. */
export const DESCRIPTION_COLORS: Record<string, string> = {
  magicDamage: '#49b6ff',
  scaleAP: '#49b6ff',
  physicalDamage: '#ff8c34',
  scaleAD: '#ff8c34',
  trueDamage: '#f5f5f5',
  health: '#2ecc71',
  scaleHealth: '#2ecc71',
  healing: '#2ecc71',
  shield: '#9ad8ff',
  speed: '#e8d58a',
  omnivamp: '#ff5c5c',
  lifeSteal: '#ff5c5c',
  lifesteal: '#ff5c5c',
  status: '#f1e2a8',
  keyword: '#f1e2a8',
  keywordMajor: '#f1e2a8',
  active: '#f1e2a8',
  passive: '#f1e2a8',
  attackSpeed: '#f0c674',
  gold: '#f0c674',
  rules: '#8d99ae',
  rule: '#8d99ae',
}

const ITALIC_TAGS = new Set(['rules', 'rule'])

export type Segment = { kind: 'text'; text: string; color: string | null; italic: boolean } | { kind: 'break' }

const TAG = /<(\/?)([A-Za-z]+)[^>]*>/g

/** 설명을 글 조각과 줄바꿈으로 나눠요. 아는 표식은 색을 입히고, 모르는 표식은 글만 남겨요. 중첩은 안쪽이 이겨요. */
export function parseDescription(description: string): Segment[] {
  const segments: Segment[] = []
  const stack: string[] = []
  let last = 0

  const pushText = (text: string) => {
    if (!text) return
    const current = stack.at(-1) ?? null
    segments.push({
      kind: 'text',
      text,
      color: current ? (DESCRIPTION_COLORS[current] ?? null) : null,
      italic: current ? ITALIC_TAGS.has(current) : false,
    })
  }

  for (const m of description.matchAll(TAG)) {
    pushText(description.slice(last, m.index))
    last = m.index + m[0].length
    const closing = m[1] === '/'
    const name = m[2]
    if (name.toLowerCase() === 'br') {
      segments.push({ kind: 'break' })
    } else if (closing) {
      const at = stack.lastIndexOf(name)
      if (at >= 0) stack.splice(at, 1)
    } else if (name in DESCRIPTION_COLORS) {
      stack.push(name)
    }
  }
  pushText(description.slice(last))
  return segments
}

/** 복사용 글: 표식을 빼고 <br>을 줄바꿈으로. */
export function toPlainText(description: string): string {
  return description
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .trim()
}
