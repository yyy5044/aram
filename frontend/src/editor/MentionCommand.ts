import { Extension } from '@tiptap/core'
import { PluginKey } from '@tiptap/pm/state'
import { ReactRenderer } from '@tiptap/react'
import Suggestion, { exitSuggestion } from '@tiptap/suggestion'
import type { MentionCandidate, MentionKind } from '../lib/mentionCandidates'
import MentionMenu, { type MentionMenuHandle } from './MentionMenu'

/** 한 글에 넣을 수 있는 본문 박스 수. 서버 PostContentValidator.MAX_MENTIONS와 같아요. */
export const MAX_MENTIONS = 30

/** @ 메뉴가 쓰는 것: 후보 계산, 고른 뒤 알림(태그 칸 자동 추가), 오류 알림. */
export type MentionSource = {
  candidates(query: string): MentionCandidate[]
  onPicked(kind: MentionKind, id: string): void
  onError(message: string): void
}

const mentionKey = new PluginKey('mentionCommand')

/**
 * 줄 맨 앞이나 띄어쓰기 뒤에서 @ 를 치면 챔피언·증강 후보를 띄워요. 검색어에 띄어쓰기도 들어가요(@거석상의 용).
 * 고르면 친 글자를 지우고 그 자리에 박스와 띄어쓰기 한 칸을 넣어요.
 */
export const MentionCommand = Extension.create<{ source: MentionSource | null }>({
  name: 'mentionCommand',

  addOptions() {
    return { source: null }
  },

  addProseMirrorPlugins() {
    const source = this.options.source
    if (!source) return []
    return [
      Suggestion<MentionCandidate, MentionCandidate>({
        pluginKey: mentionKey,
        editor: this.editor,
        char: '@',
        allowSpaces: true,
        allowedPrefixes: [' '],
        items: ({ query }) => source.candidates(query),
        command: ({ editor, range, props }) => {
          let count = 0
          editor.state.doc.descendants((node) => {
            if (node.type.name === 'tagMention') count++
          })
          if (count >= MAX_MENTIONS) {
            exitSuggestion(editor.view, mentionKey)
            source.onError('본문 태그는 한 글에 30개까지 넣을 수 있어요')
            return
          }
          editor
            .chain()
            .focus()
            .deleteRange(range)
            .insertContent([
              { type: 'tagMention', attrs: { kind: props.kind, id: props.id, label: props.name } },
              { type: 'text', text: ' ' },
            ])
            .run()
          source.onPicked(props.kind, props.id)
        },
        render: () => {
          let renderer: ReactRenderer<MentionMenuHandle> | null = null
          let unmount: (() => void) | null = null

          const close = () => {
            unmount?.()
            unmount = null
            renderer?.destroy()
            renderer = null
          }

          return {
            onStart: (props) => {
              renderer = new ReactRenderer(MentionMenu, {
                props: { items: props.items, query: props.query, command: props.command },
                editor: props.editor,
              })
              unmount = props.mount(renderer.element)
            },
            onUpdate: (props) => {
              renderer?.updateProps({ items: props.items, query: props.query, command: props.command })
            },
            onKeyDown: ({ event, view }) => {
              if (event.key === 'Escape') {
                exitSuggestion(view, mentionKey)
                close()
                return true
              }
              return renderer?.ref?.onKeyDown(event) ?? false
            },
            onExit: close,
          }
        },
      }),
    ]
  },
})
