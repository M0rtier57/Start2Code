import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

import { nl } from './nl'
import { en } from './en'

const DICTIONARIES = { nl, en }

export const LANGUAGES = [
  { id: 'nl', label: 'Nederlands', flag: '🇳🇱' },
  { id: 'en', label: 'English', flag: '🇬🇧' }
]

const STORAGE_KEY = 's2c:lang'
export const DEFAULT_LANG = 'nl'

const I18nContext = createContext(null)

function readInitialLanguage() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved && DICTIONARIES[saved]) return saved
  } catch {
    // Private browsing can throw on localStorage; the default is fine.
  }
  // Only English speakers get English automatically — everyone else gets Dutch,
  // which is the language this is built for.
  return navigator.language?.toLowerCase().startsWith('en') ? 'en' : DEFAULT_LANG
}

export function I18nProvider({ children }) {
  const [lang, setLang] = useState(readInitialLanguage)

  useEffect(() => {
    document.documentElement.lang = lang
    try { localStorage.setItem(STORAGE_KEY, lang) } catch { /* not important */ }
  }, [lang])

  /**
   * t('some.key', { name: 'Sam' })
   *
   * Falls back to Dutch, then to the key itself, so a missing translation shows
   * something usable instead of blank space.
   */
  const t = useCallback((key, vars) => {
    const value = DICTIONARIES[lang]?.[key] ?? DICTIONARIES[DEFAULT_LANG]?.[key] ?? key

    if (!vars) return value
    return Object.entries(vars).reduce(
      (text, [name, replacement]) => text.replaceAll(`{${name}}`, String(replacement)),
      value
    )
  }, [lang])

  /**
   * Curriculum text is authored as { nl: '…', en: '…' }. Custom lessons written
   * by a teacher are a plain string in whatever language they typed.
   */
  const pick = useCallback((value) => {
    if (value == null) return ''
    if (typeof value === 'string' || Array.isArray(value)) return value
    return value[lang] ?? value[DEFAULT_LANG] ?? ''
  }, [lang])

  const value = useMemo(
    () => ({ lang, setLang, t, pick, languages: LANGUAGES }),
    [lang, t, pick]
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const context = useContext(I18nContext)
  if (!context) throw new Error('useI18n must be used inside an <I18nProvider>')
  return context
}

/** Convenience for components that only need the translate function. */
export function useT() {
  return useI18n().t
}
