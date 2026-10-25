import type { Editor, JSONContent } from '@tiptap/core'
import { act, fireEvent, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Augment, Champion } from '../api/types'
import { json, mockApi } from '../test/mockApi'
import { renderWithProviders } from '../test/render'
import PostEditor from './PostEditor'

const xin: Champion = { id: 'XinZhao', nameKo: '신짜오', imageUrl: 'https://x/XinZhao.png' }
const stoneGuts: Augment = { id: 'StoneGuts', nameKo: '거석상의 용기', iconUrl: 'https://x/sg.png', active: true, rarity: 'GOLD' }

afterEach(() => vi.unstubAllGlobals())

async function setup(content: JSONContent = { type: 'doc', content: [{ type: 'paragraph' }] }) {
  mockApi({
    'GET /api/champions': () => json([xin]),
    'GET /api/augments': () => json([stoneGuts]),
  })
  const onMention = vi.fn()
  const onError = vi.fn()
  renderWithProviders(<PostEditor initialContent={content} onChange={() => {}} onError={onError} onMention={onMention} />)
  const dom = document.querySelector('.ProseMirror') as HTMLElement & { editor: Editor }
  // 챔피언·증강 목록을 받을 때까지 기다려요.
  await act(() => new Promise((r) => setTimeout(r, 20)))
  return { editor: dom.editor, dom, onMention, onError }
}

function type(editor: Editor, text: string) {
  act(() => {
    editor.commands.focus('end')
    editor.commands.insertContent(text)
  })
}

function mentions(editor: Editor) {
  const found: Record<string, unknown>[] = []
  editor.state.doc.descendants((node) => {
    if (node.type.name === 'tagMention') found.push(node.attrs)
  })
  return found
}

const MENU = { name: '넣을 챔피언·증강' }

describe('@ menu', () => {
  it('finds a champion by initial consonants and inserts its box on Enter', async () => {
    const { editor, dom, onMention } = await setup()
    type(editor, '추천 @ㅅㅉ')
    const menu = await screen.findByRole('listbox', MENU)
    expect(menu).toHaveTextContent('신짜오')
    expect(menu).toHaveTextContent('챔피언')

    fireEvent.keyDown(dom, { key: 'Enter' })
    expect(mentions(editor)).toEqual([{ kind: 'champion', id: 'XinZhao', label: '신짜오' }])
    expect(editor.getText()).toBe('추천 신짜오 ')
    expect(editor.getText()).not.toContain('@')
    expect(onMention).toHaveBeenCalledWith('champion', 'XinZhao')
    expect(screen.queryByRole('listbox', MENU)).not.toBeInTheDocument()
  })

  it('finds an augment while ignoring spaces', async () => {
    const { editor, dom, onMention } = await setup()
    type(editor, '@거석상의용')
    const menu = await screen.findByRole('listbox', MENU)
    expect(menu).toHaveTextContent('거석상의 용기')
    expect(menu).toHaveTextContent('증강')
    fireEvent.keyDown(dom, { key: 'Enter' })
    expect(mentions(editor)).toEqual([{ kind: 'augment', id: 'StoneGuts', label: '거석상의 용기' }])
    expect(onMention).toHaveBeenCalledWith('augment', 'StoneGuts')
  })

  it('asks for a name when only @ is typed', async () => {
    const { editor } = await setup()
    type(editor, '@')
    expect(await screen.findByText('챔피언이나 증강 이름을 쳐 주세요')).toBeInTheDocument()
  })

  it('shows no menu when nothing matches', async () => {
    const { editor, dom } = await setup()
    type(editor, '@없는이름')
    await act(() => new Promise((r) => setTimeout(r, 20)))
    expect(screen.queryByRole('listbox', MENU)).not.toBeInTheDocument()
    fireEvent.keyDown(dom, { key: 'Enter' })
    expect(mentions(editor)).toEqual([])
  })

  it('closes on Escape and keeps the typed text', async () => {
    const { editor, dom } = await setup()
    type(editor, '@신짜')
    await screen.findByRole('listbox', MENU)
    fireEvent.keyDown(dom, { key: 'Escape' })
    expect(screen.queryByRole('listbox', MENU)).not.toBeInTheDocument()
    expect(editor.getText()).toContain('@신짜')
  })

  it('refuses a 31st box', async () => {
    const box = { type: 'tagMention', attrs: { kind: 'champion', id: 'XinZhao', label: '신짜오' } }
    const { editor, dom, onError, onMention } = await setup({
      type: 'doc',
      content: [{ type: 'paragraph', content: Array.from({ length: 30 }, () => box) }],
    })
    type(editor, ' @신짜')
    // 박스 30개를 그리느라 느릴 수 있어요(전체 테스트를 함께 돌릴 때).
    await screen.findByRole('listbox', MENU, { timeout: 5000 })
    fireEvent.keyDown(dom, { key: 'Enter' })
    expect(onError).toHaveBeenCalledWith('본문 태그는 한 글에 30개까지 넣을 수 있어요')
    expect(mentions(editor)).toHaveLength(30)
    expect(onMention).not.toHaveBeenCalled()
  })

  it('leaves the / menu working', async () => {
    const { editor } = await setup()
    type(editor, '/')
    expect(await screen.findByRole('listbox', { name: '넣을 블록' })).toHaveTextContent('영상')
  })
})
