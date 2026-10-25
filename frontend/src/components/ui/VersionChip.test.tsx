import { screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { json, mockApi } from '../../test/mockApi'
import { renderWithProviders } from '../../test/render'
import VersionChip from './VersionChip'

afterEach(() => vi.unstubAllGlobals())

describe('VersionChip', () => {
  it('marks the current patch as latest', async () => {
    mockApi({ 'GET /api/patches': () => json({ current: '26.21', patches: ['26.21', '26.20'] }) })
    renderWithProviders(
      <>
        <VersionChip patch="26.21" />
        <VersionChip patch="26.20" />
      </>,
    )
    expect(await screen.findByText('최신')).toBeInTheDocument()
    expect(screen.getAllByText('최신')).toHaveLength(1)
    expect(screen.getByText('최신').closest('[data-version]')).toHaveAttribute('data-version', '26.21')
    expect(screen.getByText('26.20').closest('[data-version]')).toHaveTextContent('26.20 버전')
  })

  it('shows only the number when the patch list cannot be loaded', async () => {
    const api = mockApi({ 'GET /api/patches': () => json({ code: 'INTERNAL_ERROR', message: '잠시 후 다시 시도해주세요' }, 500) })
    renderWithProviders(<VersionChip patch="26.21" />)
    await vi.waitFor(() => expect(api.find('GET', '/api/patches')).toHaveLength(1))
    expect(screen.getByText('26.21').closest('[data-version]')).toHaveTextContent('26.21 버전')
    expect(screen.queryByText('최신')).not.toBeInTheDocument()
  })
})
