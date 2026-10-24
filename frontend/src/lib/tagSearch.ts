/** 태그 이름 검색과 정렬. 띄어쓰기와 대소문자는 무시해요. */

export type TagSort = 'name' | 'count'

export function normalizeName(s: string): string {
  return s.replace(/\s+/g, '').toLowerCase()
}

export function matchesName(name: string, query: string): boolean {
  const q = normalizeName(query)
  return q === '' || normalizeName(name).includes(q)
}

export function sortTags<T>(items: T[], sort: TagSort, nameOf: (t: T) => string, countOf: (t: T) => number): T[] {
  const byName = (a: T, b: T) => nameOf(a).localeCompare(nameOf(b), 'ko')
  return [...items].sort((a, b) => (sort === 'count' ? countOf(b) - countOf(a) || byName(a, b) : byName(a, b)))
}
