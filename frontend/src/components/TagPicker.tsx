import { useId, useState } from 'react'

type Item = { id: string; nameKo: string }

type Props<T extends Item> = {
  label: string
  /** 선택된 칩을 그릴 때 찾는 전체 목록(현재 게임에 없는 것 포함). */
  items: T[]
  /** 검색해서 새로 고를 수 있는 목록. */
  options: T[]
  selected: string[]
  onChange: (ids: string[]) => void
  max: number
  iconOf: (item: T) => string | null
  round?: boolean
  placeholder?: string
}

/** 이름 일부로 검색해서 고르는 태그 칸. 고른 것은 칩으로 보이고 ✕로 빼요. */
export default function TagPicker<T extends Item>({
  label,
  items,
  options,
  selected,
  onChange,
  max,
  iconOf,
  round = false,
  placeholder,
}: Props<T>) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const listId = useId()
  const full = selected.length >= max

  const selectedItems = selected
    .map((id) => items.find((i) => i.id === id))
    .filter((i): i is T => i !== undefined)
  const q = query.trim()
  const matches = options.filter((o) => !selected.includes(o.id) && (!q || o.nameKo.includes(q))).slice(0, 30)

  function add(id: string) {
    onChange([...selected, id])
    setQuery('')
  }

  const iconClass = round ? 'h-6 w-6 rounded-full' : 'h-6 w-6 rounded-md bg-slate-800'

  return (
    <div className="relative">
      <div className="flex min-h-11 flex-wrap items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 p-1.5">
        {selectedItems.map((item) => {
          const icon = iconOf(item)
          return (
            <span
              key={item.id}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-800 py-0.5 pr-2 pl-0.5 text-sm"
            >
              {icon ? <img src={icon} alt="" className={iconClass} /> : <span className={`${iconClass} bg-slate-700`} />}
              {item.nameKo}
              <button
                type="button"
                aria-label={`${item.nameKo} 빼기`}
                onClick={() => onChange(selected.filter((s) => s !== item.id))}
                className="text-slate-400 hover:text-slate-100"
              >
                ✕
              </button>
            </span>
          )
        })}
        <input
          aria-label={`${label} 검색`}
          role="combobox"
          aria-expanded={open && !full}
          aria-controls={listId}
          value={query}
          disabled={full}
          placeholder={full ? '' : placeholder}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          className="min-w-32 flex-1 bg-transparent px-1 py-1 text-slate-100 outline-none disabled:cursor-not-allowed"
        />
      </div>
      {full && <p className="mt-1 text-xs text-slate-400">최대 {max}개까지 고를 수 있어요</p>}
      {open && !full && matches.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          className="absolute right-0 left-0 z-10 mt-1 max-h-60 overflow-auto rounded-lg border border-slate-700 bg-slate-800 shadow-xl"
        >
          {matches.map((o) => {
            const icon = iconOf(o)
            return (
              <li
                key={o.id}
                role="option"
                aria-selected={false}
                onMouseDown={(e) => {
                  e.preventDefault()
                  add(o.id)
                }}
                className="flex cursor-pointer items-center gap-2.5 px-2.5 py-2 hover:bg-slate-700"
              >
                {icon ? <img src={icon} alt="" className={iconClass} /> : <span className={`${iconClass} bg-slate-700`} />}
                <span>{o.nameKo}</span>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
