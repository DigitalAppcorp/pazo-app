import { PazoSplashArtwork } from './PazoSplashArtwork'
import './pazoSplash.css'

interface PazoSplashProps {
  buildVersion: string
  lang: 'es' | 'en'
}

/**
 * Animated brand transition. Display lifetime remains owned by App.tsx
 * so this presentation cannot delay auth/bootstrap or trigger navigation.
 */
export const PazoSplash = ({ buildVersion, lang }: PazoSplashProps) => (
  <main
    role="status"
    aria-label={lang === 'es' ? 'PAZO se está abriendo' : 'PAZO is opening'}
    className="pazo-splash"
  >
    <PazoSplashArtwork />
    <p className="pazo-splash__version" aria-hidden="true">
      {lang === 'es' ? 'Versión' : 'Version'} {buildVersion}
    </p>
    <div className="pazo-splash__exit" aria-hidden="true" />
  </main>
)
