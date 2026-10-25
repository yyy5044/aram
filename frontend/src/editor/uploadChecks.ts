import type { Editor } from '@tiptap/core'
import { IMAGE_TYPES, MAX_IMAGE_BYTES, MAX_IMAGES_PER_POST } from '../api/images'
import { MAX_VIDEO_BYTES, MAX_VIDEOS_PER_POST } from '../api/videos'

const VIDEO_EXTENSIONS = /\.(mp4|m4v|mov|webm|mkv|avi)$/i

function count(editor: Editor, test: (name: string, attrs: Record<string, unknown>) => boolean) {
  let n = 0
  editor.state.doc.descendants((node) => {
    if (test(node.type.name, node.attrs)) n++
  })
  return n
}

/** 올리기 전에 막을 이유가 있으면 화면에 보여줄 문장을, 없으면 null을 돌려줘요. */
export function videoFileProblem(editor: Editor, file: File, selfCounted = false): string | null {
  if (!file.type.startsWith('video/') && !VIDEO_EXTENSIONS.test(file.name)) return '영상 파일만 넣을 수 있어요'
  if (file.size > MAX_VIDEO_BYTES) return '영상 파일은 200MB까지 올릴 수 있어요'
  // 이미 들어갔거나 올리는 중인 영상만 세요. 다시 올리는 칸(selfCounted)은 자기 자신을 빼고 세요.
  const taken = count(editor, (name, attrs) => name === 'video' && Boolean(attrs.src || attrs.uploadId)) - (selfCounted ? 1 : 0)
  if (taken >= MAX_VIDEOS_PER_POST) {
    return '영상은 한 글에 3개까지 넣을 수 있어요'
  }
  return null
}

export function imageFileProblem(editor: Editor, file: File): string | null {
  if (!IMAGE_TYPES.includes(file.type)) return 'jpg, png, webp, gif 이미지만 올릴 수 있어요'
  if (file.size > MAX_IMAGE_BYTES) return '이미지는 10MB 이하만 올릴 수 있어요'
  if (count(editor, (name) => name === 'image') >= MAX_IMAGES_PER_POST) return '이미지는 한 글에 10장까지 넣을 수 있어요'
  return null
}
