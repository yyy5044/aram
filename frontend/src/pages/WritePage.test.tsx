import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Me, PostDetail } from '../api/types'
import { amumu, jinx, legDay, meMinsu, meYangho, oldAugment } from '../test/fixtures'
import { json, mockApi, type MockRoutes } from '../test/mockApi'
import { renderRoutes } from '../test/render'
import LocationProbe from '../test/LocationProbe'
import WritePage from './WritePage'

afterEach(() => {
  vi.unstubAllGlobals()
  sessionStorage.clear()
})

const routesFor = [
  { path: '/write', element: <WritePage /> },
  { path: '/posts/:postId/edit', element: <WritePage /> },
  { path: '*', element: <LocationProbe /> },
]

function existing(overrides: Partial<PostDetail> = {}): PostDetail {
  return {
    id: 5,
    title: '예전 글',
    content: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: '본문' }] }] },
    gamePatch: '26.21',
    author: { id: 1, nickname: '양호', avatarUrl: null },
    champions: [amumu],
    augments: [oldAugment],
    likeCount: 0,
    commentCount: 0,
    likedByMe: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    edited: false,
    ...overrides,
  }
}

function setup(me: Me | null, route = '/write', extra: MockRoutes = {}) {
  const api = mockApi({
    'GET /api/me': () => json(me),
    'GET /api/champions': () => json([amumu, jinx]),
    'GET /api/augments': () => json([legDay, oldAugment]),
    'GET /api/patches': () => json({ current: '26.21', patches: ['26.21', '26.20', '26.19'] }),
    ...extra,
  })
  const utils = renderRoutes(routesFor, route)
  return { api, ...utils }
}

async function pickChampion(name: string) {
  await userEvent.type(screen.getByLabelText('챔피언 검색'), name.slice(0, 2))
  await userEvent.click(screen.getByRole('option', { name: new RegExp(name) }))
}

describe('WritePage', () => {
  it('orders fields title, body, champions, augments, patch', async () => {
    setup(meYangho)
    await screen.findByLabelText('제목')
    const labels = screen.getAllByText(/^(제목|본문|챔피언|증강|패치)$/).map((el) => el.textContent)
    expect(labels).toEqual(['제목', '본문', '챔피언', '증강', '패치'])
  })

  it('defaults patch to current and labels it', async () => {
    setup(meYangho)
    const select = await screen.findByLabelText('패치')
    expect(select).toHaveValue('26.21')
    expect(screen.getByRole('option', { name: '26.21 (현재 패치)' })).toBeInTheDocument()
  })

  it('submits and navigates to the new post', async () => {
    const { api } = setup(meYangho, '/write', { 'POST /api/posts': () => json({ id: 9 }, 201) })
    await userEvent.type(await screen.findByLabelText('제목'), '아무무 추천')
    await pickChampion('아무무')
    await userEvent.click(screen.getByRole('button', { name: '등록' }))

    expect(await screen.findByTestId('location')).toHaveTextContent('/posts/9')
    const body = api.find('POST', '/api/posts')[0].body as Record<string, unknown>
    expect(body.title).toBe('아무무 추천')
    expect((body.content as { type: string }).type).toBe('doc')
    expect(body.championIds).toEqual(['Amumu'])
    expect(body.augmentIds).toEqual([])
    expect(body.gamePatch).toBe('26.21')
  })

  it('shows server field errors under fields', async () => {
    setup(meYangho, '/write', {
      'POST /api/posts': () =>
        json({ code: 'INVALID_INPUT', message: '입력값을 확인해주세요', fieldErrors: { title: '제목을 입력해주세요', content: '본문을 입력해주세요' } }, 400),
    })
    await userEvent.click(await screen.findByRole('button', { name: '등록' }))
    expect(await screen.findByText('제목을 입력해주세요')).toBeInTheDocument()
    expect(screen.getByText('본문을 입력해주세요')).toBeInTheDocument()
  })

  it('keeps input when session expired', async () => {
    setup(meYangho, '/write', {
      'POST /api/posts': () => json({ code: 'UNAUTHORIZED', message: '로그인이 필요해요' }, 401),
    })
    const title = await screen.findByLabelText('제목')
    await userEvent.type(title, '날아가면 안 되는 제목')
    await pickChampion('아무무')
    await userEvent.click(screen.getByRole('button', { name: '등록' }))

    expect(await screen.findByRole('status')).toHaveTextContent('로그인이 필요해요')
    expect(screen.getByLabelText('제목')).toHaveValue('날아가면 안 되는 제목')
    expect(screen.getByRole('button', { name: '아무무 빼기' })).toBeInTheDocument()
  })

  it('hides inactive augments except ones already attached', async () => {
    setup(meYangho, '/posts/5/edit', { 'GET /api/posts/5': () => json(existing()) })
    expect(await screen.findByRole('button', { name: '옛 증강 빼기' })).toBeInTheDocument()
    await userEvent.click(screen.getByLabelText('증강 검색'))
    expect(screen.queryByRole('option', { name: /옛 증강/ })).not.toBeInTheDocument()
    expect(screen.getByRole('option', { name: /하체 운동의 날/ })).toBeInTheDocument()
  })

  it('loads existing values and saves edits', async () => {
    const { api } = setup(meYangho, '/posts/5/edit', {
      'GET /api/posts/5': () => json(existing()),
      'PUT /api/posts/5': () => new Response(null, { status: 204 }),
    })
    const title = await screen.findByLabelText('제목')
    await vi.waitFor(() => expect(title).toHaveValue('예전 글'))
    await userEvent.clear(title)
    await userEvent.type(title, '고친 글')
    await userEvent.click(screen.getByRole('button', { name: '수정 완료' }))

    expect(await screen.findByTestId('location')).toHaveTextContent('/posts/5')
    const body = api.find('PUT', '/api/posts/5')[0].body as Record<string, unknown>
    expect(body.title).toBe('고친 글')
    expect(body.augmentIds).toEqual(['OLD'])
    expect(body.championIds).toEqual(['Amumu'])
  })

  it('appends an old patch in edit mode', async () => {
    setup(meYangho, '/posts/5/edit', { 'GET /api/posts/5': () => json(existing({ gamePatch: '26.10' })) })
    const select = await screen.findByLabelText('패치')
    await vi.waitFor(() => expect(select).toHaveValue('26.10'))
    expect(screen.getByRole('option', { name: '26.10' })).toBeInTheDocument()
  })

  it('does not let another user edit', async () => {
    setup(meMinsu, '/posts/5/edit', { 'GET /api/posts/5': () => json(existing()) })
    expect(await screen.findByText('없는 글이에요')).toBeInTheDocument()
  })

  it('rejects oversized image before upload', async () => {
    const { api } = setup(meYangho)
    const big = new File([new Uint8Array(11 * 1024 * 1024)], 'big.png', { type: 'image/png' })
    await userEvent.upload(await screen.findByLabelText('이미지 넣기'), big)
    expect(await screen.findByRole('status')).toHaveTextContent('이미지는 10MB 이하만 올릴 수 있어요')
    expect(api.find('POST', '/api/images')).toHaveLength(0)
  })

  it('uploads an image and inserts it into the body', async () => {
    const { api } = setup(meYangho, '/write', {
      'POST /api/images': () => json({ id: 'abc', url: '/api/images/0f8fad5b-d9cb-469f-a165-70867728950e' }, 201),
    })
    const png = new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], 'shot.png', { type: 'image/png' })
    await userEvent.upload(await screen.findByLabelText('이미지 넣기'), png)

    await vi.waitFor(() =>
      expect(document.querySelector('.tiptap img')?.getAttribute('src')).toBe('/api/images/0f8fad5b-d9cb-469f-a165-70867728950e'),
    )
    expect(api.find('POST', '/api/images')).toHaveLength(1)
  })

  it('asks before leaving with unsaved changes', async () => {
    const confirm = vi.fn(() => false)
    vi.stubGlobal('confirm', confirm)
    const { router } = setup(meYangho)
    await userEvent.type(await screen.findByLabelText('제목'), '쓰는 중')
    await router.navigate('/')
    await vi.waitFor(() => expect(confirm).toHaveBeenCalledWith('작성 중인 내용이 사라져요. 나갈까요?'))
    expect(router.state.location.pathname).toBe('/write')
  })

  it('asks for login when anonymous', async () => {
    setup(null)
    expect(await screen.findByRole('button', { name: '로그인하고 글쓰기' })).toBeInTheDocument()
    expect(screen.queryByLabelText('제목')).not.toBeInTheDocument()
  })
})
