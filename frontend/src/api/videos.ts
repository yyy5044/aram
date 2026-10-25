import { ApiError, apiFetch } from './client'

export const MAX_VIDEO_BYTES = 200 * 1024 * 1024
export const MAX_VIDEOS_PER_POST = 3

export type VideoStatus = {
  id: string
  status: 'QUEUED' | 'PROCESSING' | 'READY' | 'FAILED'
  progress: number
  truncated: boolean
  url: string | null
  posterUrl: string | null
  width: number | null
  height: number | null
  errorMessage: string | null
}

function readCookie(name: string): string | null {
  const match = document.cookie.split('; ').find((part) => part.startsWith(name + '='))
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null
}

/**
 * 영상을 올려요. fetch는 올리는 진행률을 알려주지 않아서 XMLHttpRequest를 써요.
 * 오류는 다른 API처럼 ApiError(화면에 보여줄 문장)로 바꿔요.
 */
export function uploadVideo(file: File, onProgress: (percent: number) => void, signal?: AbortSignal): Promise<VideoStatus> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', '/api/videos')
    xhr.withCredentials = true
    const token = readCookie('XSRF-TOKEN')
    if (token) xhr.setRequestHeader('X-XSRF-TOKEN', token)
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.min(100, Math.round((e.loaded / e.total) * 100)))
    }
    xhr.onload = () => {
      let body: { code?: string; message?: string } | VideoStatus | null = null
      try {
        body = xhr.responseText ? JSON.parse(xhr.responseText) : null
      } catch {
        body = null
      }
      if (xhr.status >= 200 && xhr.status < 300 && body) {
        resolve(body as VideoStatus)
        return
      }
      const err = (body ?? {}) as { code?: string; message?: string }
      reject(new ApiError(xhr.status, err.code ?? 'UNKNOWN', err.message ?? '잠시 후 다시 시도해주세요'))
    }
    xhr.onerror = () => reject(new ApiError(0, 'NETWORK', '서버에 연결할 수 없어요'))
    xhr.onabort = () => reject(new ApiError(0, 'ABORTED', '올리기를 멈췄어요'))
    signal?.addEventListener('abort', () => xhr.abort())
    const body = new FormData()
    body.append('file', file)
    xhr.send(body)
  })
}

export function fetchVideoStatus(id: string): Promise<VideoStatus> {
  return apiFetch(`/api/videos/${id}/status`)
}
