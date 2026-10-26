const BASE = { champion: '/champions', augment: '/augments' } as const

/** 태그(챔피언·증강·아이템) 하나의 모아보기 주소. */
export function tagPath(kind: 'champion' | 'augment', id: string) {
  return `${BASE[kind]}/${encodeURIComponent(id)}`
}
