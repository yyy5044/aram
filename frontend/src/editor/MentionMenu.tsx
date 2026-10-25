import { useImperativeHandle, useState, type Ref } from 'react'
import AugmentIcon from '../components/augment/AugmentIcon'
import type { MentionCandidate } from '../lib/mentionCandidates'

export type MentionMenuHandle = { onKeyDown: (event: KeyboardEvent) => boolean }

type Props = {
  items: MentionCandidate[]
  query: string
  command: (item: MentionCandidate) => void
  ref?: Ref<MentionMenuHandle>
}

const KIND_LABEL = { champion: '챔피언', augment: '증강', item: '아이템' } as const

/** @ 를 치면 뜨는 챔피언·증강·아이템 후보. 위·아래로 고르고 Enter나 누르기로 넣어요. */
export default function MentionMenu({ items, query, command, ref }: Props) {
  const [selected, setSelected] = useState(0)
  const [lastItems, setLastItems] = useState(items)
  // 후보가 바뀌면(검색어를 더 치면) 첫 후보를 다시 골라요.
  if (lastItems !== items) {
    setLastItems(items)
    setSelected(0)
  }

  useImperativeHandle(ref, () => ({
    onKeyDown(event) {
      // 한글 조합을 끝내는 Enter는 후보를 고르지 않아요.
      if (items.length === 0 || event.isComposing) return false
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

  const box = 'w-60 border border-line bg-surface py-1 shadow-pop'
  if (query.trim() === '') {
    return <div className={`${box} px-3 py-2.5 text-[13px] text-ink-3`}>챔피언·증강·아이템 이름을 쳐 주세요</div>
  }
  if (items.length === 0) return null

  return (
    <div role="listbox" aria-label="넣을 챔피언·증강·아이템" className={box}>
      {items.map((item, i) => (
        <button
          key={`${item.kind}:${item.id}`}
          type="button"
          role="option"
          aria-selected={i === selected}
          className={`flex h-10 w-full items-center gap-2.5 px-3 text-left text-[15px] text-ink ${i === selected ? 'bg-ice' : ''}`}
          onMouseEnter={() => setSelected(i)}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => command(item)}
        >
          {!item.iconUrl ? (
            <span aria-hidden="true" className="h-5 w-5 flex-none rounded-full bg-line" />
          ) : item.kind === 'augment' && item.rarity ? (
            <AugmentIcon
              src={item.iconUrl}
              rarity={item.rarity}
              tinted={item.tinted}
              frame="ring"
              className="h-5 w-5 flex-none rounded-mark bg-night"
            />
          ) : item.kind === 'item' ? (
            <img src={item.iconUrl} alt="" className="h-5 w-5 flex-none rounded-mark bg-night" />
          ) : (
            <img src={item.iconUrl} alt="" className="h-5 w-5 flex-none rounded-full" />
          )}
          <span className="min-w-0 truncate">{item.name}</span>
          <span className="ml-auto flex-none text-[13px] text-ink-3">{KIND_LABEL[item.kind]}</span>
        </button>
      ))}
    </div>
  )
}
