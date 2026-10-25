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

  it('draws a mention inside a list item as a box', async () => {
    renderWithProviders(
      <PostContentView
        content={{
          type: 'doc',
          content: [
            {
              type: 'bulletList',
              content: [
                {
                  type: 'listItem',
                  content: [
                    {
                      type: 'paragraph',
                      content: [
                        { type: 'tagMention', attrs: { kind: 'champion', id: 'XinZhao', label: '신짜오' } },
                        { type: 'text', text: ' 추천해요' },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        }}
      />,
    )
    await vi.waitFor(() => expect(document.querySelector('li [data-mention-box]')).not.toBeNull())
    expect(document.querySelector('li [data-mention-box]')?.textContent).toBe('신짜오')
  })
})
