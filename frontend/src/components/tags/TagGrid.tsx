import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import type { AugmentRarity } from '../../api/types'
import AugmentIcon from '../augment/AugmentIcon'

export type GridItem = {
  id: string
  name: string
  image: string | null
  /** 챔피언 초상화처럼 둥글게 보여줄지. */
  round?: boolean
  /** 증강 칸이면 등급. 게임 테두리를 두르고, tinted면 흰 아이콘에 등급 색을 입혀요. */
  rarity?: AugmentRarity
  tinted?: boolean
}

type Props = {
  items: GridItem[]
  openId: string | null
  onToggle: (id: string) => void
  renderPanel: (id: string) => ReactNode
}

/** 어떤 칸 배치(key)에서 잰 결과인지 같이 기억해요. after가 null이면 아직 재기 전이에요. */
type Measured = { key: string; after: string | null }

/**
 * 칸 격자. 펼친 칸이 있으면 그 칸이 놓인 줄의 마지막 칸 뒤에 펼침 영역을 끼워 넣어요.
 * 줄은 칸의 offsetTop이 같은지로 판단해요. 펼침 영역이 줄을 밀어내면 잘못 재니까, 재는 동안은
 * 펼침 영역을 맨 뒤에 두고 잰 뒤에 옮겨요(useLayoutEffect라 화면에 그려지기 전에 끝나요).
 * 위치 정보가 없는 환경(jsdom)에서는 모두 한 줄로 봐요.
 */
export default function TagGrid({ items, openId, onToggle, renderPanel }: Props) {
  const listRef = useRef<HTMLUListElement>(null)
  const [measured, setMeasured] = useState<Measured | null>(null)
  const openIndex = openId === null ? -1 : items.findIndex((it) => it.id === openId)
  const key = items.map((it) => it.id).join('|') + '#' + openIndex
  const current = measured?.key === key ? measured : null

  useLayoutEffect(() => {
    if (openIndex < 0 || current?.after != null) return
    const buttons = listRef.current?.querySelectorAll<HTMLElement>('[data-id]') ?? []
    const open = buttons[openIndex]
    if (!open) return
    let last = items[openIndex].id
    for (let i = openIndex + 1; i < buttons.length; i++) {
      if (buttons[i].offsetTop !== open.offsetTop) break
      last = items[i].id
    }
    setMeasured({ key, after: last })
  }, [items, openIndex, key, current])

  useEffect(() => {
    if (openIndex < 0) return
    // 창 크기가 바뀌면 펼침 영역을 맨 뒤로 보낸 채 다시 재요.
    const remeasure = () => setMeasured({ key, after: null })
    window.addEventListener('resize', remeasure)
    return () => window.removeEventListener('resize', remeasure)
  }, [openIndex, key])

  const anchor = openIndex < 0 ? null : (current?.after ?? items[items.length - 1].id)

  return (
    <ul ref={listRef} className="grid grid-cols-3 gap-1 sm:grid-cols-[repeat(auto-fill,minmax(104px,1fr))] sm:gap-2">
      {items.map((item) => {
        const open = item.id === openId
        return (
          <Item key={item.id} item={item} open={open} onToggle={onToggle}>
            {open && anchor === item.id && <Panel>{renderPanel(item.id)}</Panel>}
            {!open && anchor === item.id && openId !== null && <Panel>{renderPanel(openId)}</Panel>}
          </Item>
        )
      })}
    </ul>
  )
}

function Item({
  item,
  open,
  onToggle,
  children,
}: {
  item: GridItem
  open: boolean
  onToggle: (id: string) => void
  children: ReactNode
}) {
  return (
    <>
      {/* li 자체를 격자 칸으로 둬요. display: contents는 오래된 Safari에서 목록 의미를 지워요. */}
      <li className="flex">
        <button
          type="button"
          data-id={item.id}
          aria-label={item.name}
          aria-expanded={open}
          onClick={() => onToggle(item.id)}
          className={`relative flex w-full flex-col items-center gap-1.5 rounded-touch text-center focus-visible:outline-2 focus-visible:outline-teal ${
            open
              ? 'border-2 border-gold bg-surface px-[5px] pt-[11px] pb-[9px]'
              : 'border border-transparent px-1.5 pt-3 pb-2.5 hover:border-line-soft hover:bg-ice'
          }`}
        >
          {item.image && item.rarity ? (
            <AugmentIcon
              src={item.image}
              rarity={item.rarity}
              tinted={item.tinted}
              frame="image"
              className="h-12 w-12 rounded-mark bg-night sm:h-14 sm:w-14"
            />
          ) : item.image ? (
            <img
              src={item.image}
              alt=""
              className={`h-12 w-12 bg-line-soft sm:h-14 sm:w-14 ${item.round ? 'rounded-full ring-1 ring-gold' : 'rounded-mark'}`}
            />
          ) : (
            <span aria-hidden="true" className="h-12 w-12 rounded-mark bg-line-soft sm:h-14 sm:w-14" />
          )}
          <span className="line-clamp-2 text-[13px] leading-tight font-medium text-ink">{item.name}</span>
          {open && (
            <span
              aria-hidden="true"
              className="absolute -bottom-[13px] left-1/2 -ml-2 border-8 border-transparent border-t-gold"
            />
          )}
        </button>
      </li>
      {children}
    </>
  )
}

function Panel({ children }: { children: ReactNode }) {
  return <li className="col-span-full mt-2 mb-1">{children}</li>
}
