import type { Editor, JSONContent } from '@tiptap/core'
import { Slice } from '@tiptap/pm/model'
import { act, fireEvent, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../api/client'
import { MAX_VIDEO_BYTES, type VideoStatus } from '../api/videos'
import { renderWithProviders } from '../test/render'
import PostEditor from './PostEditor'
import { pollTiming } from './uploadJobs'

vi.mock('../api/videos', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/videos')>()
  return { ...actual, uploadVideo: vi.fn(), fetchVideoStatus: vi.fn() }
})
vi.mock('../api/images', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/images')>()
  return { ...actual, uploadImage: vi.fn() }
})

const { uploadVideo, fetchVideoStatus } = await import('../api/videos')
const { uploadImage } = await import('../api/images')

const SRC = '/api/videos/0b6c3a4e-1d2f-4a5b-8c9d-0e1f2a3b4c5d'

function status(over: Partial<VideoStatus>): VideoStatus {
  return {
    id: 'v1',
    status: 'PROCESSING',
    progress: 0,
    truncated: false,
    url: null,
    posterUrl: null,
    width: null,
    height: null,
    errorMessage: null,
    ...over,
  }
}

const emptyBoxDoc: JSONContent = { type: 'doc', content: [{ type: 'video', attrs: { src: null } }] }

function setup(initialContent: JSONContent) {
  const onChange = vi.fn()
  const onError = vi.fn()
  const onPendingChange = vi.fn()
  renderWithProviders(
    <PostEditor initialContent={initialContent} onChange={onChange} onError={onError} onPendingChange={onPendingChange} />,
  )
  return { onChange, onError, onPendingChange }
}

function videoFile(name = 'clip.mp4') {
  return new File(['x'], name, { type: 'video/mp4' })
}

/** ProseMirror가 놓은 위치를 찾은 뒤 부르는 편집기의 drop 처리기를 직접 불러요(jsdom은 위치를 못 구해요). */
function dropOnEditor(file: File): boolean {
  const editor = (document.querySelector('.ProseMirror') as HTMLElement & { editor: Editor }).editor
  // jsdom에는 elementFromPoint가 없어요. 놓은 위치를 못 찾으면 커서 자리에 넣는 길을 타게 해요.
  if (!document.elementFromPoint) document.elementFromPoint = () => null
  const event = { dataTransfer: { files: [file] }, preventDefault: () => {}, clientX: 0, clientY: 0 } as unknown as DragEvent
  let handled = false
  act(() => {
    handled = Boolean(editor.view.someProp('handleDrop', (f) => f(editor.view, event, Slice.empty, false)))
  })
  return handled
}

function lastDoc(onChange: ReturnType<typeof vi.fn>): JSONContent {
  return onChange.mock.calls.at(-1)![0]
}

beforeEach(() => {
  pollTiming.ms = 10
  pollTiming.deadlineMs = 10 * 60 * 1000
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined)
})

afterEach(() => {
  vi.mocked(uploadVideo).mockReset()
  vi.mocked(fetchVideoStatus).mockReset()
  vi.mocked(uploadImage).mockReset()
  vi.restoreAllMocks()
})

describe('PostEditor video box', () => {
  it('shows upload then transcode progress, then the clip', async () => {
    let report: (p: number) => void = () => {}
    let finishUpload: (s: VideoStatus) => void = () => {}
    let finishTranscode: (s: VideoStatus) => void = () => {}
    vi.mocked(uploadVideo).mockImplementation((_f, onProgress) => {
      report = onProgress
      return new Promise((resolve) => (finishUpload = resolve))
    })
    // 변환 완료는 테스트가 정한 때에만 와요. 다음 물음이 바로 READY를 받으면 "변환 중 40%"가 한 순간만 떠서,
    // 느린 컴퓨터(CI)에서는 찾은 글자가 확인 전에 사라졌어요.
    vi.mocked(fetchVideoStatus)
      .mockResolvedValueOnce(status({ status: 'PROCESSING', progress: 40 }))
      .mockImplementation(() => new Promise((resolve) => (finishTranscode = resolve)))
    const { onChange, onPendingChange } = setup(emptyBoxDoc)

    await userEvent.upload(await screen.findByLabelText('영상 파일 고르기'), videoFile())
    act(() => report(50))
    expect(await screen.findByText('올리는 중 50%')).toBeInTheDocument()
    expect(onPendingChange).toHaveBeenLastCalledWith({ busy: 1, failed: 0 })

    act(() => finishUpload(status({ status: 'QUEUED' })))
    expect(await screen.findByText('변환 중 40%')).toBeInTheDocument()

    await vi.waitFor(() => expect(fetchVideoStatus).toHaveBeenCalledTimes(2))
    act(() => finishTranscode(status({ status: 'READY', progress: 100, url: SRC, truncated: true })))
    await waitFor(() => expect(document.querySelector(`video[src="${SRC}"]`)).not.toBeNull())
    expect(screen.getByText('앞 30초만 넣었어요')).toBeInTheDocument()
    expect(onPendingChange).toHaveBeenLastCalledWith({ busy: 0, failed: 0 })
    expect(lastDoc(onChange).content![0].attrs!.src).toBe(SRC)
  })

  it('reports a failed transcode', async () => {
    vi.mocked(uploadVideo).mockResolvedValue(status({ status: 'FAILED', errorMessage: '변환하지 못했어요. 다른 파일을 올려 주세요' }))
    const { onPendingChange } = setup(emptyBoxDoc)
    await userEvent.upload(await screen.findByLabelText('영상 파일 고르기'), videoFile())
    expect(await screen.findByText('변환하지 못했어요. 다른 파일을 올려 주세요')).toBeInTheDocument()
    expect(onPendingChange).toHaveBeenLastCalledWith({ busy: 0, failed: 1 })
  })

  it('refuses a non-video file without uploading', async () => {
    const { onError } = setup(emptyBoxDoc)
    fireEvent.drop(await screen.findByText('파일을 업로드해주세요'), {
      dataTransfer: { files: [new File(['x'], 'a.png', { type: 'image/png' })] },
    })
    expect(onError).toHaveBeenCalledWith('영상 파일만 넣을 수 있어요')
    expect(uploadVideo).not.toHaveBeenCalled()
  })

  it('refuses a file over 200MB', async () => {
    const { onError } = setup(emptyBoxDoc)
    const big = videoFile()
    Object.defineProperty(big, 'size', { value: MAX_VIDEO_BYTES + 1 })
    fireEvent.drop(await screen.findByText('파일을 업로드해주세요'), { dataTransfer: { files: [big] } })
    expect(onError).toHaveBeenCalledWith('영상 파일은 200MB까지 올릴 수 있어요')
    expect(uploadVideo).not.toHaveBeenCalled()
  })

  it('refuses a fourth clip', async () => {
    const { onError } = setup({
      type: 'doc',
      content: [
        { type: 'video', attrs: { src: SRC } },
        { type: 'video', attrs: { src: SRC } },
        { type: 'video', attrs: { src: SRC } },
        { type: 'video', attrs: { src: null } },
      ],
    })
    fireEvent.drop(await screen.findByText('파일을 업로드해주세요'), { dataTransfer: { files: [videoFile()] } })
    expect(onError).toHaveBeenCalledWith('영상은 한 글에 3개까지 넣을 수 있어요')
    expect(uploadVideo).not.toHaveBeenCalled()
  })

  it('removes a clip with its remove button', async () => {
    const { onChange } = setup({ type: 'doc', content: [{ type: 'paragraph' }, { type: 'video', attrs: { src: SRC } }] })
    await userEvent.click(await screen.findByRole('button', { name: '영상 빼기' }))
    expect(JSON.stringify(lastDoc(onChange))).not.toContain('"video"')
  })

  it('stops polling once the box is removed', async () => {
    vi.mocked(uploadVideo).mockResolvedValue(status({ status: 'PROCESSING', progress: 10 }))
    vi.mocked(fetchVideoStatus).mockResolvedValue(status({ status: 'PROCESSING', progress: 20 }))
    setup(emptyBoxDoc)
    await userEvent.upload(await screen.findByLabelText('영상 파일 고르기'), videoFile())
    await waitFor(() => expect(fetchVideoStatus).toHaveBeenCalled())

    await userEvent.click(screen.getByRole('button', { name: '영상 빼기' }))
    const calls = vi.mocked(fetchVideoStatus).mock.calls.length
    await new Promise((r) => setTimeout(r, 100))
    expect(vi.mocked(fetchVideoStatus).mock.calls.length).toBeLessThanOrEqual(calls + 1)
  })

  it('keeps waiting through a brief outage (deploy or wifi blip)', async () => {
    vi.mocked(uploadVideo).mockResolvedValue(status({ status: 'PROCESSING', progress: 10 }))
    vi.mocked(fetchVideoStatus)
      .mockRejectedValueOnce(new ApiError(503, 'MAINTENANCE', '잠시 업데이트 중이에요. 조금 뒤에 다시 시도해 주세요.'))
      .mockRejectedValueOnce(new ApiError(0, 'NETWORK', '서버에 연결할 수 없어요'))
      .mockResolvedValue(status({ status: 'READY', progress: 100, url: SRC }))
    setup(emptyBoxDoc)
    await userEvent.upload(await screen.findByLabelText('영상 파일 고르기'), videoFile())
    await waitFor(() => expect(document.querySelector(`video[src="${SRC}"]`)).not.toBeNull())
  })

  it('gives up after the deadline instead of locking posting forever', async () => {
    pollTiming.deadlineMs = 50
    vi.mocked(uploadVideo).mockResolvedValue(status({ status: 'PROCESSING', progress: 10 }))
    vi.mocked(fetchVideoStatus).mockResolvedValue(status({ status: 'PROCESSING', progress: 20 }))
    const { onPendingChange } = setup(emptyBoxDoc)
    await userEvent.upload(await screen.findByLabelText('영상 파일 고르기'), videoFile())
    expect(await screen.findByText('변환이 너무 오래 걸려요. 다른 파일을 올려 주세요')).toBeInTheDocument()
    expect(onPendingChange).toHaveBeenLastCalledWith({ busy: 0, failed: 1 })
  })

  it('refuses video formats the server cannot take, before uploading', async () => {
    const { onError } = setup(emptyBoxDoc)
    fireEvent.drop(await screen.findByText('파일을 업로드해주세요'), {
      dataTransfer: { files: [new File(['x'], 'old.avi', { type: 'video/x-msvideo' })] },
    })
    expect(onError).toHaveBeenCalledWith('mp4, mov, webm, mkv 영상만 올릴 수 있어요')
    expect(uploadVideo).not.toHaveBeenCalled()
  })

  it('catches a video with no type dropped anywhere in the editor', async () => {
    vi.mocked(uploadVideo).mockResolvedValue(status({ status: 'PROCESSING', progress: 0 }))
    setup({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: '본문' }] }] })
    const handled = dropOnEditor(new File(['x'], 'clip.mov', { type: '' }))
    expect(handled).toBe(true)
    await waitFor(() => expect(uploadVideo).toHaveBeenCalled())
  })

  it('refuses other files dropped on the editor', async () => {
    const { onError } = setup({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: '본문' }] }] })
    expect(dropOnEditor(new File(['x'], 'notes.pdf', { type: 'application/pdf' }))).toBe(true)
    expect(onError).toHaveBeenCalledWith('사진이나 영상만 넣을 수 있어요')
  })

  it('keeps the browser from opening a file dropped outside the editor', async () => {
    setup({ type: 'doc', content: [{ type: 'paragraph' }] })
    await screen.findByRole('button', { name: '영상' })
    const drop = new Event('drop', { bubbles: true, cancelable: true })
    Object.defineProperty(drop, 'dataTransfer', { value: { files: [new File(['x'], 'a.mp4')], types: ['Files'] } })
    document.body.dispatchEvent(drop)
    expect(drop.defaultPrevented).toBe(true)
  })

  it('adds a video box from the toolbar', async () => {
    setup({ type: 'doc', content: [{ type: 'paragraph' }] })
    await userEvent.click(screen.getByRole('button', { name: '영상' }))
    expect(await screen.findByText('파일을 업로드해주세요')).toBeInTheDocument()
  })
})

describe('PostEditor photo box', () => {
  it('turns into a photo once uploaded', async () => {
    vi.mocked(uploadImage).mockResolvedValue({ id: 'i1', url: '/api/images/i1' })
    const { onChange } = setup({ type: 'doc', content: [{ type: 'uploadBox' }] })
    fireEvent.drop(await screen.findByText('사진을 업로드해주세요'), {
      dataTransfer: { files: [new File(['x'], 'a.png', { type: 'image/png' })] },
    })
    await waitFor(() => expect(JSON.stringify(lastDoc(onChange))).toContain('/api/images/i1'))
    expect(JSON.stringify(lastDoc(onChange))).not.toContain('uploadBox')
  })
})
