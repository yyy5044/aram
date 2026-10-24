import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import LanguageProvider from '../components/LanguageProvider'
import { languageName, useLanguage } from './language'

afterEach(() => localStorage.clear())

function Probe() {
  const { language, setLanguage } = useLanguage()
  return (
    <div>
      <output>{language}</output>
      <button type="button" onClick={() => setLanguage('en')}>
        영어로
      </button>
    </div>
  )
}

describe('language setting', () => {
  it('defaults to ko and remembers the choice', async () => {
    render(
      <LanguageProvider>
        <Probe />
      </LanguageProvider>,
    )
    expect(screen.getByRole('status')).toHaveTextContent('ko')
    await userEvent.click(screen.getByRole('button', { name: '영어로' }))
    expect(screen.getByRole('status')).toHaveTextContent('en')
    expect(localStorage.getItem('lang')).toBe('en')
  })

  it('reads a stored choice on start', () => {
    localStorage.setItem('lang', 'en')
    render(
      <LanguageProvider>
        <Probe />
      </LanguageProvider>,
    )
    expect(screen.getByRole('status')).toHaveTextContent('en')
  })

  it('ignores a broken stored value', () => {
    localStorage.setItem('lang', 'zz')
    render(
      <LanguageProvider>
        <Probe />
      </LanguageProvider>,
    )
    expect(screen.getByRole('status')).toHaveTextContent('ko')
  })

  it('names languages', () => {
    expect(languageName('ko')).toBe('한국어')
    expect(languageName('en')).toBe('English')
  })
})
