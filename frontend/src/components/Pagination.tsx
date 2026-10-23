type Props = {
  page: number
  totalPages: number
  onChange: (page: number) => void
}

const WINDOW = 2

/** 페이지 번호. 페이지가 많으면 첫 페이지, 현재 주변, 마지막 페이지만 보여줘요. */
export default function Pagination({ page, totalPages, onChange }: Props) {
  if (totalPages <= 1) return null

  const pages: (number | 'gap')[] = []
  for (let p = 1; p <= totalPages; p++) {
    const near = Math.abs(p - page) <= WINDOW
    if (p === 1 || p === totalPages || near) pages.push(p)
    else if (pages.at(-1) !== 'gap') pages.push('gap')
  }

  const base = 'min-w-8 rounded-md border px-2 py-1 text-sm'
  return (
    <nav aria-label="페이지" className="mt-6 flex flex-wrap items-center justify-center gap-1.5">
      {pages.map((p, i) =>
        p === 'gap' ? (
          <span key={`gap-${i}`} className="px-1 text-slate-500">
            …
          </span>
        ) : (
          <button
            key={p}
            type="button"
            aria-current={p === page ? 'page' : undefined}
            onClick={() => onChange(p)}
            className={
              p === page
                ? `${base} border-amber-300 text-slate-100`
                : `${base} border-slate-700 text-slate-400 hover:text-slate-100`
            }
          >
            {p}
          </button>
        ),
      )}
      {page < totalPages && (
        <button
          type="button"
          aria-label="다음 페이지"
          onClick={() => onChange(page + 1)}
          className={`${base} border-slate-700 text-slate-400 hover:text-slate-100`}
        >
          다음 ›
        </button>
      )}
    </nav>
  )
}
