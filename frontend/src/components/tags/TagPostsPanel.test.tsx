import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ComponentProps } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { legDay, listItem, page } from '../../test/fixtures'
import { json, mockApi, type MockRequest, type MockRoutes } from '../../test/mockApi'
import { renderWithProviders } from '../../test/render'
import TagPostsPanel from './TagPostsPanel'

afterEach(() => vi.unstubAllGlobals())

/** 총 total개의 글을 5개씩 잘라서 돌려줘요. 제목에 정렬과 번호를 넣어서 어느 페이지인지 알 수 있어요. */
function postsOf(total: number) {
  return (req: MockRequest) => {
    const p = Number(req.query.get('page'))
    const size = Number(req.query.get('size'))
    const sort = req.query.get('sort')
    const start = (p - 1) * size
    const items = Array.from({ length: Math.max(0, Math.min(size, total - start)) }, (_, i) =>
      listItem({ id: start + i + 1, title: `${sort} 글 ${start + i + 1}` }),
    )
    return json(page(items, { page: p, size, totalItems: total, totalPages: Math.ceil(total / size) }))
  }
}

function setup(
  total: number,
  kind: 'augment' | 'champion' = 'augment',
  extra: MockRoutes = {},
  props: Partial<ComponentProps<typeof TagPostsPanel>> = {},
  route = '/',
) {
  const onClose = vi.fn()
  const api = mockApi({ 'GET /api/posts': postsOf(total), ...extra })
  const { router } = renderWithProviders(
    <TagPostsPanel
      kind={kind}
      id={kind === 'augment' ? 'ARAM_LegDay' : 'Amumu'}
      title={kind === 'augment' ? '하체 운동의 날' : '아무무'}
      subtitle={`게시글 ${total}개`}
      onClose={onClose}
      {...props}
    />,
    { route },
  )
  return { api, onClose, router }
}

describe('TagPostsPanel', () => {
  it('shows five posts and loads more', async () => {
    const { api } = setup(7)
    const region = await screen.findByRole('region', { name: '하체 운동의 날 게시글' })
    expect(await within(region).findAllByRole('listitem')).toHaveLength(5)
    expect(api.find('GET', '/api/posts')[0].query.get('augment')).toBe('ARAM_LegDay')

    await userEvent.click(screen.getByRole('button', { name: '더 보기 (2개 남음)' }))
    expect(await within(region).findAllByRole('listitem')).toHaveLength(7)
    const second = api.find('GET', '/api/posts')[1].query
    expect(second.get('page')).toBe('2')
    expect(second.get('size')).toBe('5')
    expect(screen.queryByRole('button', { name: /더 보기/ })).not.toBeInTheDocument()
  })

  it('restarts from the first page when sort changes', async () => {
    const { api } = setup(7)
    await userEvent.click(await screen.findByRole('button', { name: '더 보기 (2개 남음)' }))
    await screen.findByText('latest 글 7')

    await userEvent.click(screen.getByRole('button', { name: '추천순' }))
    expect(await screen.findByText('likes 글 1')).toBeInTheDocument()
    const last = api.find('GET', '/api/posts').at(-1)!.query
    expect(last.get('sort')).toBe('likes')
    expect(last.get('page')).toBe('1')
    expect(screen.getAllByRole('listitem')).toHaveLength(5)
    expect(screen.queryByText('latest 글 7')).not.toBeInTheDocument()
  })

  it('remembers the chosen sort in the address so a redrawn panel keeps it', async () => {
    const { router } = setup(7)
    await userEvent.click(await screen.findByRole('button', { name: '추천순' }))
    expect(router.state.location.search).toBe('?order=likes')
  })

  it('starts with the sort from the address', async () => {
    const { api } = setup(7, 'augment', {}, {}, '/?order=likes')
    expect(await screen.findByText('likes 글 1')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '추천순' })).toHaveAttribute('aria-pressed', 'true')
    expect(api.find('GET', '/api/posts').every((c) => c.query.get('sort') === 'likes')).toBe(true)
  })

  it('counts the remaining posts from the latest page', async () => {
    // 첫 페이지 뒤에 글 하나가 지워져서 두 번째 페이지는 전체 11개라고 알려줘요.
    const twelveThenEleven = (req: MockRequest) => postsOf(req.query.get('page') === '1' ? 12 : 11)(req)
    setup(12, 'augment', { 'GET /api/posts': twelveThenEleven })
    await userEvent.click(await screen.findByRole('button', { name: '더 보기 (7개 남음)' }))
    expect(await screen.findByRole('button', { name: '더 보기 (1개 남음)' })).toBeInTheDocument()
  })

  it('keeps sort pills and posts while the new sort loads', async () => {
    setup(7, 'augment', {
      'GET /api/posts': (req) => (req.query.get('sort') === 'likes' ? new Promise<Response>(() => {}) : postsOf(7)(req)),
    })
    await screen.findByText('latest 글 1')
    await userEvent.click(screen.getByRole('button', { name: '추천순' }))
    expect(screen.getByRole('button', { name: '추천순' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getAllByRole('listitem')).toHaveLength(5)
    expect(screen.queryByText('불러오는 중이에요')).not.toBeInTheDocument()
  })

  it('shows empty text without sort pills', async () => {
    setup(0)
    expect(await screen.findByText('아직 이 태그가 붙은 글이 없어요')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '최신순' })).not.toBeInTheDocument()
  })

  it('shows server error inside the region', async () => {
    setup(0, 'augment', {
      'GET /api/posts': () => json({ code: 'INTERNAL_ERROR', message: '잠시 후 다시 시도해주세요' }, 500),
    })
    const region = await screen.findByRole('region', { name: '하체 운동의 날 게시글' })
    expect(await within(region).findByText('잠시 후 다시 시도해주세요')).toBeInTheDocument()
  })

  it('closes with the X button', async () => {
    const { onClose } = setup(0)
    await userEvent.click(await screen.findByRole('button', { name: '닫기' }))
    expect(onClose).toHaveBeenCalled()
  })

  it('renders children under the title row and sort pills in the posts heading', async () => {
    setup(7, 'augment', {}, { children: <p>카드 자리</p>, postsHeading: '이 증강 글 7개', compact: true })
    const region = await screen.findByRole('region', { name: '하체 운동의 날 게시글' })
    expect(within(region).getByText('카드 자리')).toBeInTheDocument()
    const heading = within(region).getByRole('heading', { name: '이 증강 글 7개' })
    expect(await within(heading.parentElement!).findByRole('button', { name: '추천순' })).toBeInTheDocument()
    // 제목 줄(h2가 있는 줄)에는 정렬 버튼이 없어요.
    const titleRow = within(region).getByRole('heading', { name: '하체 운동의 날' }).parentElement!
    expect(within(titleRow).queryByRole('button', { name: '추천순' })).not.toBeInTheDocument()
    // 한 줄 목록이라 태그 아이콘이 없어요.
    await within(region).findAllByRole('listitem')
    expect(within(region).queryByRole('img')).not.toBeInTheDocument()
  })

  it('without postsHeading the sort pills stay in the title row (champion panel unchanged)', async () => {
    setup(1, 'champion', { 'GET /api/champions/Amumu/top-augments': () => json([]) })
    const region = await screen.findByRole('region', { name: '아무무 게시글' })
    await within(region).findByText('latest 글 1')
    const titleRow = within(region).getByRole('heading', { name: '아무무' }).parentElement!
    expect(within(titleRow).getByRole('button', { name: '추천순' })).toBeInTheDocument()
    expect(within(region).queryByRole('heading', { name: /이 증강 글/ })).not.toBeInTheDocument()
  })

  it('champion panel shows top augments linking to augment tab', async () => {
    setup(1, 'champion', {
      'GET /api/champions/Amumu/top-augments': () => json([{ augment: legDay, postCount: 3 }]),
    })
    expect(await screen.findByText('자주 함께 쓰는 증강')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '하체 운동의 날 3' })).toHaveAttribute('href', '/augments?open=ARAM_LegDay')
  })

  it('champion panel shows top augments error inside the region', async () => {
    setup(1, 'champion', {
      'GET /api/champions/Amumu/top-augments': () => json({ code: 'INTERNAL_ERROR', message: '잠시 후 다시 시도해주세요' }, 500),
    })
    const region = await screen.findByRole('region', { name: '아무무 게시글' })
    expect(await within(region).findByText('잠시 후 다시 시도해주세요')).toBeInTheDocument()
    expect(await within(region).findByText('latest 글 1')).toBeInTheDocument()
  })

  it('champion panel hides top augments when empty', async () => {
    setup(1, 'champion', { 'GET /api/champions/Amumu/top-augments': () => json([]) })
    await screen.findByText('latest 글 1')
    expect(screen.queryByText('자주 함께 쓰는 증강')).not.toBeInTheDocument()
  })
})
