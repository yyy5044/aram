import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import Segmented from './Segmented'

const OPTIONS = [
  { value: 'latest', label: '최신순' },
  { value: 'likes', label: '추천순' },
] as const

describe('Segmented', () => {
  it('presses only the current option and reports a change', async () => {
    const onChange = vi.fn()
    render(<Segmented options={[...OPTIONS]} value="latest" onChange={onChange} label="정렬" />)
    expect(screen.getByRole('group', { name: '정렬' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '최신순' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: '추천순' })).toHaveAttribute('aria-pressed', 'false')
    await userEvent.click(screen.getByRole('button', { name: '추천순' }))
    expect(onChange).toHaveBeenCalledWith('likes')
  })
})
