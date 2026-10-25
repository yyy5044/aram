import { Extension } from '@tiptap/core'
import { PluginKey } from '@tiptap/pm/state'
import { ReactRenderer } from '@tiptap/react'
import Suggestion, { exitSuggestion } from '@tiptap/suggestion'
import { filterSlashItems, type SlashItem } from './slashItems'
import SlashMenu, { type SlashMenuHandle } from './SlashMenu'

const slashKey = new PluginKey('slashCommand')

/**
 * 줄 맨 앞이나 띄어쓰기 뒤에서 / 를 치면 영상·사진 메뉴를 띄워요.
 * 고르면 친 글자(/v 같은)를 지우고 그 자리에 칸을 넣어요. 맞는 항목이 없으면 메뉴만 닫혀요.
 */
export const SlashCommand = Extension.create({
  name: 'slashCommand',

  addProseMirrorPlugins() {
    return [
      Suggestion<SlashItem, SlashItem>({
        pluginKey: slashKey,
        editor: this.editor,
        char: '/',
        allowedPrefixes: [' '],
        items: ({ query }) => filterSlashItems(query),
        command: ({ editor, range, props }) => {
          editor.chain().focus().deleteRange(range).insertContent({ type: props.node }).run()
        },
        render: () => {
          let renderer: ReactRenderer<SlashMenuHandle> | null = null
          let unmount: (() => void) | null = null

          const close = () => {
            unmount?.()
            unmount = null
            renderer?.destroy()
            renderer = null
          }

          return {
            onStart: (props) => {
              renderer = new ReactRenderer(SlashMenu, {
                props: { items: props.items, command: props.command },
                editor: props.editor,
              })
              unmount = props.mount(renderer.element)
            },
            onUpdate: (props) => {
              renderer?.updateProps({ items: props.items, command: props.command })
            },
            onKeyDown: ({ event, view }) => {
              if (event.key === 'Escape') {
                exitSuggestion(view, slashKey)
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
