type Props<T extends string> = {
  options: { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
  /** 묶음 이름(화면 읽기 프로그램용). */
  label: string
}

/** 붙어 있는 두세 칸 중 하나를 고르는 버튼(높이 40). 정렬에 써요. */
export default function Segmented<T extends string>({ options, value, onChange, label }: Props<T>) {
  return (
    <div role="group" aria-label={label} className="inline-flex flex-none overflow-hidden rounded-touch border border-line bg-surface">
      {options.map((o) => {
        const on = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(o.value)}
            className={`h-[38px] px-4 text-[15px] whitespace-nowrap focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-teal sm:px-5 ${
              on ? 'bg-night font-bold text-gold-pale' : 'text-ink-2 hover:bg-ice hover:text-ink'
            }`}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
