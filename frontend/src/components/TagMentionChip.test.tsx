/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Augment, Champion } from '../api/types'
import { json, mockApi } from '../test/mockApi'
import { renderWithProviders } from '../test/render'
import TagMentionChip from './TagMentionChip'

const xin: Champion = { id: 'XinZhao', nameKo: '신짜오', imageUrl: 'https://x/XinZhao.png' }
const stoneGuts: Augment = { id: 'StoneGuts', nameKo: '거석상의 용기', iconUrl: 'https://x/sg.png', active: true, rarity: 'GOLD' }

function withLists() {
  mockApi({
    'GET /api/champions': () => json([xin]),
    'GET /api/augments': () => json([stoneGuts]),
  })
}

afterEach(() => vi.unstubAllGlobals())

describe('TagMentionChip', () => {
  it('draws a champion as a round portrait and a name the size of the body text', async () => {
    withLists()
    renderWithProviders(<TagMentionChip kind="champion" id="XinZhao" label="신짜오" />)
    await vi.waitFor(() => expect(document.querySelector('img')).not.toBeNull())
    const img = document.querySelector('img') as HTMLImageElement
    expect(img).toHaveAttribute('src', 'https://x/XinZhao.png')
    expect(img.className).toContain('rounded-full')
    const name = screen.getByText('신짜오')
    // 박스 없이 본문 글자 크기 그대로(em) 색만 입혀요. 챔피언은 띄울 설명이 없어서 밑줄도 없어요.
    expect(name.className).toContain('text-teal-ink')
    expect(name.className).not.toMatch(/text-\[\d+px\]|underline/)
    expect(img.className).toContain('h-[1.15em]')
    expect(name.closest('[data-mention-box]')?.className).not.toMatch(/border|bg-/)
  })

  it('draws an augment name in its rarity colour with a dotted underline', async () => {
    withLists()
    renderWithProviders(<TagMentionChip kind="augment" id="StoneGuts" label="거석상의 용기" />)
    await vi.waitFor(() => expect(document.querySelector('img[src="https://x/sg.png"]')).not.toBeNull())
    const name = screen.getByText('거석상의 용기')
    expect(name.className).toContain('text-gold-deep')
    // 점선 밑줄은 마우스를 올리면 설명이 뜬다는 표시예요.
    expect(name.className).toContain('decoration-dotted')
    expect(name.closest('[data-mention-box]')?.className).not.toMatch(/border|bg-/)
  })

  it('lets an augment box open its card but not a champion box', async () => {
    withLists()
    renderWithProviders(
      <>
        <TagMentionChip kind="augment" id="StoneGuts" label="거석상의 용기" />
        <TagMentionChip kind="champion" id="XinZhao" label="신짜오" />
      </>,
    )
    expect(screen.getByRole('button', { name: '거석상의 용기 증강 설명 보기' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /신짜오/ })).toBeNull()
  })

  it('lets a long name wrap instead of overflowing a narrow screen', () => {
    withLists()
    renderWithProviders(<TagMentionChip kind="augment" id="Gone" label="능력치 더하기 능력치 더하기 능력치!" />)
    const name = screen.getByText('능력치 더하기 능력치 더하기 능력치!')
    expect(name.className).toContain('whitespace-normal')
    expect(name.className).not.toContain('truncate')
  })

  it('keeps the round portrait from the post image style', () => {
    // 테스트에서는 CSS를 처리하지 않아서 파일을 직접 읽어요.
    const css = readFileSync('src/index.css', 'utf8')
    // 본문 사진 규칙(모서리 0·위아래 여백)이 박스 속 초상화·아이콘에는 닿지 않아야 해요.
    expect(css).toMatch(/\.post-content \.tiptap img:not\(\[data-mention-box\] img\)/)
  })

  it('shows only the saved name when the tag is not in the lists', async () => {
    withLists()
    renderWithProviders(<TagMentionChip kind="augment" id="Gone" label="사라진 증강" />)
    expect(screen.getByText('사라진 증강')).toBeInTheDocument()
    await new Promise((r) => setTimeout(r, 20))
    expect(document.querySelector('img')).toBeNull()
  })

  it('does not go anywhere when pressed', async () => {
    withLists()
    const { router } = renderWithProviders(<TagMentionChip kind="champion" id="XinZhao" label="신짜오" />, { route: '/posts/1', path: '/posts/:id' })
    await userEvent.click(screen.getByText('신짜오'))
    expect(router.state.location.pathname).toBe('/posts/1')
  })
})
