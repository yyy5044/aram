import type { JSONContent } from '@tiptap/core'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { amumu, jinx, legDay, meYangho } from '../test/fixtures'
import { json, mockApi } from '../test/mockApi'
import { renderRoutes } from '../test/render'
import LocationProbe from '../test/LocationProbe'
import WritePage from './WritePage'

const SRC = '/api/videos/0b6c3a4e-1d2f-4a5b-8c9d-0e1f2a3b4c5d'

const DOC_WITH_BOXES: JSONContent = {
  type: 'doc',
  content: [
    { type: 'paragraph', content: [{ type: 'text', text: '펜타킬' }] },
    { type: 'video', attrs: { src: null, uploadId: 'u1', truncated: false } },
    { type: 'uploadBox' },
    { type: 'video', attrs: { src: SRC, uploadId: 'u2', truncated: true } },
  ],
}

// 편집기 대신, 영상 칸 상태와 본문을 버튼으로 흉내 내는 가짜 편집기예요.
vi.mock('../editor/PostEditor', () => ({
  default: ({
    onChange,
    onPendingChange,
  }: {
    onChange: (json: JSONContent) => void
    onPendingChange?: (p: { busy: number; failed: number }) => void
  }) => (
    <div>
      <button type="button" onClick={() => onPendingChange?.({ busy: 1, failed: 0 })}>
        흉내: 변환 중
      </button>
      <button type="button" onClick={() => onPendingChange?.({ busy: 0, failed: 1 })}>
        흉내: 실패
      </button>
      <button type="button" onClick={() => onPendingChange?.({ busy: 0, failed: 0 })}>
        흉내: 끝
      </button>
      <button type="button" onClick={() => onChange(DOC_WITH_BOXES)}>
        흉내: 본문
      </button>
    </div>
  ),
}))

function setup() {
  const api = mockApi({
    'GET /api/me': () => json(meYangho),
    'GET /api/champions': () => json([amumu, jinx]),
    'GET /api/augments': () => json([legDay]),
    'GET /api/patches': () => json({ current: '26.21', patches: ['26.21'] }),
    'POST /api/posts': () => json({ id: 9 }, 201),
  })
  renderRoutes(
    [
      { path: '/write', element: <WritePage /> },
      { path: '*', element: <LocationProbe /> },
    ],
    '/write',
  )
  return api
}

describe('WritePage with clips', () => {
  it('locks posting while a clip transcodes', async () => {
    setup()
    await userEvent.click(await screen.findByRole('button', { name: '흉내: 변환 중' }))
    expect(screen.getByRole('button', { name: '등록' })).toBeDisabled()
    expect(screen.getByText('영상 변환이 끝나면 등록할 수 있어요')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: '흉내: 끝' }))
    expect(screen.getByRole('button', { name: '등록' })).toBeEnabled()
    expect(screen.queryByText('영상 변환이 끝나면 등록할 수 있어요')).not.toBeInTheDocument()
  })

  it('refuses to post with a failed clip', async () => {
    const api = setup()
    await userEvent.type(await screen.findByLabelText('제목'), '펜타킬')
    await userEvent.click(screen.getByRole('button', { name: '흉내: 실패' }))
    await userEvent.click(screen.getByRole('button', { name: '등록' }))
    expect(await screen.findByText('변환하지 못한 영상을 빼거나 다시 올려 주세요')).toBeInTheDocument()
    expect(api.find('POST', '/api/posts')).toHaveLength(0)
  })

  it('sends the body without empty boxes or editor-only attributes', async () => {
    const api = setup()
    await userEvent.type(await screen.findByLabelText('제목'), '펜타킬')
    await userEvent.click(screen.getByRole('button', { name: '흉내: 본문' }))
    await userEvent.click(screen.getByRole('button', { name: '등록' }))
    expect(await screen.findByTestId('location')).toHaveTextContent('/posts/9')
    const body = api.find('POST', '/api/posts')[0].body as { content: JSONContent }
    expect(body.content).toEqual({
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: '펜타킬' }] },
        { type: 'video', attrs: { src: SRC } },
      ],
    })
  })
})
