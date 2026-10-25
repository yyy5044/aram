import type { JSONContent } from '@tiptap/core'

const EDITOR_ONLY_ATTRS = ['uploadId', 'truncated']

/**
 * 저장하기 전에 본문을 정리해요. 파일을 넣지 않은 영상 칸과 사진 칸은 빼고,
 * 편집기 안에서만 쓰는 속성(uploadId, truncated)은 지워요.
 */
export function cleanContent(node: JSONContent): JSONContent {
  const out: JSONContent = { ...node }
  if (node.attrs && node.type === 'video') {
    const attrs = { ...node.attrs }
    for (const key of EDITOR_ONLY_ATTRS) delete attrs[key]
    out.attrs = attrs
  }
  if (node.content) {
    out.content = node.content
      .filter((child) => child.type !== 'uploadBox' && !(child.type === 'video' && !child.attrs?.src))
      .map(cleanContent)
  }
  return out
}
