import { ApiError } from '../api/client'
import { fetchVideoStatus, uploadVideo, type VideoStatus } from '../api/videos'

export type BoxState =
  | { phase: 'empty' }
  /** percent가 -1이면 진행률을 모르는 올리기(사진)예요. */
  | { phase: 'uploading'; percent: number }
  | { phase: 'queued' }
  | { phase: 'processing'; percent: number }
  | { phase: 'failed'; message: string }

export type VideoJob = {
  state: BoxState
  /** 변환이 끝나면 채워져요. 영상 칸이 이 값으로 자기 src를 정해요. */
  result: { src: string; truncated: boolean } | null
}

/** 변환 진행률을 몇 ms마다 물어볼지. 테스트는 짧게 바꿔요. */
export const pollTiming = { ms: 1000 }

const FAILED_MESSAGE = '영상을 올리지 못했어요'

type Entry = VideoJob & { abort: AbortController; timer: ReturnType<typeof setTimeout> | null; cancelled: boolean }

/**
 * 편집기 하나의 영상 올리기 작업들. 칸(NodeView)이 다시 그려져도 올리기가 끊기지 않게 칸 밖에 둬요.
 * 칸이 본문에서 사라지면 retainOnly가 그 작업의 올리기와 상태 조회를 멈춰요.
 */
export function createUploadJobs() {
  const jobs = new Map<string, Entry>()
  const listeners = new Set<() => void>()

  function emit() {
    for (const listener of listeners) listener()
  }

  function set(id: string, state: BoxState, result: VideoJob['result'] = null) {
    const job = jobs.get(id)
    if (!job || job.cancelled) return
    jobs.set(id, { ...job, state, result })
    emit()
  }

  function handle(id: string, status: VideoStatus) {
    const job = jobs.get(id)
    if (!job || job.cancelled) return
    switch (status.status) {
      case 'READY':
        set(id, { phase: 'processing', percent: 100 }, { src: status.url ?? `/api/videos/${status.id}`, truncated: status.truncated })
        return
      case 'FAILED':
        set(id, { phase: 'failed', message: status.errorMessage ?? FAILED_MESSAGE })
        return
      case 'QUEUED':
        set(id, { phase: 'queued' })
        break
      case 'PROCESSING':
        set(id, { phase: 'processing', percent: status.progress })
        break
    }
    const entry = jobs.get(id)
    if (entry && !entry.cancelled) {
      entry.timer = setTimeout(() => {
        fetchVideoStatus(status.id).then(
          (next) => handle(id, next),
          (e) => set(id, { phase: 'failed', message: e instanceof ApiError ? e.message : FAILED_MESSAGE }),
        )
      }, pollTiming.ms)
    }
  }

  return {
    startVideo(file: File): string {
      const id = crypto.randomUUID()
      const abort = new AbortController()
      jobs.set(id, { state: { phase: 'uploading', percent: 0 }, result: null, abort, timer: null, cancelled: false })
      emit()
      uploadVideo(file, (percent) => set(id, { phase: 'uploading', percent }), abort.signal).then(
        (status) => handle(id, status),
        (e) => set(id, { phase: 'failed', message: e instanceof ApiError ? e.message : FAILED_MESSAGE }),
      )
      return id
    },

    get(id: string | null | undefined): VideoJob | undefined {
      return id ? jobs.get(id) : undefined
    },

    subscribe(listener: () => void): () => void {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },

    /** 본문에 남아 있는 칸의 작업만 남기고 나머지는 멈춰요. */
    retainOnly(ids: Set<string>) {
      let changed = false
      for (const [id, job] of jobs) {
        if (ids.has(id)) continue
        job.cancelled = true
        job.abort.abort()
        if (job.timer) clearTimeout(job.timer)
        jobs.delete(id)
        changed = true
      }
      if (changed) emit()
    },

    /** 등록 잠금에 쓰는 요약: 올리는 중·변환 중인 칸 수와 실패한 칸 수. */
    summary(): { busy: number; failed: number } {
      let busy = 0
      let failed = 0
      for (const job of jobs.values()) {
        if (job.result) continue
        if (job.state.phase === 'failed') failed++
        else busy++
      }
      return { busy, failed }
    },
  }
}

export type UploadJobs = ReturnType<typeof createUploadJobs>
