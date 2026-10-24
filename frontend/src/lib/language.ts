import { createContext, useContext } from 'react'

export type Language = 'ko' | 'en'

export const LANGUAGES: { code: Language; name: string }[] = [
  { code: 'ko', name: '한국어' },
  { code: 'en', name: 'English' },
]

/** 증강 설명 원문의 언어. 선택 언어가 이것과 같으면 번역 카드를 보여주지 않아요. */
export const ORIGINAL_LANGUAGE: Language = 'en'

const STORAGE_KEY = 'lang'

export const DEFAULT_LANGUAGE: Language = 'ko'

export function languageName(code: Language): string {
  return LANGUAGES.find((l) => l.code === code)?.name ?? code
}

function isLanguage(value: unknown): value is Language {
  return LANGUAGES.some((l) => l.code === value)
}

export function readStoredLanguage(): Language {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return isLanguage(stored) ? stored : DEFAULT_LANGUAGE
  } catch {
    return DEFAULT_LANGUAGE
  }
}

export function writeStoredLanguage(language: Language) {
  try {
    localStorage.setItem(STORAGE_KEY, language)
  } catch {
    // 저장이 막힌 브라우저에서는 이번 방문 동안만 기억해요.
  }
}

type LanguageApi = { language: Language; setLanguage: (language: Language) => void }

export const LanguageContext = createContext<LanguageApi>({ language: DEFAULT_LANGUAGE, setLanguage: () => {} })

export function useLanguage() {
  return useContext(LanguageContext)
}
