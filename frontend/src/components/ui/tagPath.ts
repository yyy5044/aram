/** 태그(챔피언·증강) 하나의 모아보기 주소. */
export function tagPath(kind: 'champion' | 'augment', id: string) {
  return kind === 'champion' ? `/champions/${encodeURIComponent(id)}` : `/augments/${encodeURIComponent(id)}`
}
