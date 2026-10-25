import { screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { json, mockApi } from '../test/mockApi'
import { renderRoutes } from '../test/render'
import AppLayout from './AppLayout'

afterEach(() => vi.unstubAllGlobals())

function setup(route: string) {
  mockApi({ 'GET /api/me': () => json(null) })
  return renderRoutes(
    [
      {
        element: <AppLayout />,
        children: [
          { path: '/', element: <p>목록</p> },
          { path: '/users/:userId', element: <p>프로필</p> },
          { path: '/posts/:postId', element: <p>글</p> },
        ],
      },
    ],
    route,
  )
}

describe('WriteFab (휴대폰 글쓰기 버튼)', () => {
  it.each(['/', '/users/1'])('is on list screens like %s', async (route) => {
    setup(route)
    expect(await screen.findByTestId('write-fab')).toHaveAttribute('href', '/write')
  })

  it('is not on a post page', async () => {
    setup('/posts/5')
    await screen.findByText('글')
    expect(screen.queryByTestId('write-fab')).not.toBeInTheDocument()
  })
})
