import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'

export type GridItem = {
  id: string
  name: string
  image: string | null
  count: number
  /** 챔피언 초상화처럼 둥글게 보여줄지. */
  round?: boolean
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
    <ul ref={listRef} className="grid grid-cols-[repeat(auto-fill,minmax(5.5rem,1fr))] gap-2">
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
      <li className="contents">
        <button
          type="button"
          data-id={item.id}
          aria-label={item.name}
          aria-expanded={open}
          onClick={() => onToggle(item.id)}
          className={`relative flex flex-col items-center rounded-xl border px-1 py-2 text-center hover:bg-slate-900 ${
            open ? 'border-amber-300 bg-slate-900' : 'border-transparent'
          }`}
        >
          {item.image ? (
            <img
              src={item.image}
              alt=""
              className={`mb-1.5 h-13 w-13 bg-slate-800 ${item.round ? 'rounded-full' : 'rounded-lg'}`}
            />
          ) : (
            <span aria-hidden="true" className="mb-1.5 h-13 w-13 rounded-lg bg-slate-800" />
          )}
          <span className="text-xs leading-tight text-slate-100">{item.name}</span>
          <span className={`mt-0.5 text-[11px] ${item.count ? 'text-amber-300' : 'text-slate-500'}`}>
            글 {item.count}개
          </span>
          {open && (
            <span
              aria-hidden="true"
              className="absolute -bottom-2.5 left-1/2 -ml-2 border-8 border-transparent border-b-amber-300"
            />
          )}
        </button>
      </li>
      {children}
    </>
  )
}

function Panel({ children }: { children: ReactNode }) {
  return <li className="col-span-full mt-1">{children}</li>
}
