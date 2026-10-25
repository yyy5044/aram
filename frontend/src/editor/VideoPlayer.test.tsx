import { act, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { setIntersecting } from '../test/intersection'
import { renderWithProviders } from '../test/render'
import VideoPlayer from './VideoPlayer'

const SRC = '/api/videos/0b6c3a4e-1d2f-4a5b-8c9d-0e1f2a3b4c5d'

let play: ReturnType<typeof vi.spyOn>
let pause: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined)
  pause = vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {})
})

afterEach(() => {
  vi.restoreAllMocks()
})

function video() {
  return document.querySelector('video') as HTMLVideoElement
}

describe('VideoPlayer', () => {
  it('is a silent looping inline video with a poster', () => {
    renderWithProviders(<VideoPlayer src={SRC} />)
    expect(video()).toHaveAttribute('src', SRC)
    expect(video()).toHaveAttribute('poster', `${SRC}/poster`)
    expect(video().muted).toBe(true)
    expect(video().loop).toBe(true)
    expect(video()).toHaveAttribute('playsinline')
  })

  it('plays when visible and pauses when scrolled away', async () => {
    renderWithProviders(<VideoPlayer src={SRC} />)
    await act(async () => setIntersecting(video(), true))
    expect(play).toHaveBeenCalled()
    expect(screen.getByRole('button', { name: '영상 멈추기' })).toBeInTheDocument()

    await act(async () => setIntersecting(video(), false))
    expect(pause).toHaveBeenCalled()
    expect(screen.getByRole('button', { name: '영상 재생' })).toBeInTheDocument()
  })

  it('pauses on click and stays paused when scrolled back', async () => {
    renderWithProviders(<VideoPlayer src={SRC} />)
    await act(async () => setIntersecting(video(), true))

    await userEvent.click(screen.getByRole('button', { name: '영상 멈추기' }))
    expect(pause).toHaveBeenCalled()
    expect(screen.getByRole('button', { name: '영상 재생' })).toBeInTheDocument()

    play.mockClear()
    await act(async () => setIntersecting(video(), true))
    expect(play).not.toHaveBeenCalled()

    await userEvent.click(screen.getByRole('button', { name: '영상 재생' }))
    expect(play).toHaveBeenCalled()
    expect(screen.getByRole('button', { name: '영상 멈추기' })).toBeInTheDocument()
  })

  it('shows the play mark when the browser blocks autoplay', async () => {
    play.mockRejectedValue(new Error('NotAllowedError'))
    renderWithProviders(<VideoPlayer src={SRC} />)
    await act(async () => setIntersecting(video(), true))
    expect(screen.getByRole('button', { name: '영상 재생' })).toBeInTheDocument()
  })
})
