import type { CSSProperties } from 'react'
import type { AugmentRarity } from '../../api/types'

/** 게임 큰 아이콘의 등급 색을 닮은 그라디언트. 흰 작은 아이콘에 입혀요. */
const TINTS: Record<AugmentRarity, string> = {
  PRISMATIC: 'linear-gradient(135deg, #f5d0fe 0%, #c4b5fd 35%, #93c5fd 65%, #a7f3d0 100%)',
  GOLD: 'linear-gradient(180deg, #f6e7c8 0%, #d4b07a 55%, #9a7443 100%)',
  SILVER: 'linear-gradient(180deg, #e2e8f0 0%, #94a3b8 60%, #64748b 100%)',
}

type Props = {
  src: string
  rarity: AugmentRarity
  /** 서버가 색 있는 큰 아이콘을 못 줘서 흰 작은 아이콘을 줬을 때 true. */
  tinted?: boolean
  className?: string
  /** 아이콘 자체가 이름을 알려야 할 때(글 목록의 태그 아이콘). 없으면 꾸밈 그림이에요. */
  alt?: string
}

/**
 * 증강 아이콘. 보통은 등급 색이 들어 있는 그림을 그대로 보여주고, 흰 아이콘이면 그 모양대로 등급 색을 칠해요
 * (CSS 마스크. CommunityDragon 그림은 다른 사이트에서 써도 되게 열려 있어요).
 */
export default function AugmentIcon({ src, rarity, tinted = false, className, alt }: Props) {
  if (!tinted) return <img src={src} alt={alt ?? ''} title={alt} className={className} />
  const mask = `url("${src}")`
  const paint: CSSProperties = {
    backgroundImage: TINTS[rarity],
    maskImage: mask,
    WebkitMaskImage: mask,
    maskSize: 'contain',
    WebkitMaskSize: 'contain',
    maskRepeat: 'no-repeat',
    WebkitMaskRepeat: 'no-repeat',
    maskPosition: 'center',
    WebkitMaskPosition: 'center',
  }
  return (
    <span
      {...(alt ? { role: 'img', 'aria-label': alt, title: alt } : { 'aria-hidden': true })}
      className={`inline-block ${className ?? ''}`}
    >
      <span className="block h-full w-full" style={paint} />
    </span>
  )
}
