type Props = {
  page: number
  totalPages: number
  onChange: (page: number) => void
}

const WINDOW = 2

/** 페이지 번호(40px 정사각, 손가락으로도 잘못 누르지 않게). 페이지가 많으면 첫 페이지, 현재 주변, 마지막 페이지만. */
export default function Pagination({ page, totalPages, onChange }: Props) {
  if (totalPages <= 1) return null

  const pages: (number | 'gap')[] = []
  for (let p = 1; p <= totalPages; p++) {
    const near = Math.abs(p - page) <= WINDOW
    if (p === 1 || p === totalPages || near) pages.push(p)
    else if (pages.at(-1) !== 'gap') pages.push('gap')
  }

  const base = 'h-10 min-w-10 rounded-touch text-[15px] tabular-nums focus-visible:outline-2 focus-visible:outline-teal'
  const idle = `${base} text-ink-2 hover:bg-surface hover:shadow-[inset_0_0_0_1px_var(--color-line)]`
  return (
    <nav aria-label="페이지" className="mt-6 flex flex-wrap items-center justify-center gap-1">
      {pages.map((p, i) =>
        p === 'gap' ? (
          <span key={`gap-${i}`} className="px-1 text-ink-3">
            …
          </span>
        ) : (
          <button
            key={p}
            type="button"
            aria-current={p === page ? 'page' : undefined}
            onClick={() => onChange(p)}
            className={p === page ? `${base} bg-night px-2 font-bold text-gold-pale` : `${idle} px-2`}
          >
            {p}
          </button>
        ),
      )}
      {page < totalPages && (
        <button type="button" aria-label="다음 페이지" onClick={() => onChange(page + 1)} className={`${idle} px-3`}>
          다음 ›
        </button>
      )}
    </nav>
  )
}
