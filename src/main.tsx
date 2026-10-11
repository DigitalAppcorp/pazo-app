import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { PAZO_PRIVACY_SUPPORT_EMAIL, PAZO_PRIVACY_SUPPORT_MAILTO } from './features/legal/supportContact.ts'
import { getPublicSupabaseConfig } from './lib/publicConfig.ts'
import { ErrorBoundary } from './components/ErrorBoundary.tsx'
import { initializeObservability } from './services/observability.ts'
import { registerPazoPwa } from './features/pwa/registerPwa.ts'

const root = createRoot(document.getElementById('root')!)
if (!getPublicSupabaseConfig(import.meta.env)) {
  const english = navigator.language.startsWith('en')
  root.render(<main role="alert" className="p-6 text-[#204E4A] bg-[#FAF8F5] min-h-screen">
    <h1>{english ? 'PAZO is unavailable' : 'PAZO no está disponible'}</h1>
    <p>{english ? 'This environment needs its public configuration. Please contact support.'
      : 'Este entorno necesita su configuración pública. Contacta con soporte.'}</p>
    <a href={PAZO_PRIVACY_SUPPORT_MAILTO}>{PAZO_PRIVACY_SUPPORT_EMAIL}</a>
  </main>)
} else {
  // Do not import modules that initialize database clients before validation.
  void import('./App.tsx').then(({ default: App }) => {
    initializeObservability()
    registerPazoPwa()
    root.render(<StrictMode><ErrorBoundary><App /></ErrorBoundary></StrictMode>)
  }).catch(() => {
    root.render(<main role="alert" className="p-6 text-[#204E4A] bg-[#FAF8F5] min-h-screen">
      <p>{navigator.language.startsWith('en') ? 'PAZO could not load. Reload or contact support.'
        : 'PAZO no pudo cargar. Recarga o contacta con soporte.'}</p>
      <a href={PAZO_PRIVACY_SUPPORT_MAILTO}>{PAZO_PRIVACY_SUPPORT_EMAIL}</a>
    </main>)
  })
}
