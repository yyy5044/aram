import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import BottomSheet from './BottomSheet'

describe('BottomSheet', () => {
  it('shows nothing while closed', () => {
    render(
      <BottomSheet open={false} onClose={() => {}} label="강철심장">
        <p>내용</p>
      </BottomSheet>,
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('opens as a labelled dialog and moves focus to 닫기', () => {
    render(
      <BottomSheet open onClose={() => {}} label="강철심장">
        <p>내용</p>
      </BottomSheet>,
    )
    const dialog = screen.getByRole('dialog', { name: '강철심장' })
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(screen.getByRole('button', { name: '닫기' })).toHaveFocus()
    expect(document.body.style.overflow).toBe('hidden')
  })

  it('closes with 닫기, Escape and the backdrop', async () => {
    const onClose = vi.fn()
    render(
      <BottomSheet open onClose={onClose} label="강철심장">
        <p>내용</p>
      </BottomSheet>,
    )
    await userEvent.click(screen.getByRole('button', { name: '닫기' }))
    await userEvent.keyboard('{Escape}')
    await userEvent.click(screen.getByTestId('sheet-backdrop'))
    expect(onClose).toHaveBeenCalledTimes(3)
  })

  it('does not close when the sheet itself is clicked', async () => {
    const onClose = vi.fn()
    render(
      <BottomSheet open onClose={onClose} label="강철심장">
        <p>내용</p>
      </BottomSheet>,
    )
    await userEvent.click(screen.getByText('내용'))
    expect(onClose).not.toHaveBeenCalled()
  })

  it('gives back scrolling and focus when it closes', () => {
    const before = document.createElement('button')
    document.body.appendChild(before)
    before.focus()
    const { rerender } = render(
      <BottomSheet open onClose={() => {}} label="강철심장">
        <p>내용</p>
      </BottomSheet>,
    )
    rerender(
      <BottomSheet open={false} onClose={() => {}} label="강철심장">
        <p>내용</p>
      </BottomSheet>,
    )
    expect(document.body.style.overflow).toBe('')
    expect(before).toHaveFocus()
    before.remove()
  })
})
