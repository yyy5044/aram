import type { Activity } from '../../api/types'
import { buildHeatmap, type HeatLevel } from '../../lib/heatmap'
import { useMediaQuery } from '../../lib/useMediaQuery'

const LEVEL_CLASS: Record<HeatLevel, string> = {
  0: 'bg-slate-800',
  1: 'bg-green-900',
  2: 'bg-green-700',
  3: 'bg-green-500',
  4: 'bg-green-400',
}

/** GitHub 잔디처럼 하루 한 칸. 칸 크기는 상자 폭에 맞춰 늘고 줄어서 가로 스크롤이 생기지 않아요. */
export default function ActivityHeatmap({ activity }: { activity: Activity }) {
  const narrow = useMediaQuery('(max-width: 560px)')
  const weeks = narrow ? 26 : 53
  const { columns, months, activeDays } = buildHeatmap(activity, weeks)
  const grid = { gridTemplateColumns: `repeat(${weeks}, minmax(0, 1fr))` }

  return (
    <div>
      <div className="mb-2 flex items-center text-sm">
        <span className="font-bold">활동</span>
        <span className="ml-auto text-xs text-slate-400">최근 1년 동안 {activeDays}일 활동</span>
      </div>
      <div className="mb-1 grid gap-[3px] text-[11px] text-slate-500" style={grid} aria-hidden="true">
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
      <div className="mt-1.5 flex items-center justify-end gap-[3px] text-[11px] text-slate-500">
        <span className="mr-1">적음</span>
        {([0, 1, 2, 3, 4] as HeatLevel[]).map((level) => (
          <span key={level} className={`h-2.5 w-2.5 rounded-[2px] ${LEVEL_CLASS[level]}`} />
        ))}
        <span className="ml-1">많음</span>
      </div>
    </div>
  )
}
