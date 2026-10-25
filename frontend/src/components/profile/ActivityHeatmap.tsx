import type { Activity } from '../../api/types'
import { buildHeatmap, type HeatLevel } from '../../lib/heatmap'
import { useMediaQuery } from '../../lib/useMediaQuery'

/** 청록 5단계: 하늘색 바탕에 어울리고, 진할수록 활동이 많아요. */
const LEVEL_CLASS: Record<HeatLevel, string> = {
  0: 'bg-[#e2ebf1]',
  1: 'bg-[#9fdde3]',
  2: 'bg-[#4fc1cc]',
  3: 'bg-[#12939f]',
  4: 'bg-[#0a5f6a]',
}

/** GitHub 잔디처럼 하루 한 칸. 칸 크기는 상자 폭에 맞춰 늘고 줄어서 가로 스크롤이 생기지 않아요. */
export default function ActivityHeatmap({ activity }: { activity: Activity }) {
  const narrow = useMediaQuery('(max-width: 560px)')
  const weeks = narrow ? 26 : 53
  const { columns, months, activeDays } = buildHeatmap(activity, weeks)
  const grid = { gridTemplateColumns: `repeat(${weeks}, minmax(0, 1fr))` }

  return (
    <div>
      <div className="mb-3 flex items-baseline">
        <h2 className="text-[17px] font-bold text-night">활동</h2>
        <span className="ml-auto text-[13px] text-ink-3">최근 1년 동안 {activeDays}일 활동</span>
      </div>
      <div className="mb-1 grid gap-[3px] text-[11px] text-ink-3" style={grid} aria-hidden="true">
        {columns.map((_, i) => {
          const month = months.find((m) => m.column === i)
          return (
            <span key={i} className="overflow-visible whitespace-nowrap">
              {month?.label ?? ''}
            </span>
          )
        })}
      </div>
      <div className="grid grid-flow-col grid-rows-7 gap-[3px]" style={grid}>
        {columns.flat().map((cell) => (
          <span
            key={cell.date}
            data-heat-cell
            data-level={cell.level}
            title={cell.label || undefined}
            className={`aspect-square rounded-[2px] ${cell.future ? 'invisible' : LEVEL_CLASS[cell.level]}`}
          />
        ))}
      </div>
      <div className="mt-2 flex items-center justify-end gap-[3px] text-[11px] text-ink-3">
        <span className="mr-1">적음</span>
        {([0, 1, 2, 3, 4] as HeatLevel[]).map((level) => (
          <span key={level} className={`h-2.5 w-2.5 rounded-[2px] ${LEVEL_CLASS[level]}`} />
        ))}
        <span className="ml-1">많음</span>
      </div>
    </div>
  )
}
