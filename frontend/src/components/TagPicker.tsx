import { useId, useState } from 'react'
import type { AugmentRarity } from '../api/types'
import { matchesName } from '../lib/tagSearch'
import AugmentIcon from './augment/AugmentIcon'
import SearchInput from './ui/SearchInput'
import TagChip from './ui/TagChip'

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
  /** 증강이면 등급(테두리 선)과 흰 아이콘인지. 챔피언은 비워요. */
  augmentOf?: (item: T) => { rarity: AugmentRarity; tinted?: boolean } | undefined
  round?: boolean
  placeholder?: string
}

/** 이름 일부로 검색해서 고르는 태그 칸. 위에 검색칸(44px), 아래에 고른 태그(36px, ✕로 빼기). */
export default function TagPicker<T extends Item>({
  label,
  items,
  options,
  selected,
  onChange,
  max,
  iconOf,
  augmentOf,
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
  // 띄어쓰기와 대소문자는 무시해요("거석상의용기"로도 "거석상의 용기"가 찾아져요). 증강·챔피언 탭과 같은 규칙.
  const matches = options.filter((o) => !selected.includes(o.id) && matchesName(o.nameKo, query)).slice(0, 30)

  function add(id: string) {
    onChange([...selected, id])
    setQuery('')
    setOpen(false)
  }

  // 그림 칸 모양. 바탕색은 그림이 있을 때(남색)와 없을 때(회색)를 따로 붙여요(같은 속성 클래스를 겹치지 않게).
  const iconShape = round ? 'h-7 w-7 rounded-full ring-1 ring-gold' : 'h-7 w-7 rounded-mark'

  return (
    <div>
      <div className="relative">
        <SearchInput
          label={`${label} 검색`}
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
          onClick={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          wrapperClassName={full ? 'opacity-60' : ''}
        />
        {open && !full && matches.length > 0 && (
          <ul
            id={listId}
            role="listbox"
            className="absolute inset-x-0 top-full z-20 mt-1 max-h-60 overflow-auto border border-line bg-surface py-1 shadow-pop"
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
                  className="flex h-11 cursor-pointer items-center gap-2.5 px-3 text-[15px] text-ink hover:bg-ice"
                >
                  {icon ? (
                    <TagIcon
                      src={icon}
                      augment={augmentOf?.(o)}
                      className={round ? iconShape : `${iconShape} bg-night`}
                    />
                  ) : (
                    <span className={`${iconShape} bg-line`} />
                  )}
                  <span>{o.nameKo}</span>
                </li>
              )
            })}
          </ul>
        )}
      </div>
      {full && <p className="mt-1 text-[13px] text-ink-3">최대 {max}개까지 고를 수 있어요</p>}
      {selectedItems.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {selectedItems.map((item) => {
            const augment = augmentOf?.(item)
            return (
              <TagChip
                key={item.id}
                kind={augment ? 'augment' : 'champion'}
                id={item.id}
                nameKo={item.nameKo}
                imageUrl={iconOf(item)}
                rarity={augment?.rarity}
                tinted={augment?.tinted}
                size="md"
                onRemove={() => onChange(selected.filter((s) => s !== item.id))}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}

function TagIcon({
  src,
  augment,
  className,
}: {
  src: string
  augment?: { rarity: AugmentRarity; tinted?: boolean }
  className: string
}) {
  if (!augment) return <img src={src} alt="" className={className} />
  return <AugmentIcon src={src} rarity={augment.rarity} tinted={augment.tinted} frame="ring" className={className} />
}
