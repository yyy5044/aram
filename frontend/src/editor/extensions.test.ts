import { Editor } from '@tiptap/core'
import { describe, expect, it } from 'vitest'
import { postExtensions } from './extensions'

describe('postExtensions', () => {
  it('schema has only the allowed nodes and marks', () => {
    const editor = new Editor({ extensions: postExtensions() })
    expect(Object.keys(editor.schema.nodes).sort()).toEqual([
      'blockquote',
      'bulletList',
      'doc',
      'hardBreak',
      'image',
      'listItem',
      'orderedList',
      'paragraph',
      'tagMention',
      'text',
      'video',
    ])
    expect(Object.keys(editor.schema.marks).sort()).toEqual(['bold', 'italic'])
    editor.destroy()
  })

  it('keeps a pasted mention box with its attributes', () => {
    const editor = new Editor({
      extensions: postExtensions(),
      content:
        '<p>a <span data-tag-mention data-kind="augment" data-id="X" data-label="거석상의 용기">거석상의 용기</span></p>',
    })
    const paragraph = editor.getJSON().content?.[0]
    expect(paragraph?.content?.[1]).toEqual({
      type: 'tagMention',
      attrs: { kind: 'augment', id: 'X', label: '거석상의 용기' },
    })
    editor.destroy()
  })

  it('keeps a pasted item box with its number id', () => {
    const editor = new Editor({
      extensions: postExtensions(),
      content: '<p><span data-tag-mention data-kind="item" data-id="3084" data-label="강철심장">강철심장</span></p>',
    })
    const paragraph = editor.getJSON().content?.[0]
    expect(paragraph?.content?.[0]).toEqual({
      type: 'tagMention',
      attrs: { kind: 'item', id: '3084', label: '강철심장' },
    })
    editor.destroy()
  })
})
