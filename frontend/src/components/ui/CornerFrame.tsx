import { createElement, type HTMLAttributes, type ReactNode } from 'react'

type Props = HTMLAttributes<HTMLElement> & {
  children: ReactNode
  as?: 'div' | 'li' | 'section' | 'article'
  /** 모서리 장식 크기(px). */
  size?: 12 | 16
}

/**
 * 왼쪽 위·오른쪽 아래에 금색 ㄱ자가 붙은 틀. 추천받은 글, 글 상세, 펼침 영역에만 써요(설계 3.8).
 * 틀 자체의 바탕·테두리·여백은 className으로 정해요.
 */
export default function CornerFrame({ children, as = 'div', size = 12, className = '', ...rest }: Props) {
  const corner = size === 16 ? 'h-4 w-4' : 'h-3 w-3'
  return createElement(
    as,
    { ...rest, 'data-corner-frame': true, className: `relative ${className}` },
    <span aria-hidden="true" className={`pointer-events-none absolute -top-px -left-px border-t-2 border-l-2 border-gold ${corner}`} />,
    children,
    <span aria-hidden="true" className={`pointer-events-none absolute -right-px -bottom-px border-r-2 border-b-2 border-gold ${corner}`} />,
  )
}
