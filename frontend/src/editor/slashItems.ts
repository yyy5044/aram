export type SlashItem = {
  key: 'video' | 'image'
  label: string
  hint: string
  /** 넣을 노드: 영상 칸(video) 또는 사진 칸(uploadBox). */
  node: 'video' | 'uploadBox'
  /** / 뒤에 친 글자가 이것으로 시작하면 이 항목을 보여줘요. */
  match: string[]
}

export const SLASH_ITEMS: SlashItem[] = [
  { key: 'video', label: '영상', hint: '/v', node: 'video', match: ['v', '영'] },
  { key: 'image', label: '사진', hint: '/i', node: 'uploadBox', match: ['i', '사'] },
]

export function filterSlashItems(query: string): SlashItem[] {
  const q = query.trim().toLowerCase()
  if (q === '') return SLASH_ITEMS
  return SLASH_ITEMS.filter((item) => item.match.some((m) => q.startsWith(m)))
}
