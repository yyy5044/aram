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
      'text',
      'video',
    ])
    expect(Object.keys(editor.schema.marks).sort()).toEqual(['bold', 'italic'])
    editor.destroy()
  })
})
