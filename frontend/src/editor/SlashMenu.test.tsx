import type { Editor } from '@tiptap/core'
import { act, fireEvent, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../test/render'
import PostEditor from './PostEditor'

function setup() {
  const onChange = vi.fn()
  renderWithProviders(
    <PostEditor initialContent={{ type: 'doc', content: [{ type: 'paragraph' }] }} onChange={onChange} onError={() => {}} />,
  )
  const dom = document.querySelector('.ProseMirror') as HTMLElement & { editor: Editor }
  return { editor: dom.editor, dom, onChange }
}

function type(editor: Editor, text: string) {
  act(() => {
    editor.commands.focus('end')
    editor.commands.insertContent(text)
  })
}

describe('slash menu', () => {
  it('opens with video and photo on /', async () => {
    const { editor } = setup()
    type(editor, '/')
    const menu = await screen.findByRole('listbox', { name: '넣을 블록' })
    expect(menu).toHaveTextContent('영상')
    expect(menu).toHaveTextContent('사진')
  })

  it('narrows to video on /v and inserts a video box on Enter', async () => {
    const { editor, dom } = setup()
    type(editor, '/v')
    const menu = await screen.findByRole('listbox', { name: '넣을 블록' })
    expect(menu).toHaveTextContent('영상')
    expect(menu).not.toHaveTextContent('사진')

    fireEvent.keyDown(dom, { key: 'Enter' })
    expect(await screen.findByText('파일을 업로드해주세요')).toBeInTheDocument()
    expect(editor.getText()).not.toContain('/v')
    expect(screen.queryByRole('listbox', { name: '넣을 블록' })).not.toBeInTheDocument()
  })

  it('narrows to photo on /사 and inserts a photo box', async () => {
    const { editor, dom } = setup()
    type(editor, '/사')
    await screen.findByRole('listbox', { name: '넣을 블록' })
    fireEvent.keyDown(dom, { key: 'Enter' })
    expect(await screen.findByText('사진을 업로드해주세요')).toBeInTheDocument()
  })

  it('moves the choice with arrow keys', async () => {
    const { dom, editor } = setup()
    type(editor, '/')
    await screen.findByRole('listbox', { name: '넣을 블록' })
    expect(screen.getByRole('option', { name: /영상/ })).toHaveAttribute('aria-selected', 'true')
    fireEvent.keyDown(dom, { key: 'ArrowDown' })
    expect(screen.getByRole('option', { name: /사진/ })).toHaveAttribute('aria-selected', 'true')
  })

  it('closes when nothing matches and keeps the typed text', async () => {
    const { editor } = setup()
    type(editor, '/x')
    await new Promise((r) => setTimeout(r, 20))
    expect(screen.queryByRole('listbox', { name: '넣을 블록' })).not.toBeInTheDocument()
    expect(editor.getText()).toContain('/x')
  })

  it('does not grab a word that merely starts with v', async () => {
    const { editor, dom } = setup()
    type(editor, '/vote')
    await new Promise((r) => setTimeout(r, 20))
    expect(screen.queryByRole('listbox', { name: '넣을 블록' })).not.toBeInTheDocument()
    fireEvent.keyDown(dom, { key: 'Enter' })
    expect(editor.getText()).toContain('/vote')
    expect(screen.queryByText('파일을 업로드해주세요')).not.toBeInTheDocument()
  })

  it('still matches the full word 영상', async () => {
    const { editor } = setup()
    type(editor, '/영상')
    expect(await screen.findByRole('listbox', { name: '넣을 블록' })).toHaveTextContent('영상')
  })

  it('closes on Escape and keeps the slash', async () => {
    const { editor, dom } = setup()
    type(editor, '/')
    await screen.findByRole('listbox', { name: '넣을 블록' })
    fireEvent.keyDown(dom, { key: 'Escape' })
    expect(screen.queryByRole('listbox', { name: '넣을 블록' })).not.toBeInTheDocument()
    expect(editor.getText()).toContain('/')
  })

  it('hints at the slash menu in an empty editor', () => {
    setup()
    expect(document.querySelector('[data-placeholder="/를 입력하면 영상·사진을 넣을 수 있어요"]')).not.toBeNull()
  })
})
