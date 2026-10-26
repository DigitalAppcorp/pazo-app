// PAZO interface language is a client preference, independent of Auth, ads and payments.
export type PazoLanguage = 'es' | 'en'
export const PAZO_LANGUAGE_KEY = 'pazo_language_preference_v1'

const titles: Record<PazoLanguage, string> = {
  es: 'Pazo • Su mundo, más cerca',
  en: 'Pazo • Their world, closer',
}

export function resolveInitialLanguage(
  stored: unknown,
  browserLanguages: readonly unknown[] | undefined,
  browserLanguage?: unknown,
): PazoLanguage {
  // An explicit choice wins over browser/device changes and ad campaign language.
  if (stored === 'es' || stored === 'en') return stored

  // Respect the browser preference order; skip unsupported locales, then use English.
  const candidates = [
    ...(Array.isArray(browserLanguages) ? browserLanguages : []),
    browserLanguage,
  ]
  for (const value of candidates) {
    if (typeof value !== 'string') continue
    const base = value.trim().toLowerCase().split(/[-_]/, 1)[0]
    if (base === 'es' || base === 'en') return base
  }
  return 'en'
}

export function getInitialLanguage(): PazoLanguage {
  let stored: string | null = null
  try {
    if (typeof window !== 'undefined') {
      stored = window.localStorage.getItem(PAZO_LANGUAGE_KEY)
    }
  } catch {
    // Browsers can block Storage (e.g. private/restricted contexts).
  }
  return resolveInitialLanguage(
    stored,
    typeof navigator === 'undefined' ? [] : navigator.languages,
    typeof navigator === 'undefined' ? undefined : navigator.language,
  )
}

export function rememberLanguage(
  language: PazoLanguage,
  storage?: Pick<Storage, 'setItem'>,
): boolean {
  try {
    (storage ?? window.localStorage).setItem(PAZO_LANGUAGE_KEY, language)
    return true
  } catch {
    // Keep the manual switch functional for this session if Storage is blocked.
    return false
  }
}

export function applyDocumentLanguage(
  language: PazoLanguage,
  target?: Pick<Document, 'documentElement' | 'title'>,
): void {
  const doc = target ?? (typeof document === 'undefined' ? null : document)
  if (!doc) return
  doc.documentElement.lang = language
  doc.title = titles[language]
}
