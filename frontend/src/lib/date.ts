/** 2026.10.24 형식 날짜(사용자 컴퓨터 시간대 기준). */
export function dottedDate(iso: string): string {
  const d = new Date(iso)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}.${mm}.${dd}`
}
