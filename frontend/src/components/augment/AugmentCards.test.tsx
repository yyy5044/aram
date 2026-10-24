import { screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { AugmentDetail, AugmentText } from '../../api/types'
import { json, mockApi } from '../../test/mockApi'
import { renderWithProviders } from '../../test/render'
import AugmentCards from './AugmentCards'

afterEach(() => {
  vi.unstubAllGlobals()
  localStorage.clear()
})

const detail = (translation: AugmentText | null): AugmentDetail => ({
  id: 'OminousPact',
  rarity: 'PRISMATIC',
  iconUrl: 'i.png',
  original: { locale: 'en', name: 'Ominous Pact', description: 'Gain AP' },
  translation,
})

describe('AugmentCards', () => {
  it('shows original and translation cards with labels', async () => {
    mockApi({
      'GET /api/augments/OminousPact': () =>
        json(detail({ locale: 'ko', name: '불길한 서약', description: '주문력' })),
    })
    renderWithProviders(<AugmentCards augmentId="OminousPact" />)
    expect(await screen.findByRole('article', { name: 'Ominous Pact' })).toBeInTheDocument()
    expect(screen.getByRole('article', { name: '불길한 서약' })).toBeInTheDocument()
    expect(screen.getByText('원문')).toBeInTheDocument()
    expect(screen.getByText('English')).toBeInTheDocument()
    expect(screen.getByText('번역')).toBeInTheDocument()
    expect(screen.getByText('한국어')).toBeInTheDocument()
  })

  it('asks the API for the current language and shows one card when it equals the original', async () => {
    localStorage.setItem('lang', 'en')
    const api = mockApi({ 'GET /api/augments/OminousPact': () => json(detail(null)) })
    renderWithProviders(<AugmentCards augmentId="OminousPact" />)
    await screen.findByRole('article', { name: 'Ominous Pact' })
    expect(api.find('GET', '/api/augments/OminousPact')[0].query.get('lang')).toBe('en')
    expect(screen.getAllByRole('article')).toHaveLength(1)
    expect(screen.queryByText('번역')).not.toBeInTheDocument()
  })

  it('shows an empty frame when a translation row is missing', async () => {
    mockApi({ 'GET /api/augments/OminousPact': () => json(detail(null)) })
    renderWithProviders(<AugmentCards augmentId="OminousPact" />)
    await screen.findByRole('article', { name: 'Ominous Pact' })
    expect(screen.getAllByRole('article')).toHaveLength(1)
    expect(screen.getByText('번역')).toBeInTheDocument()
    expect(screen.getByText('아직 설명이 없어요')).toBeInTheDocument()
  })

  it('shows loading and error states', async () => {
    mockApi({ 'GET /api/augments/OminousPact': () => json({ code: 'INTERNAL_ERROR', message: '잠시 후 다시 시도해주세요' }, 500) })
    renderWithProviders(<AugmentCards augmentId="OminousPact" />)
    expect(screen.getByText('불러오는 중이에요')).toBeInTheDocument()
    expect(await screen.findByText('잠시 후 다시 시도해주세요')).toBeInTheDocument()
  })
})
