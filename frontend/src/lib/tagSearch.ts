/** 태그 이름 검색과 정렬. 띄어쓰기와 대소문자는 무시하고, 초성(ㄱㅅㅅ)이나 섞어 쓰기(거ㅅㅅ)로도 찾아요. */

export type TagSort = 'name' | 'count'

export function normalizeName(s: string): string {
  return s.replace(/\s+/g, '').toLowerCase()
}

/** 한글 초성 19개. 글자 번호 계산(가=0xAC00부터 초성마다 588개씩)의 순서와 같아요. */
const CHOSEONG = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ'

function initialOf(ch: string): string | null {
  const code = ch.charCodeAt(0) - 0xac00
  return code >= 0 && code < 11172 ? CHOSEONG[Math.floor(code / 588)] : null
}

/** 같은 글자이거나, 검색 글자가 초성이고 이름 글자가 그 초성으로 시작하면 맞아요. */
function sameChar(nameCh: string, queryCh: string): boolean {
  return nameCh === queryCh || (CHOSEONG.includes(queryCh) && initialOf(nameCh) === queryCh)
}

export function matchesName(name: string, query: string): boolean {
  const q = [...normalizeName(query)]
  if (q.length === 0) return true
  const n = [...normalizeName(name)]
  for (let start = 0; start + q.length <= n.length; start++) {
    if (q.every((ch, i) => sameChar(n[start + i], ch))) return true
  }
  return false
}

export function sortTags<T>(items: T[], sort: TagSort, nameOf: (t: T) => string, countOf: (t: T) => number): T[] {
  const byName = (a: T, b: T) => nameOf(a).localeCompare(nameOf(b), 'ko')
  return [...items].sort((a, b) => (sort === 'count' ? countOf(b) - countOf(a) || byName(a, b) : byName(a, b)))
}
