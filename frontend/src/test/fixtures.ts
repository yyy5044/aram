import type { Augment, Champion, Me, Page, PostListItem, Profile } from '../api/types'

export function profile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: 1,
    nickname: '하포',
    avatarUrl: null,
    joinedAt: '2026-10-24T07:34:31Z',
    profilePublic: true,
    mine: false,
    locked: false,
    stats: { postCount: 12, commentCount: 37, scrapCount: 5, receivedLikeCount: 58 },
    activity: { from: '2025-10-19', to: '2026-10-24', days: [{ date: '2026-10-24', posts: 1, comments: 2 }] },
    ...overrides,
  }
}

export const amumu: Champion = {
  id: 'Amumu',
  nameKo: '아무무',
  imageUrl: 'https://ddragon.leagueoflegends.com/cdn/16.21.1/img/champion/Amumu.png',
}
export const jinx: Champion = {
  id: 'Jinx',
  nameKo: '징크스',
  imageUrl: 'https://ddragon.leagueoflegends.com/cdn/16.21.1/img/champion/Jinx.png',
}
export const legDay: Augment = {
  id: 'ARAM_LegDay',
  nameKo: '하체 운동의 날',
  iconUrl: 'https://raw.communitydragon.org/latest/game/assets/ux/cherry/augments/icons/legday_small.png',
  active: true,
  rarity: 'SILVER',
}
export const oldAugment: Augment = { id: 'OLD', nameKo: '옛 증강', iconUrl: 'https://example.test/old.png', active: false, rarity: 'GOLD' }
export const prismAugment: Augment = {
  id: 'ARAM_GiantSlayer',
  nameKo: '거인 학살자',
  iconUrl: 'https://example.test/gs.png',
  active: true,
  rarity: 'PRISMATIC',
}

export const meYangho: Me = { id: 1, nickname: '양호', avatarUrl: null, admin: false, suggestedNickname: '양호', profilePublic: true, profileImageId: null, discordAvatarUrl: null }
export const meMinsu: Me = { id: 2, nickname: '민수', avatarUrl: null, admin: false, suggestedNickname: '민수', profilePublic: true, profileImageId: null, discordAvatarUrl: null }
export const meAdmin: Me = { id: 9, nickname: '관리자', avatarUrl: null, admin: true, suggestedNickname: '관리자', profilePublic: true, profileImageId: null, discordAvatarUrl: null }

export function listItem(overrides: Partial<PostListItem> = {}): PostListItem {
  return {
    id: 1,
    title: '아무무는 이 증강 두 개면 한타 지배합니다',
    gamePatch: '26.21',
    author: { id: 1, nickname: '양호', avatarUrl: null },
    champions: [amumu],
    augments: [legDay],
    likeCount: 24,
    commentCount: 8,
    createdAt: new Date(Date.now() - 2 * 3600_000).toISOString(),
    ...overrides,
  }
}

export function page<T>(items: T[], overrides: Partial<Page<T>> = {}): Page<T> {
  return { items, page: 1, size: 20, totalItems: items.length, totalPages: items.length ? 1 : 0, ...overrides }
}
