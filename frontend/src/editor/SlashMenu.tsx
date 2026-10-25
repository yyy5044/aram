import { useImperativeHandle, useState, type Ref } from 'react'
import type { SlashItem } from './slashItems'

export type SlashMenuHandle = { onKeyDown: (event: KeyboardEvent) => boolean }

type Props = {
  items: SlashItem[]
  command: (item: SlashItem) => void
  ref?: Ref<SlashMenuHandle>
}

/** / 를 치면 뜨는 작은 메뉴. 위·아래로 고르고 Enter나 누르기로 넣어요. */
export default function SlashMenu({ items, command, ref }: Props) {
  const [selected, setSelected] = useState(0)
  const [lastItems, setLastItems] = useState(items)
  // 항목이 바뀌면(거르기) 첫 항목을 다시 골라요.
  if (lastItems !== items) {
    setLastItems(items)
    setSelected(0)
  }

  useImperativeHandle(ref, () => ({
    onKeyDown(event) {
      if (items.length === 0) return false
      if (event.key === 'ArrowDown') {
        setSelected((i) => (i + 1) % items.length)
        return true
      }
      if (event.key === 'ArrowUp') {
        setSelected((i) => (i - 1 + items.length) % items.length)
        return true
      }
      if (event.key === 'Enter') {
        command(items[selected])
        return true
      }
      return false
    },
  }))

  if (items.length === 0) return null

  return (
    <div role="listbox" aria-label="넣을 블록" className="w-52 border border-line bg-surface py-1 shadow-pop">
      {items.map((item, i) => (
        <button
          key={item.key}
          type="button"
          role="option"
          aria-selected={i === selected}
          className={`flex h-10 w-full items-center gap-3 px-3 text-left text-[15px] text-ink ${i === selected ? 'bg-ice' : ''}`}
          onMouseEnter={() => setSelected(i)}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => command(item)}
        >
          <span
            aria-hidden="true"
            className={`flex h-6 w-6 items-center justify-center text-[13px] ${item.key === 'video' ? 'bg-night text-gold' : 'border border-line text-ink-3'}`}
          >
            {item.key === 'video' ? '▶' : '▣'}
          </span>
          <span>{item.label}</span>
          <span className="ml-auto text-[13px] text-ink-3">{item.hint}</span>
        </button>
      ))}
    </div>
  )
}
