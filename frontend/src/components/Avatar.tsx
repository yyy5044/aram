type Props = {
  src: string | null
  size: number
  /** 사진이 없을 때 첫 글자를 보여줄 닉네임. */
  name?: string | null
  className?: string
}

/** 원형 프로필 사진(금색 테두리). 사진이 없으면 남색 원에 닉네임 첫 글자를 보여줘요. */
export default function Avatar({ src, size, name, className = '' }: Props) {
  const style = { width: `${size}px`, height: `${size}px` }
  if (src) {
    return <img src={src} alt="" style={style} className={`flex-none rounded-full object-cover ring-1 ring-gold ${className}`} />
  }
  const initial = name ? Array.from(name.trim())[0] ?? '' : ''
  return (
    <span
      aria-hidden="true"
      style={{ ...style, fontSize: `${Math.round(size * 0.4)}px` }}
      className={`inline-grid flex-none place-items-center rounded-full bg-linear-to-br from-[#1d5570] to-night leading-none font-bold text-gold-pale ring-1 ring-gold ${className}`}
    >
      {initial}
    </span>
  )
}
