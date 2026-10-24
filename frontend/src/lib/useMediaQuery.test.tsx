import { act, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useMediaQuery } from './useMediaQuery'

afterEach(() => vi.unstubAllGlobals())

function Probe() {
  return <span>{useMediaQuery('(max-width: 560px)') ? 'narrow' : 'wide'}</span>
}

describe('useMediaQuery', () => {
  it('re-renders when the media query starts or stops matching', () => {
    let matches = false
    const listeners = new Set<() => void>()
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({
        get matches() {
          return matches
        },
        addEventListener: (_: string, fn: () => void) => listeners.add(fn),
        removeEventListener: (_: string, fn: () => void) => listeners.delete(fn),
      })),
    )
    render(<Probe />)
    expect(screen.getByText('wide')).toBeInTheDocument()

    act(() => {
      matches = true
      listeners.forEach((fn) => fn())
    })
    expect(screen.getByText('narrow')).toBeInTheDocument()
  })
})
