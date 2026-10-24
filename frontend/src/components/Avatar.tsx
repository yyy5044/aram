type Props = {
  src: string | null
  size: number
  className?: string
}

/** 원형 프로필 사진. 사진이 없으면 기본 원형을 보여줘요. */
export default function Avatar({ src, size, className = '' }: Props) {
  const style = { width: `${size}px`, height: `${size}px` }
  if (src) {
    return <img src={src} alt="" style={style} className={`flex-none rounded-full object-cover ${className}`} />
  }
  return <span aria-hidden="true" style={style} className={`inline-block flex-none rounded-full bg-indigo-500 ${className}`} />
}
