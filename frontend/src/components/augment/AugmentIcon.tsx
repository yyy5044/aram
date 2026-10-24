import type { CSSProperties } from 'react'
import type { AugmentRarity } from '../../api/types'

/** 게임 큰 아이콘의 등급 색을 닮은 그라디언트. 흰 작은 아이콘에 입혀요. */
const TINTS: Record<AugmentRarity, string> = {
  PRISMATIC: 'linear-gradient(135deg, #f5d0fe 0%, #c4b5fd 35%, #93c5fd 65%, #a7f3d0 100%)',
  GOLD: 'linear-gradient(180deg, #f6e7c8 0%, #d4b07a 55%, #9a7443 100%)',
  SILVER: 'linear-gradient(180deg, #e2e8f0 0%, #94a3b8 60%, #64748b 100%)',
}

const SELECTION = 'https://raw.communitydragon.org/latest/game/assets/ux/kiwi/augments/augmentselection/'

/** 게임 증강 선택 화면의 아이콘 칸 테두리(64×64, 가장자리 4px, 가운데는 비어 있어요). */
const FRAMES: Record<AugmentRarity, string> = {
  PRISMATIC: SELECTION + 'abilityframe_prismatic.png',
  GOLD: SELECTION + 'abilityframe_gold.png',
  SILVER: SELECTION + 'abilityframe_silver.png',
}

/** 작은 아이콘(24px 안팎)에는 그림 테두리가 뭉개져서 등급 색 선만 둘러요. */
const RINGS: Record<AugmentRarity, string> = {
  PRISMATIC: '#c4b5fd',
  GOLD: '#d4b07a',
  SILVER: '#94a3b8',
}

type Props = {
  src: string
  rarity: AugmentRarity
  /** 서버가 색 있는 큰 아이콘을 못 줘서 흰 작은 아이콘을 줬을 때 true. */
  tinted?: boolean
  className?: string
  /** 아이콘 자체가 이름을 알려야 할 때(글 목록의 태그 아이콘). 없으면 꾸밈 그림이에요. */
  alt?: string
  /** 등급 테두리: 큰 칸은 게임 테두리 그림(image), 작은 아이콘은 얇은 선(ring). */
  frame?: 'image' | 'ring'
}

function paint(src: string, rarity: AugmentRarity): CSSProperties {
  const mask = `url("${src}")`
  return {
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
}

/**
 * 증강 아이콘. 보통은 등급 색이 들어 있는 그림을 그대로 보여주고, 흰 아이콘이면 그 모양대로 등급 색을 칠해요
 * (CSS 마스크. CommunityDragon 그림은 다른 사이트에서 써도 되게 열려 있어요). frame을 주면 등급 테두리를 둘러요.
 */
export default function AugmentIcon({ src, rarity, tinted = false, className, alt, frame }: Props) {
  if (!tinted && !frame) return <img src={src} alt={alt ?? ''} title={alt} className={className} />

  const icon = tinted ? (
    <span className="block h-full w-full" style={paint(src, rarity)} />
  ) : (
    <img src={src} alt={alt ?? ''} title={alt} className="h-full w-full object-contain" />
  )
  // 색을 칠한 아이콘은 그림(img)이 없으니 바깥 칸이 이름을 알려요.
  const label = tinted ? (alt ? { role: 'img', 'aria-label': alt, title: alt } : { 'aria-hidden': true }) : {}
  const ring: CSSProperties | undefined =
    frame === 'ring' ? { outline: `1px solid ${RINGS[rarity]}`, outlineOffset: '-1px' } : undefined

  return (
    <span
      {...label}
      data-rarity-ring={frame === 'ring' ? rarity : undefined}
      className={`relative inline-block overflow-hidden ${className ?? ''}`}
      style={ring}
    >
      {icon}
      {frame === 'image' && (
        <img src={FRAMES[rarity]} alt="" aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full" />
      )}
    </span>
  )
}
