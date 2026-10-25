import { mergeAttributes, Node } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import VideoNodeView from './VideoNodeView'

/**
 * 본문의 영상 클립. 저장되는 속성은 src(/api/videos/{id}) 하나예요.
 * uploadId·truncated는 편집기 안에서만 쓰는 값이라 저장 전에 cleanContent가 지워요.
 */
export const VideoNode = Node.create({
  name: 'video',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      src: { default: null },
      uploadId: { default: null, rendered: false },
      truncated: { default: false, rendered: false },
    }
  },

  parseHTML() {
    return [{ tag: 'video[src]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['video', mergeAttributes(HTMLAttributes)]
  },

  addNodeView() {
    return ReactNodeViewRenderer(VideoNodeView)
  },
})
