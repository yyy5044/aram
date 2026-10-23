const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

/** 1분 미만 "방금", 1시간 미만 "N분 전", 하루 미만 "N시간 전", 7일 미만 "N일 전", 그 뒤로는 "2026.10.24". */
export function relativeTime(iso: string, now: Date = new Date()): string {
  const then = new Date(iso)
  const diff = now.getTime() - then.getTime()
  if (diff < MINUTE) return '방금'
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)}분 전`
  if (diff < DAY) return `${Math.floor(diff / HOUR)}시간 전`
  if (diff < 7 * DAY) return `${Math.floor(diff / DAY)}일 전`
  const mm = String(then.getMonth() + 1).padStart(2, '0')
  const dd = String(then.getDate()).padStart(2, '0')
  return `${then.getFullYear()}.${mm}.${dd}`
}
