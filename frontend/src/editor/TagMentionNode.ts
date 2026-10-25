import { mergeAttributes, Node } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import TagMentionView from './TagMentionView'

/** data-속성 하나를 그대로 읽고 쓰는 노드 속성. */
function dataAttribute(name: string) {
  return {
    default: null,
    parseHTML: (element: HTMLElement) => element.getAttribute(`data-${name}`),
    renderHTML: (attributes: Record<string, unknown>) => ({ [`data-${name}`]: attributes[name] }),
  }
}

/**
 * 본문 속 챔피언·증강·아이템 박스(@로 넣어요). 한 덩어리라 백스페이스 한 번에 통째로 지워져요.
 * 저장되는 속성은 kind(champion·augment·item), id(아이템은 숫자 번호의 문자열), label(넣을 때의 이름)이고, 서버 PostContentValidator와 같은 규칙이에요.
 */
export const TagMentionNode = Node.create({
  name: 'tagMention',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: false,

  addAttributes() {
    return { kind: dataAttribute('kind'), id: dataAttribute('id'), label: dataAttribute('label') }
  },

  parseHTML() {
    return [{ tag: 'span[data-tag-mention]' }]
  },

  renderHTML({ node, HTMLAttributes }) {
    return ['span', mergeAttributes({ 'data-tag-mention': '' }, HTMLAttributes), node.attrs.label ?? '']
  },

  renderText({ node }) {
    return node.attrs.label ?? ''
  },

  addNodeView() {
    return ReactNodeViewRenderer(TagMentionView, { as: 'span' })
  },
})
