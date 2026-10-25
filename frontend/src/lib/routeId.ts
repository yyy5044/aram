/** 주소의 숫자 id(1 이상의 정수)를 읽어요. 형식이 틀리면 null이에요. */
export function parseRouteId(value: string | undefined): number | null {
  if (!value || !/^[1-9]\d*$/.test(value)) return null
  const id = Number(value)
  return Number.isSafeInteger(id) ? id : null
}
