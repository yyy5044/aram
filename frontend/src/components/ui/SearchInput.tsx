import type { InputHTMLAttributes } from 'react'
import { SearchIcon } from './icons'

type Props = InputHTMLAttributes<HTMLInputElement> & {
  /** 검색칸 이름(화면 읽기 프로그램용). */
  label: string
  wrapperClassName?: string
}

/** 돋보기가 있는 44px 검색칸. 나머지 속성은 input에 그대로 넘겨요. */
export default function SearchInput({ label, wrapperClassName = '', className = '', ...input }: Props) {
  return (
    <label
      className={`flex h-11 items-center gap-2 rounded-touch border border-line bg-surface px-3.5 text-ink-3 focus-within:border-teal focus-within:ring-3 focus-within:ring-teal-hi/20 ${wrapperClassName}`}
    >
      <SearchIcon className="h-5 w-5 flex-none" />
      <input
        type="search"
        aria-label={label}
        {...input}
        className={`h-full min-w-0 flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-ink-3 disabled:cursor-not-allowed ${className}`}
      />
    </label>
  )
}
