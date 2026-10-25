import { act, fireEvent, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { AugmentDetail } from '../api/types'
import { json, mockApi } from '../test/mockApi'
import { renderWithProviders } from '../test/render'
import AugmentTooltipBody from './augment/AugmentTooltipBody'
import HoverTooltip from './HoverTooltip'

const floating = vi.hoisted(() => ({ calls: [] as { placement?: string; middleware: string[]; shift?: unknown }[] }))
vi.mock('@floating-ui/dom', async (importOriginal) => {
  const real = await importOriginal<typeof import('@floating-ui/dom')>()
  return {
    ...real,
    computePosition: (reference: Element, el: HTMLElement, options?: Parameters<typeof real.computePosition>[2]) => {
      floating.calls.push({
        placement: options?.placement,
        middleware: (options?.middleware ?? []).flatMap((m) => (m ? [m.name] : [])),
        shift: (options?.middleware ?? []).flatMap((m) => (m && m.name === 'shift' ? [m.options] : []))[0],
      })
      return real.computePosition(reference, el, options)
    },
  }
})

afterEach(() => {
  vi.unstubAllGlobals()
  localStorage.clear()
  floating.calls = []
})

const detail: AugmentDetail = {
  id: 'StoneGuts',
  rarity: 'GOLD',
  iconUrl: 'i.png',
  original: { locale: 'en', name: 'Stone Guts', description: 'Gain armor' },
  translation: { locale: 'ko', name: '거석상의 용기', description: '방어력을 얻어요' },
}

function draw() {
  renderWithProviders(
    <div>
      <HoverTooltip label="거석상의 용기 증강 설명 보기" content={<AugmentTooltipBody augmentId="StoneGuts" />}>
        <span>박스</span>
      </HoverTooltip>
      <p>바깥</p>
    </div>,
  )
  return screen.getByRole('button', { name: '거석상의 용기 증강 설명 보기' })
}

const wait = (ms: number) => act(() => new Promise((r) => setTimeout(r, ms)))

describe('HoverTooltip', () => {
  it('opens on hover after a short delay', async () => {
    mockApi({ 'GET /api/augments/StoneGuts': () => json(detail) })
    const box = draw()
    fireEvent.pointerEnter(box, { pointerType: 'mouse' })
    await wait(100)
    expect(screen.queryByRole('article')).toBeNull()
    expect(await screen.findByRole('article', { name: '거석상의 용기' })).toBeInTheDocument()
    expect(screen.getByText('방어력을 얻어요')).toBeInTheDocument()
    expect(box).toHaveAttribute('aria-expanded', 'true')
    // 큰 게임 카드가 아니라 작은 설명 상자예요.
    expect(screen.getByText('골드 증강')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '복사' })).toBeNull()
  })

  it('places the card below the box and keeps it on screen', async () => {
    mockApi({ 'GET /api/augments/StoneGuts': () => json(detail) })
    const box = draw()
    fireEvent.pointerEnter(box, { pointerType: 'mouse' })
    await screen.findByRole('article')
    await vi.waitFor(() => expect(floating.calls.length).toBeGreaterThan(0))
    expect(floating.calls[0].placement).toBe('bottom-start')
    expect(floating.calls[0].middleware).toEqual(expect.arrayContaining(['offset', 'flip', 'shift']))
    // 위아래 어느 쪽에도 카드 높이만큼 자리가 없으면 위아래로도 밀어 넣어요.
    expect(floating.calls[0].shift).toMatchObject({ crossAxis: true })
  })

  it('stays hidden until it has been placed', async () => {
    mockApi({ 'GET /api/augments/StoneGuts': () => json(detail) })
    const box = draw()
    act(() => box.focus())
    const card = document.querySelector('body > div.z-50') as HTMLElement
    expect(card.style.visibility).toBe('hidden')
    await vi.waitFor(() => expect(card.style.visibility).toBe('visible'))
  })

  it('cannot be focused inside the editor', () => {
    renderWithProviders(
      <HoverTooltip label="거석상의 용기 증강 설명 보기" content={<AugmentTooltipBody augmentId="StoneGuts" />} focusable={false}>
        <span>박스</span>
      </HoverTooltip>,
    )
    expect(screen.getByRole('button', { name: '거석상의 용기 증강 설명 보기' })).not.toHaveAttribute('tabindex')
  })

  it('closes when the mouse leaves the box and the card', async () => {
    mockApi({ 'GET /api/augments/StoneGuts': () => json(detail) })
    const box = draw()
    fireEvent.pointerEnter(box, { pointerType: 'mouse' })
    const card = await screen.findByRole('article')
    // 박스에서 카드로 옮겨 가는 동안은 열려 있어요.
    fireEvent.pointerLeave(box, { pointerType: 'mouse' })
    fireEvent.pointerEnter(card, { pointerType: 'mouse' })
    await wait(250)
    expect(screen.getByRole('article')).toBeInTheDocument()
    fireEvent.pointerLeave(card, { pointerType: 'mouse' })
    await vi.waitFor(() => expect(screen.queryByRole('article')).toBeNull())
    expect(box).toHaveAttribute('aria-expanded', 'false')
  })

  it('toggles on tap and closes on a tap outside', async () => {
    mockApi({ 'GET /api/augments/StoneGuts': () => json(detail) })
    const box = draw()
    const tap = (el: Element) => {
      fireEvent.pointerDown(el, { pointerType: 'touch' })
      fireEvent.click(el)
    }
    tap(box)
    await screen.findByRole('article')
    tap(box)
    expect(screen.queryByRole('article')).toBeNull()
    tap(box)
    await screen.findByRole('article')
    tap(screen.getByText('바깥'))
    expect(screen.queryByRole('article')).toBeNull()
  })

  it('stays open while the card itself is touched', async () => {
    mockApi({ 'GET /api/augments/StoneGuts': () => json(detail) })
    const box = draw()
    act(() => box.focus())
    const card = await screen.findByRole('article')
    fireEvent.pointerDown(card, { pointerType: 'touch' })
    act(() => box.blur())
    await wait(50)
    expect(screen.getByRole('article')).toBeInTheDocument()
  })

  it('opens on keyboard focus and closes with Escape', async () => {
    mockApi({ 'GET /api/augments/StoneGuts': () => json(detail) })
    const box = draw()
    act(() => box.focus())
    await screen.findByRole('article')
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('article')).toBeNull()
  })

  it('shows loading and then an error message', async () => {
    let fail: (r: Response) => void = () => {}
    mockApi({ 'GET /api/augments/StoneGuts': () => new Promise<Response>((resolve) => (fail = resolve)) })
    const box = draw()
    act(() => box.focus())
    // 받는 동안에도 같은 너비의 작은 상자예요.
    expect((await screen.findByText('불러오는 중…')).className).toContain('w-[300px]')
    fail(json({ code: 'INTERNAL', message: '서버 오류' }, 500))
    expect(await screen.findByText('증강 정보를 불러오지 못했어요')).toBeInTheDocument()
  })

  it('uses the selected language and falls back to the original', async () => {
    localStorage.setItem('lang', 'en')
    const api = mockApi({ 'GET /api/augments/StoneGuts': () => json({ ...detail, translation: null }) })
    const box = draw()
    act(() => box.focus())
    expect(await screen.findByRole('article', { name: 'Stone Guts' })).toBeInTheDocument()
    expect(api.find('GET', '/api/augments/StoneGuts')[0].query.get('lang')).toBe('en')
  })
})
