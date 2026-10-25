import { fireEvent, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../test/render'
import UploadBox from './UploadBox'

describe('UploadBox', () => {
  it('asks for a video file when empty', () => {
    renderWithProviders(<UploadBox kind="video" state={{ phase: 'empty' }} onFile={() => {}} />)
    expect(screen.getByText('파일을 업로드해주세요')).toBeInTheDocument()
    expect(screen.getByText('끌어다 놓거나 눌러서 고르기 · 30초 · 200MB까지')).toBeInTheDocument()
  })

  it('asks for a photo in a photo box', () => {
    renderWithProviders(<UploadBox kind="image" state={{ phase: 'empty' }} onFile={() => {}} />)
    expect(screen.getByText('사진을 업로드해주세요')).toBeInTheDocument()
    expect(screen.getByText('끌어다 놓거나 눌러서 고르기')).toBeInTheDocument()
  })

  it('shows each phase', () => {
    const { rerender } = renderWithProviders(
      <UploadBox kind="video" state={{ phase: 'uploading', percent: 45 }} onFile={() => {}} />,
    )
    expect(screen.getByText('올리는 중 45%')).toBeInTheDocument()
    rerender(<UploadBox kind="video" state={{ phase: 'queued' }} onFile={() => {}} />)
    expect(screen.getByText('변환 차례를 기다리고 있어요')).toBeInTheDocument()
    rerender(<UploadBox kind="video" state={{ phase: 'processing', percent: 62 }} onFile={() => {}} />)
    expect(screen.getByText('변환 중 62%')).toBeInTheDocument()
    rerender(<UploadBox kind="video" state={{ phase: 'failed', message: '변환하지 못했어요. 다른 파일을 올려 주세요' }} onFile={() => {}} />)
    expect(screen.getByText('변환하지 못했어요. 다른 파일을 올려 주세요')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '다른 파일 올리기' })).toBeInTheDocument()
  })

  it('takes a dropped file', () => {
    const onFile = vi.fn()
    renderWithProviders(<UploadBox kind="video" state={{ phase: 'empty' }} onFile={onFile} />)
    const file = new File(['x'], 'clip.mp4', { type: 'video/mp4' })
    fireEvent.drop(screen.getByText('파일을 업로드해주세요'), { dataTransfer: { files: [file] } })
    expect(onFile).toHaveBeenCalledWith(file)
  })

  it('takes a picked file', async () => {
    const onFile = vi.fn()
    renderWithProviders(<UploadBox kind="video" state={{ phase: 'empty' }} onFile={onFile} />)
    const file = new File(['x'], 'clip.mp4', { type: 'video/mp4' })
    await userEvent.upload(screen.getByLabelText('영상 파일 고르기'), file)
    expect(onFile).toHaveBeenCalledWith(file)
  })
})
