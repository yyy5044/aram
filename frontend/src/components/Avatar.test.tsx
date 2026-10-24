import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import Avatar from './Avatar'

describe('Avatar', () => {
  it('shows the image cropped into a circle', () => {
    const { container } = render(<Avatar src="/api/images/abc" size={40} />)
    const img = container.querySelector('img')!
    expect(img).toHaveAttribute('src', '/api/images/abc')
    expect(img).toHaveAttribute('alt', '')
    expect(img).toHaveClass('rounded-full', 'object-cover')
    expect(img).toHaveStyle({ width: '40px', height: '40px' })
  })

  it('shows a default circle without an image', () => {
    const { container } = render(<Avatar src={null} size={28} />)
    expect(container.querySelector('img')).toBeNull()
    const circle = container.querySelector('[aria-hidden="true"]')!
    expect(circle).toHaveClass('rounded-full')
    expect(circle).toHaveStyle({ width: '28px', height: '28px' })
  })
})
