import { Node } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { stopDropsOnUploadBox } from './stopDrops'
import UploadBoxNodeView from './UploadBoxNodeView'

/** 편집기 안에서만 쓰는 사진 칸. 저장 전에 cleanContent가 빼고, 서버 본문 규칙에는 없어요. */
export const UploadBoxNode = Node.create({
  name: 'uploadBox',
  group: 'block',
  atom: true,
  draggable: true,

  parseHTML() {
    return []
  },

  renderHTML() {
    return ['div', { 'data-upload-box': '' }]
  },

  addNodeView() {
    return ReactNodeViewRenderer(UploadBoxNodeView, { stopEvent: stopDropsOnUploadBox })
  },
})
