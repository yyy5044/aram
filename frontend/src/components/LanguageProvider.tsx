import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { LanguageContext, readStoredLanguage, writeStoredLanguage, type Language } from '../lib/language'

/** 사이트 언어 설정. 지금은 증강 카드의 번역 언어만 바꾸고, 화면 문구 번역은 나중에 같은 설정을 읽어요. */
export default function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(readStoredLanguage)
  const setLanguage = useCallback((next: Language) => {
    writeStoredLanguage(next)
    setLanguageState(next)
  }, [])
  const value = useMemo(() => ({ language, setLanguage }), [language, setLanguage])
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}
