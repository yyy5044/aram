import { afterEach, describe, expect, it, vi } from 'vitest'
import { json, mockApi, noContent } from '../test/mockApi'
import { ApiError, apiFetch } from './client'

async function caught(promise: Promise<unknown>): Promise<ApiError> {
  try {
    await promise
  } catch (e) {
    return e as ApiError
  }
  throw new Error('expected an error')
}

afterEach(() => {
  vi.unstubAllGlobals()
  document.cookie = 'XSRF-TOKEN=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/'
})

describe('apiFetch', () => {
  it('returns parsed JSON', async () => {
    mockApi({ 'GET /api/thing': () => json({ a: 1 }) })
    await expect(apiFetch<{ a: number }>('/api/thing')).resolves.toEqual({ a: 1 })
  })

  it('throws ApiError with code and fieldErrors', async () => {
    mockApi({
      'POST /api/posts': () =>
        json({ code: 'INVALID_INPUT', message: '입력값을 확인해주세요', fieldErrors: { title: '제목을 입력해주세요' } }, 400),
    })
    const error = await caught(apiFetch('/api/posts', { method: 'POST', json: {} }))
    expect(error).toBeInstanceOf(ApiError)
    expect(error.status).toBe(400)
    expect(error.code).toBe('INVALID_INPUT')
    expect(error.message).toBe('입력값을 확인해주세요')
    expect(error.fieldErrors).toEqual({ title: '제목을 입력해주세요' })
  })

  it('sends X-XSRF-TOKEN from cookie on POST and JSON body', async () => {
    document.cookie = 'XSRF-TOKEN=abc; path=/'
    const api = mockApi({ 'POST /api/x': () => noContent() })
    await apiFetch('/api/x', { method: 'POST', json: { hello: '안녕' } })
    const call = api.find('POST', '/api/x')[0]
    expect(call.headers.get('X-XSRF-TOKEN')).toBe('abc')
    expect(call.headers.get('Content-Type')).toBe('application/json')
    expect(call.body).toEqual({ hello: '안녕' })
  })

  it('does not send the CSRF header on GET', async () => {
    document.cookie = 'XSRF-TOKEN=abc; path=/'
    const api = mockApi({ 'GET /api/x': () => json([]) })
    await apiFetch('/api/x')
    expect(api.find('GET', '/api/x')[0].headers.get('X-XSRF-TOKEN')).toBeNull()
  })

  it('returns undefined for 204 and empty bodies', async () => {
    mockApi({ 'DELETE /api/x': () => noContent(), 'GET /api/me': () => json(null) })
    await expect(apiFetch('/api/x', { method: 'DELETE' })).resolves.toBeUndefined()
    await expect(apiFetch('/api/me')).resolves.toBeUndefined()
  })

  it('maps network failure to NETWORK ApiError', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    const error = await caught(apiFetch('/api/x'))
    expect(error).toBeInstanceOf(ApiError)
    expect(error.status).toBe(0)
    expect(error.code).toBe('NETWORK')
    expect(error.message).toBe('서버에 연결할 수 없어요')
  })

  it('falls back to a generic message when the error body is not JSON', async () => {
    mockApi({ 'GET /api/x': () => new Response('<html>oops</html>', { status: 502 }) })
    const error = await caught(apiFetch('/api/x'))
    expect(error.status).toBe(502)
    expect(error.message).toBe('잠시 후 다시 시도해주세요')
  })
})
