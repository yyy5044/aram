import type { JSONContent } from '@tiptap/core'
import { act, fireEvent, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
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

function lastDoc(onChange: ReturnType<typeof vi.fn>): JSONContent {
  return onChange.mock.calls.at(-1)![0]
}

beforeEach(() => {
  pollTiming.ms = 10
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
    vi.mocked(uploadVideo).mockImplementation((_f, onProgress) => {
      report = onProgress
      return new Promise((resolve) => (finishUpload = resolve))
    })
    vi.mocked(fetchVideoStatus)
      .mockResolvedValueOnce(status({ status: 'PROCESSING', progress: 40 }))
      .mockResolvedValue(status({ status: 'READY', progress: 100, url: SRC, truncated: true }))
    const { onChange, onPendingChange } = setup(emptyBoxDoc)

    await userEvent.upload(await screen.findByLabelText('영상 파일 고르기'), videoFile())
    act(() => report(50))
    expect(await screen.findByText('올리는 중 50%')).toBeInTheDocument()
    expect(onPendingChange).toHaveBeenLastCalledWith({ busy: 1, failed: 0 })

    act(() => finishUpload(status({ status: 'QUEUED' })))
    expect(await screen.findByText('변환 중 40%')).toBeInTheDocument()

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
