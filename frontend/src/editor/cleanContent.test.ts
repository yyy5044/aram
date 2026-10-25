import { describe, expect, it } from 'vitest'
import { cleanContent } from './cleanContent'

const SRC = '/api/videos/0b6c3a4e-1d2f-4a5b-8c9d-0e1f2a3b4c5d'

describe('cleanContent', () => {
  it('drops empty video boxes and photo boxes and editor-only attributes', () => {
    const cleaned = cleanContent({
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: '안녕' }] },
        { type: 'video', attrs: { src: null, uploadId: 'u1', truncated: false } },
        { type: 'uploadBox' },
        { type: 'video', attrs: { src: SRC, uploadId: 'u2', truncated: true } },
        { type: 'image', attrs: { src: '/api/images/x' } },
      ],
    })
    expect(cleaned).toEqual({
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: '안녕' }] },
        { type: 'video', attrs: { src: SRC } },
        { type: 'image', attrs: { src: '/api/images/x' } },
      ],
    })
  })

  it('cleans nested content too', () => {
    const cleaned = cleanContent({
      type: 'doc',
      content: [{ type: 'blockquote', content: [{ type: 'uploadBox' }, { type: 'paragraph' }] }],
    })
    expect(cleaned).toEqual({ type: 'doc', content: [{ type: 'blockquote', content: [{ type: 'paragraph' }] }] })
  })
})
