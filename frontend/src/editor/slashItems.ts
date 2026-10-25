export type SlashItem = {
  key: 'video' | 'image'
  label: string
  hint: string
  /** 넣을 노드: 영상 칸(video) 또는 사진 칸(uploadBox). */
  node: 'video' | 'uploadBox'
  /** / 뒤에 친 글자가 이 낱말들 중 하나의 앞부분이면 이 항목을 보여줘요(/v, /vi, /영상 …). */
  keywords: string[]
}

export const SLASH_ITEMS: SlashItem[] = [
  { key: 'video', label: '영상', hint: '/v', node: 'video', keywords: ['v', 'video', '영상'] },
  { key: 'image', label: '사진', hint: '/i', node: 'uploadBox', keywords: ['i', 'image', '사진'] },
]

export function filterSlashItems(query: string): SlashItem[] {
  const q = query.trim().toLowerCase()
  if (q === '') return SLASH_ITEMS
  // /vote 처럼 낱말이 이어지면 맞지 않게 해서, Enter가 친 글자를 지우고 칸을 넣지 않게 해요.
  return SLASH_ITEMS.filter((item) => item.keywords.some((k) => k.startsWith(q)))
}
