import { vi } from 'vitest'

export type MockRequest = {
  method: string
  path: string
  query: URLSearchParams
  body: unknown
  headers: Headers
}

type Handler = (req: MockRequest) => Response | Promise<Response>

export type MockRoutes = Record<string, Handler>

/** JSON 응답을 만들어요. body가 null이면 빈 본문이에요. */
export function json(body: unknown, status = 200): Response {
  if (body === null) return new Response('', { status })
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

export function noContent(): Response {
  return new Response(null, { status: 204 })
}

/**
 * fetch를 가짜로 바꿔요. 키는 "GET /api/me" 형태이고, 쿼리 문자열은 무시해요.
 * 등록되지 않은 요청은 404를 돌려주고 calls에 남아요.
 */
export function mockApi(routes: MockRoutes) {
  const calls: MockRequest[] = []
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(typeof input === 'string' ? input : input.toString(), 'http://localhost')
    const method = (init?.method ?? 'GET').toUpperCase()
    let body: unknown = undefined
    if (typeof init?.body === 'string') {
      try {
        body = JSON.parse(init.body)
      } catch {
        body = init.body
      }
    } else if (init?.body instanceof FormData) {
      body = init.body
    }
    const req: MockRequest = {
      method,
      path: url.pathname,
      query: url.searchParams,
      body,
      headers: new Headers(init?.headers),
    }
    calls.push(req)
    const handler = routes[`${method} ${url.pathname}`]
    if (!handler) return json({ code: 'NOT_FOUND', message: '찾을 수 없어요' }, 404)
    return handler(req)
  })
  vi.stubGlobal('fetch', fetchMock)
  return {
    calls,
    find: (method: string, path: string) => calls.filter((c) => c.method === method && c.path === path),
  }
}
