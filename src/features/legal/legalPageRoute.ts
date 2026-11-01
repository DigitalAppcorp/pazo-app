// Public addresses of the published legal texts, as Google's consent screen
// requires. Unlike the in-app dialog, they need no account or database client.
export type LegalPageKind = 'privacy' | 'terms'

export const legalPageKind = (pathname: string): LegalPageKind | null =>
  pathname === '/privacy' ? 'privacy' : pathname === '/terms' ? 'terms' : null

// An explicit link wins for this visit only; it never changes the saved preference.
export const legalPageLanguage = (search: string, fallback: 'es' | 'en'): 'es' | 'en' => {
  const requested = new URLSearchParams(search).get('lang')
  return requested === 'es' || requested === 'en' ? requested : fallback
}
