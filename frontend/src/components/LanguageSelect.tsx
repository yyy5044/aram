import { LANGUAGES, useLanguage, type Language } from '../lib/language'

/** 머리말의 언어 고르기(증강 카드의 번역 언어). 밤하늘 위라 테두리만 옅게 둬요. */
export default function LanguageSelect() {
  const { language, setLanguage } = useLanguage()
  return (
    <label className="flex items-center gap-1 text-[13px] text-nav">
      <span aria-hidden="true" className="hidden lg:inline">
        🌐
      </span>
      <select
        aria-label="언어"
        value={language}
        onChange={(e) => setLanguage(e.target.value as Language)}
        className="h-10 rounded-touch border border-white/15 bg-transparent px-2 text-[13px] text-nav hover:text-white focus-visible:outline-2 focus-visible:outline-gold [&>option]:text-ink"
      >
        {LANGUAGES.map((l) => (
          <option key={l.code} value={l.code}>
            {l.name}
          </option>
        ))}
      </select>
    </label>
  )
}
