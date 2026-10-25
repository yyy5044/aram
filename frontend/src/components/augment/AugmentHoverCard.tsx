import { autoUpdate, computePosition, flip, offset, shift } from '@floating-ui/dom'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useAugmentDetail } from '../../api/gamedata'
import { useLanguage } from '../../lib/language'
import AugmentCard from './AugmentCard'

/** 마우스를 이만큼 올려 두면 카드가 떠요. 지나가다 스친 박스까지 카드를 띄우지 않게요. */
const OPEN_DELAY = 200
/** 박스에서 카드로 마우스를 옮기는 동안(사이 6px) 닫히지 않게 조금 기다려요. */
const CLOSE_DELAY = 120

type Props = {
  augmentId: string
  label: string
  children: ReactNode
  /** 글쓰기 편집기 안에서는 false: Tab·누르기로 박스에 초점이 가면 글 쓰던 자리(커서)를 잃어요. */
  focusable?: boolean
}

/**
 * 본문 증강 박스를 감싸서 그 증강의 카드를 띄워요. PC는 마우스를 올리면, 휴대폰은 누르면 열리고,
 * 박스·카드 밖으로 나가거나 바깥을 누르거나 Esc를 누르면 닫혀요. 키보드로 박스에 오면 열려요.
 * 박스는 눌러도 다른 화면으로 가지 않아요.
 */
export default function AugmentHoverCard({ augmentId, label, children, focusable = true }: Props) {
  const [open, setOpen] = useState(false)
  const boxRef = useRef<HTMLSpanElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const timer = useRef<number | undefined>(undefined)
  /** 방금 누른 손가락·마우스. 누를 때 생기는 초점으로 열리지 않게, 터치 누름만 열고 닫게 해요. */
  const pressedWith = useRef<string | null>(null)
  /** 카드 안을 눌러 박스의 초점이 빠질 때는 닫지 않아요(카드 글을 고르거나 복사할 수 있게). */
  const pressingCard = useRef(false)

  function later(next: boolean, delay: number) {
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setOpen(next), delay)
  }
  function now(next: boolean) {
    window.clearTimeout(timer.current)
    setOpen(next)
  }

  useEffect(() => () => window.clearTimeout(timer.current), [])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') now(false)
    }
    function onPointerDown(e: PointerEvent) {
      const target = e.target as Node
      if (boxRef.current?.contains(target) || cardRef.current?.contains(target)) return
      now(false)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onPointerDown)
    return () => {
      pressingCard.current = false
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onPointerDown)
    }
  }, [open])

  useEffect(() => {
    const box = boxRef.current
    const card = cardRef.current
    if (!open || !box || !card) return
    return autoUpdate(box, card, () => {
      void computePosition(box, card, {
        placement: 'bottom-start',
        // 카드가 높아서(492px) 위아래 어디에도 자리가 없을 때가 많아요. 그때는 위아래로도 밀어서 화면 안에 둬요.
        middleware: [offset(6), flip(), shift({ padding: 8, crossAxis: true })],
      }).then(({ x, y }) => {
        card.style.left = `${x}px`
        card.style.top = `${y}px`
        card.style.visibility = 'visible'
      })
    })
  }, [open])

  const hover = {
    onPointerEnter: (e: React.PointerEvent) => {
      if (e.pointerType === 'mouse') later(true, open ? 0 : OPEN_DELAY)
    },
    onPointerLeave: (e: React.PointerEvent) => {
      if (e.pointerType === 'mouse') later(false, CLOSE_DELAY)
    },
  }

  return (
    <>
      <span
        ref={boxRef}
        role="button"
        tabIndex={focusable ? 0 : undefined}
        aria-label={`${label} 증강 카드 보기`}
        aria-expanded={open}
        className="cursor-default rounded-mark focus-visible:outline-2 focus-visible:outline-teal"
        {...hover}
        onPointerDown={(e) => {
          pressedWith.current = e.pointerType
        }}
        onClick={() => {
          if (pressedWith.current && pressedWith.current !== 'mouse') now(!open)
          pressedWith.current = null
        }}
        onFocus={() => {
          if (!pressedWith.current) now(true)
        }}
        onBlur={(e) => {
          if (pressingCard.current) pressingCard.current = false
          else if (!cardRef.current?.contains(e.relatedTarget as Node | null)) later(false, 0)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            now(!open)
          }
        }}
      >
        {children}
      </span>
      {open &&
        createPortal(
          <div
            ref={cardRef}
            className="absolute top-0 left-0 z-50 overflow-hidden rounded-[14px] bg-night shadow-pop"
            // 자리를 잡기 전에는 숨겨요. 안 그러면 한 순간 화면 왼쪽 위에 카드가 보여요.
            style={{ visibility: 'hidden' }}
            {...hover}
            onPointerDown={() => {
              pressingCard.current = true
            }}
          >
            <CardBody augmentId={augmentId} />
          </div>,
          document.body,
        )}
    </>
  )
}

/** 선택 언어 카드 한 장. 번역이 없으면 원문을 보여줘요. 게임 카드 그림은 반쯤 비쳐서 밤하늘 바탕 위에 둬요. */
function CardBody({ augmentId }: { augmentId: string }) {
  const { language } = useLanguage()
  const { data, isPending, isError } = useAugmentDetail(augmentId, language)

  const text = data ? (data.translation ?? data.original) : null
  if (data && text) {
    return <AugmentCard text={text} rarity={data.rarity} iconUrl={data.iconUrl} iconTinted={data.iconTinted} />
  }
  const message = isPending ? '불러오는 중…' : isError ? '증강 정보를 불러오지 못했어요' : '아직 설명이 없어요'
  // 카드와 같은 크기로 둬요. 다 받은 뒤 커지면 이미 잡은 자리에서 화면 밖으로 밀려날 수 있어요.
  return <p className="grid h-[492px] w-[300px] place-items-center px-4 text-center text-[15px] text-nav">{message}</p>
}
