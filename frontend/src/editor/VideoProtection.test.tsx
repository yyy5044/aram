import type { Editor, JSONContent } from '@tiptap/core'
import { NodeSelection } from '@tiptap/pm/state'
import { act, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../test/render'
import PostEditor from './PostEditor'

const SRC = '/api/videos/0b6c3a4e-1d2f-4a5b-8c9d-0e1f2a3b4c5d'
const BLOCKED = '영상은 오른쪽 위 ✕ 버튼으로 뺄 수 있어요'

beforeEach(() => {
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined)
})

afterEach(() => {
  vi.restoreAllMocks()
})

function setup(content: JSONContent) {
  const onError = vi.fn()
  renderWithProviders(<PostEditor initialContent={content} onChange={() => {}} onError={onError} />)
  const editor = (document.querySelector('.ProseMirror') as HTMLElement & { editor: Editor }).editor
  return { editor, onError }
}

function videos(editor: Editor) {
  const found: (string | null)[] = []
  editor.state.doc.descendants((n) => {
    if (n.type.name === 'video') found.push(n.attrs.src)
  })
  return found
}

function videoPos(editor: Editor) {
  let pos = -1
  editor.state.doc.descendants((n, p) => {
    if (n.type.name === 'video' && pos < 0) pos = p
  })
  return pos
}

const para = (text: string): JSONContent => ({ type: 'paragraph', content: [{ type: 'text', text }] })
const clip: JSONContent = { type: 'video', attrs: { src: SRC } }

describe('converted clips are removed only with the ✕ button', () => {
  it('survives Backspace from the line after it', () => {
    const { editor } = setup({ type: 'doc', content: [clip, para('abc')] })
    act(() => {
      editor.commands.setTextSelection(videoPos(editor) + 2)
      editor.commands.keyboardShortcut('Backspace')
      editor.commands.keyboardShortcut('Backspace')
    })
    expect(videos(editor)).toEqual([SRC])
  })

  it('survives Delete from the line before it', () => {
    const { editor } = setup({ type: 'doc', content: [para('abc'), clip] })
    act(() => {
      editor.commands.setTextSelection(4)
      editor.commands.keyboardShortcut('Delete')
      editor.commands.keyboardShortcut('Delete')
    })
    expect(videos(editor)).toEqual([SRC])
  })

  it('survives deleting a selection that contains it, and says how to remove it once', () => {
    const { editor, onError } = setup({ type: 'doc', content: [para('abc'), clip, para('def')] })
    act(() => {
      editor.commands.selectAll()
      editor.commands.deleteSelection()
      editor.view.dispatch(editor.state.tr.setSelection(NodeSelection.create(editor.state.doc, videoPos(editor))))
      editor.commands.deleteSelection()
    })
    expect(videos(editor)).toEqual([SRC])
    expect(onError).toHaveBeenCalledTimes(1)
    expect(onError).toHaveBeenCalledWith(BLOCKED)
  })

  it('can still be moved', () => {
    const { editor } = setup({ type: 'doc', content: [para('abc'), clip, para('def')] })
    act(() => {
      const from = videoPos(editor)
      const node = editor.state.doc.nodeAt(from)!
      const tr = editor.state.tr.delete(from, from + node.nodeSize)
      editor.view.dispatch(tr.insert(0, node))
    })
    expect(videos(editor)).toEqual([SRC])
    expect(editor.state.doc.firstChild?.type.name).toBe('video')
  })

  it('goes away with the ✕ button', async () => {
    const { editor } = setup({ type: 'doc', content: [para('abc'), clip] })
    await userEvent.click(await screen.findByRole('button', { name: '영상 빼기' }))
    expect(videos(editor)).toEqual([])
  })

  it('leaves empty boxes removable with the keyboard', () => {
    const { editor } = setup({ type: 'doc', content: [para('abc'), { type: 'video', attrs: { src: null } }] })
    act(() => {
      editor.view.dispatch(editor.state.tr.setSelection(NodeSelection.create(editor.state.doc, videoPos(editor))))
      editor.commands.deleteSelection()
    })
    expect(videos(editor)).toEqual([])
  })
})
