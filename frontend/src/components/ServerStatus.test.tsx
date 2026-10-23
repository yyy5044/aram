import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import ServerStatus from './ServerStatus'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('ServerStatus', () => {
  it('서버가 응답하면 DB 버전과 함께 연결됨을 보여준다', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ status: 'ok', database: 'PostgreSQL 18.6' }), { status: 200 }),
      ),
    )

    render(<ServerStatus />)

    expect(await screen.findByText('서버 연결됨 · PostgreSQL 18.6')).toBeInTheDocument()
  })

  it('서버가 응답하지 않으면 연결 실패를 보여준다', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))

    render(<ServerStatus />)

    expect(await screen.findByText('서버에 연결할 수 없어요')).toBeInTheDocument()
  })
})
