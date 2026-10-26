import type { Editor, JSONContent } from '@tiptap/core'
import { act, fireEvent, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Augment, Champion, Item } from '../api/types'
import { json, mockApi } from '../test/mockApi'
import { renderWithProviders } from '../test/render'
import PostEditor from './PostEditor'

const xin: Champion = { id: 'XinZhao', nameKo: '신짜오', imageUrl: 'https://x/XinZhao.png' }
const stoneGuts: Augment = { id: 'StoneGuts', nameKo: '거석상의 용기', iconUrl: 'https://x/sg.png', active: true, rarity: 'GOLD' }

const heart: Item = {
  id: '3084',
  nameKo: '강철심장',
  tier: 'LEGENDARY',
  priceTotal: 3000,
  iconUrl: 'https://x/item/3084.png',
  fromIds: [],
  intoIds: [],
  categories: [],
  active: true,
}

afterEach(() => vi.unstubAllGlobals())

async function setup(content: JSONContent = { type: 'doc', content: [{ type: 'paragraph' }] }) {
  // 챔피언·증강·아이템 목록이 모두 도착했는지 세요. 시간을 짐작해 기다리면 느린 때 목록 없이 @를 쳐서 메뉴가 안 떠요.
  let answered = 0
  const answer = (body: unknown) => () => {
    answered += 1
    return json(body)
  }
  mockApi({
    'GET /api/champions': answer([xin]),
    'GET /api/augments': answer([stoneGuts]),
    'GET /api/items': answer([heart]),
  })
  const onMention = vi.fn()
  const onError = vi.fn()
  renderWithProviders(<PostEditor initialContent={content} onChange={() => {}} onError={onError} onMention={onMention} />)
  const dom = document.querySelector('.ProseMirror') as HTMLElement & { editor: Editor }
  await vi.waitFor(() => expect(answered).toBe(3), { timeout: 15000 })
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

const MENU = { name: '넣을 챔피언·증강·아이템' }

/**
 * 글을 치고 @ 메뉴가 뜰 때까지 기다려요. 받은 목록은 편집기가 다시 그려질 때 넘어가서, 느린 컴퓨터(CI)에서는 목록이 닿기 전에
 * 친 검색어로는 메뉴가 안 떠요. 시간을 짐작해 기다리지 않고, 사람이 글자를 하나 더 쳤다 지우듯 검색어를 다시 넣어 확인해요.
 */
async function openMenu(editor: Editor, text: string) {
  type(editor, text)
  await vi.waitFor(
    () => {
      if (screen.queryByRole('listbox', MENU)) return
      act(() => {
        editor.commands.insertContent('x')
        editor.commands.command(({ tr }) => {
          tr.delete(tr.selection.from - 1, tr.selection.from)
          return true
        })
      })
      throw new Error('@ 메뉴가 아직 안 떴어요')
    },
    { timeout: 15000, interval: 50 },
  )
  return screen.getByRole('listbox', MENU)
}

describe('@ menu', () => {
  it('finds a champion by initial consonants and inserts its box on Enter', async () => {
    const { editor, dom, onMention } = await setup()
    const menu = await openMenu(editor, '추천 @ㅅㅉ')
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
    const menu = await openMenu(editor, '@거석상의용')
    expect(menu).toHaveTextContent('거석상의 용기')
    expect(menu).toHaveTextContent('증강')
    fireEvent.keyDown(dom, { key: 'Enter' })
    expect(mentions(editor)).toEqual([{ kind: 'augment', id: 'StoneGuts', label: '거석상의 용기' }])
    expect(onMention).toHaveBeenCalledWith('augment', 'StoneGuts')
  })

  it('finds an item by initial consonants and labels it as an item', async () => {
    const { editor, dom, onMention } = await setup()
    const menu = await openMenu(editor, '@ㄱㅊ')
    expect(menu).toHaveTextContent('강철심장')
    const row = screen.getByRole('option', { name: /강철심장/ })
    expect(row).toHaveTextContent('아이템')
    expect(row.querySelector('img')?.className).toContain('rounded-mark')
    fireEvent.keyDown(dom, { key: 'Enter' })
    expect(mentions(editor)).toEqual([{ kind: 'item', id: '3084', label: '강철심장' }])
    expect(onMention).toHaveBeenCalledWith('item', '3084')
  })

  it('asks for a name when only @ is typed', async () => {
    const { editor } = await setup()
    type(editor, '@')
    expect(await screen.findByText('챔피언·증강·아이템 이름을 쳐 주세요')).toBeInTheDocument()
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
    await openMenu(editor, '@신짜')
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
    // 박스 30개를 그리느라 목록이 편집기에 늦게 닿을 수 있어요(CI에서 실제로 있었어요).
    await openMenu(editor, ' @신짜')
    fireEvent.keyDown(dom, { key: 'Enter' })
    expect(onError).toHaveBeenCalledWith('본문 태그는 한 글에 30개까지 넣을 수 있어요')
    expect(mentions(editor)).toHaveLength(30)
    expect(onMention).not.toHaveBeenCalled()
  }, 20000)

  it('leaves the / menu working', async () => {
    const { editor } = await setup()
    type(editor, '/')
    expect(await screen.findByRole('listbox', { name: '넣을 블록' })).toHaveTextContent('영상')
  })
})
