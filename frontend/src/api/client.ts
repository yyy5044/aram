/** 서버 오류. message는 화면에 그대로 보여줄 수 있는 한국어 문장이에요. */
export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly fieldErrors?: Record<string, string>

  constructor(status: number, code: string, message: string, fieldErrors?: Record<string, string>) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.fieldErrors = fieldErrors
  }
}

type ApiInit = RequestInit & { json?: unknown }

function readCookie(name: string): string | null {
  const match = document.cookie.split('; ').find((part) => part.startsWith(name + '='))
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null
}

/** /api 호출. 쓰기 요청에는 CSRF 토큰을 붙이고, 오류는 ApiError로 바꿔요. 빈 응답은 undefined예요. */
export async function apiFetch<T>(path: string, init: ApiInit = {}): Promise<T> {
  const { json, headers: initHeaders, ...rest } = init
  const method = (rest.method ?? 'GET').toUpperCase()
  const headers = new Headers(initHeaders)
  if (json !== undefined) headers.set('Content-Type', 'application/json')
  if (method !== 'GET' && method !== 'HEAD') {
    const token = readCookie('XSRF-TOKEN')
    if (token) headers.set('X-XSRF-TOKEN', token)
  }

  let response: Response
  try {
    response = await fetch(path, {
      ...rest,
      method,
      headers,
      credentials: 'same-origin',
      body: json !== undefined ? JSON.stringify(json) : rest.body,
    })
  } catch {
    throw new ApiError(0, 'NETWORK', '서버에 연결할 수 없어요')
  }

  const text = response.status === 204 ? '' : await response.text()
  if (!response.ok) {
    try {
      const body = JSON.parse(text) as { code?: string; message?: string; fieldErrors?: Record<string, string> }
      throw new ApiError(
        response.status,
        body.code ?? 'UNKNOWN',
        body.message ?? '잠시 후 다시 시도해주세요',
        body.fieldErrors,
      )
    } catch (e) {
      if (e instanceof ApiError) throw e
      throw new ApiError(response.status, 'UNKNOWN', '잠시 후 다시 시도해주세요')
    }
  }
  return (text ? JSON.parse(text) : undefined) as T
}
