import { usePatches } from '../../api/gamedata'

/** 패치 묶음 "26.21 버전". 지금 패치면 금색 "최신"이 붙어요(패치 목록을 못 받으면 번호만). */
export default function VersionChip({ patch }: { patch: string }) {
  const { data } = usePatches()
  const latest = data?.current === patch
  return (
    <span
      data-version={patch}
      className={`inline-flex h-6 flex-none items-center gap-1 rounded-mark border px-2 text-[13px] whitespace-nowrap ${
        latest ? 'border-[#a9dadf] bg-[#e1f3f5] text-teal-ink' : 'border-line text-ink-3'
      }`}
    >
      <b className="font-bold tabular-nums">{patch}</b> 버전
      {latest && <span className="ml-1 rounded-[2px] bg-gold px-1.5 text-[11px] leading-4 font-bold text-night">최신</span>}
    </span>
  )
}
