import { LANGUAGES, useLanguage, type Language } from '../lib/language'

/** 머리말의 언어 드롭다운. */
export default function LanguageSelect() {
  const { language, setLanguage } = useLanguage()
  return (
    <label className="flex items-center gap-1 text-sm text-slate-300">
      <span aria-hidden="true">🌐</span>
      <select
        aria-label="언어"
        value={language}
        onChange={(e) => setLanguage(e.target.value as Language)}
        className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-sm text-slate-200"
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
