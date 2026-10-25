import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderWithProviders } from '../test/render'
import SiteFooter from './SiteFooter'

describe('SiteFooter', () => {
  it('shows the Riot Games fan content notice', () => {
    renderWithProviders(<SiteFooter />)
    const footer = screen.getByRole('contentinfo')
    expect(footer).toHaveTextContent('ARAM은 Riot Games의 보증을 받지 않았으며')
    expect(footer).toHaveTextContent('Riot Games, Inc.의 상표 또는 등록 상표예요')
  })
})
