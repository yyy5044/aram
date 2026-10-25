import { describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../test/render'
import PostContentView from './PostContentView'

const SRC = '/api/videos/0b6c3a4e-1d2f-4a5b-8c9d-0e1f2a3b4c5d'

describe('PostContentView', () => {
  it('draws a video node as a silent looping clip', async () => {
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined)
    renderWithProviders(
      <PostContentView
        content={{
          type: 'doc',
          content: [
            { type: 'paragraph', content: [{ type: 'text', text: '펜타킬 장면이에요' }] },
            { type: 'video', attrs: { src: SRC } },
          ],
        }}
      />,
    )
    await vi.waitFor(() => expect(document.querySelector(`video[src="${SRC}"]`)).not.toBeNull())
    const video = document.querySelector('video') as HTMLVideoElement
    expect(video.muted).toBe(true)
    expect(video.loop).toBe(true)
    vi.restoreAllMocks()
  })
})
