import { mergeAttributes, Node } from '@tiptap/core'
import type { Node as PmNode } from '@tiptap/pm/model'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { ALLOW_CLIP_REMOVAL } from './clipGuard'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { stopDropsOnUploadBox } from './stopDrops'
import VideoNodeView from './VideoNodeView'

declare module '@tiptap/core' {
  interface EditorEvents {
    /** 키보드·범위 지우기로 클립을 지우려다 막혔어요. 편집기가 ✕ 버튼을 안내해요. */
    clipRemovalBlocked: Record<string, never>
  }
}

function clipCounts(doc: PmNode) {
  const counts = new Map<string, number>()
  doc.descendants((node) => {
    if (node.type.name === 'video' && node.attrs.src) counts.set(node.attrs.src, (counts.get(node.attrs.src) ?? 0) + 1)
  })
  return counts
}

/**
 * 본문의 영상 클립. 저장되는 속성은 src(/api/videos/{id}) 하나예요.
 * uploadId·truncated는 편집기 안에서만 쓰는 값이라 저장 전에 cleanContent가 지워요.
 * 변환이 끝난 클립은 실수로 지워지지 않게 ✕ 버튼으로만 뺄 수 있어요. 백스페이스·Delete·범위 지우기·잘라내기로
 * 클립이 줄어드는 변경은 막아요. 끌어서 옮기기는 지우고 다시 넣는 한 번의 변경이라 그대로 돼요.
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

  addProseMirrorPlugins() {
    const editor = this.editor
    return [
      new Plugin({
        key: new PluginKey('protectClips'),
        filterTransaction(tr, state) {
          if (!tr.docChanged || tr.getMeta(ALLOW_CLIP_REMOVAL)) return true
          const after = clipCounts(tr.doc)
          for (const [src, count] of clipCounts(state.doc)) {
            if ((after.get(src) ?? 0) < count) {
              editor.emit('clipRemovalBlocked', {})
              return false
            }
          }
          return true
        },
      }),
    ]
  },

  addNodeView() {
    return ReactNodeViewRenderer(VideoNodeView, { stopEvent: stopDropsOnUploadBox })
  },
})
