import type { Augment, AugmentRarity, Champion } from '../api/types'
import { matchIndex, normalizeName } from './tagSearch'

export type MentionKind = 'champion' | 'augment'

export type MentionCandidate = {
  kind: MentionKind
  id: string
  name: string
  iconUrl: string | null
  rarity?: AugmentRarity
  tinted?: boolean
}

const MAX_CANDIDATES = 8

/**
 * 본문 @ 메뉴의 후보. 챔피언과 사용 중인 증강을 함께, 이름이 검색어로 시작하는 것부터 가나다순으로 8개까지.
 * 검색 규칙은 태그 검색과 같아요(띄어쓰기·대소문자 무시, 초성·섞어 쓰기).
 */
export function mentionCandidates(query: string, champions: Champion[], augments: Augment[]): MentionCandidate[] {
  if (normalizeName(query) === '') return []
  const all: MentionCandidate[] = [
    ...champions.map((c): MentionCandidate => ({ kind: 'champion', id: c.id, name: c.nameKo, iconUrl: c.imageUrl })),
    ...augments
      .filter((a) => a.active)
      .map(
        (a): MentionCandidate => ({
          kind: 'augment',
          id: a.id,
          name: a.nameKo,
          iconUrl: a.iconUrl,
          rarity: a.rarity,
          tinted: a.iconTinted,
        }),
      ),
  ]
  return all
    .map((c) => ({ c, at: matchIndex(c.name, query) }))
    .filter(({ at }) => at >= 0)
    .sort((x, y) => Number(x.at !== 0) - Number(y.at !== 0) || x.c.name.localeCompare(y.c.name, 'ko'))
    .slice(0, MAX_CANDIDATES)
    .map(({ c }) => c)
}
