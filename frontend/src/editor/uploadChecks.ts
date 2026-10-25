import type { Editor } from '@tiptap/core'
import { IMAGE_TYPES, MAX_IMAGE_BYTES, MAX_IMAGES_PER_POST } from '../api/images'
import { MAX_VIDEO_BYTES, MAX_VIDEOS_PER_POST } from '../api/videos'

/** 서버가 받는 형식(MP4·MOV는 ftyp, WebM·MKV는 EBML 머리). */
const SUPPORTED_VIDEO = /\.(mp4|m4v|mov|webm|mkv)$/i
const SUPPORTED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm', 'video/x-matroska', 'video/x-m4v']
/** 영상처럼 보이는 파일(받지 않는 형식 포함). 편집기에 놓였을 때 브라우저가 열어 버리지 않게 가로채는 데 써요. */
const ANY_VIDEO = /\.(mp4|m4v|mov|webm|mkv|avi|wmv|flv|ts|mts|m2ts|3gp|mpg|mpeg)$/i

export function looksLikeVideo(file: File): boolean {
  return file.type.startsWith('video/') || ANY_VIDEO.test(file.name)
}

function count(editor: Editor, test: (name: string, attrs: Record<string, unknown>) => boolean) {
  let n = 0
  editor.state.doc.descendants((node) => {
    if (test(node.type.name, node.attrs)) n++
  })
  return n
}

/** 올리기 전에 막을 이유가 있으면 화면에 보여줄 문장을, 없으면 null을 돌려줘요. */
export function videoFileProblem(editor: Editor, file: File, selfCounted = false): string | null {
  if (!looksLikeVideo(file)) return '영상 파일만 넣을 수 있어요'
  if (!SUPPORTED_VIDEO_TYPES.includes(file.type) && !SUPPORTED_VIDEO.test(file.name)) return 'mp4, mov, webm, mkv 영상만 올릴 수 있어요'
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
