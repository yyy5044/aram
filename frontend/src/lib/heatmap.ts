import type { Activity } from '../api/types'

export type HeatLevel = 0 | 1 | 2 | 3 | 4

export type HeatCell = {
  date: string
  posts: number
  comments: number
  level: HeatLevel
  future: boolean
  label: string
}

export type Heatmap = {
  columns: HeatCell[][]
  months: { column: number; label: string }[]
  activeDays: number
}

const DAY_MS = 86_400_000

/** 월 이름("10월")은 칸 3개 정도 너비라, 이보다 가까운 이름은 겹쳐요. */
const MIN_LABEL_GAP = 3

/** 0개 → 0, 1개 → 1, 2개 → 2, 3~4개 → 3, 5개 이상 → 4 */
export function levelOf(total: number): HeatLevel {
  if (total <= 0) return 0
  if (total === 1) return 1
  if (total === 2) return 2
  if (total <= 4) return 3
  return 4
}

function parse(date: string): number {
  const [y, m, d] = date.split('-').map(Number)
  return Date.UTC(y, m - 1, d)
}

function format(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10)
}

function dotted(date: string): string {
  return date.replaceAll('-', '.')
}

/**
 * 활동 잔디 칸 배치. 세로 7칸(일~토)짜리 열을 from(일요일)부터 53개 만들고,
 * 좁은 화면(weeks = 26)이면 마지막 26열만 남겨요. activeDays는 항상 53주 전체 기준이에요.
 */
export function buildHeatmap(activity: Activity, weeks: 53 | 26): Heatmap {
  const byDate = new Map(activity.days.map((d) => [d.date, d]))
  const start = parse(activity.from)
  const end = parse(activity.to)

  const all: HeatCell[][] = []
  for (let w = 0; w < 53; w++) {
    const column: HeatCell[] = []
    for (let d = 0; d < 7; d++) {
      const ms = start + (w * 7 + d) * DAY_MS
      const date = format(ms)
      const day = byDate.get(date)
      const posts = day?.posts ?? 0
      const comments = day?.comments ?? 0
      const future = ms > end
      const total = posts + comments
      column.push({
        date,
        posts,
        comments,
        level: future ? 0 : levelOf(total),
        future,
        label: future ? '' : total > 0 ? `${dotted(date)} · 글 ${posts}개, 댓글 ${comments}개` : `${dotted(date)} · 활동 없음`,
      })
    }
    all.push(column)
  }

  const columns = weeks === 26 ? all.slice(53 - 26) : all
  const months: Heatmap['months'] = []
  columns.forEach((column, index) => {
    const firstOfMonth = column.find((c) => c.date.endsWith('-01'))
    const source = firstOfMonth ?? (index === 0 ? column[0] : undefined)
    if (source) months.push({ column: index, label: `${Number(source.date.slice(5, 7))}월` })
  })
  // 첫 열의 월 이름은 다음 달이 3열 안에 시작하면 글자가 겹치니 빼요(GitHub와 같은 규칙).
  if (months.length >= 2 && months[0].column === 0 && months[1].column < MIN_LABEL_GAP) {
    months.shift()
  }

  const activeDays = activity.days.filter((d) => {
    const ms = parse(d.date)
    return ms >= start && ms <= end && d.posts + d.comments > 0
  }).length

  return { columns, months, activeDays }
}
