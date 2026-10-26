import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { PAZO_PRIVACY_SUPPORT_EMAIL, PAZO_PRIVACY_SUPPORT_MAILTO } from './features/legal/supportContact.ts'
import { getPublicSupabaseConfig } from './lib/publicConfig.ts'
import { ErrorBoundary } from './components/ErrorBoundary.tsx'
import { initializeObservability } from './services/observability.ts'
import { registerPazoPwa } from './features/pwa/registerPwa.ts'
import { applyDocumentLanguage, getInitialLanguage } from './features/i18n/languagePreference.ts'
// Capture the native install event before the authenticated application mounts.
import './features/pwa/installPromptBridge.ts'

const initialLanguage = getInitialLanguage()
applyDocumentLanguage(initialLanguage)
const root = createRoot(document.getElementById('root')!)
if (!getPublicSupabaseConfig(import.meta.env)) {
  const english = initialLanguage === 'en'
  root.render(<main role="alert" className="p-6 text-[#204E4A] bg-[#FAF8F5] min-h-screen">
    <h1>{english ? 'PAZO is unavailable' : 'PAZO no está disponible'}</h1>
    <p>{english ? 'This environment needs its public configuration. Please contact support.'
      : 'Este entorno necesita su configuración pública. Contacta con soporte.'}</p>
    <a href={PAZO_PRIVACY_SUPPORT_MAILTO}>{PAZO_PRIVACY_SUPPORT_EMAIL}</a>
  </main>)
} else {
  // Do not import modules that initialize database clients before validation.
  void Promise.all([import('./App.tsx'),import('./features/maintenance/MaintenanceGate.tsx')]).then(([{default:App},{MaintenanceGate}]) => {
    initializeObservability()
    registerPazoPwa()
    root.render(<StrictMode><ErrorBoundary><MaintenanceGate><App /></MaintenanceGate></ErrorBoundary></StrictMode>)
  }).catch(() => {
    root.render(<main role="alert" className="p-6 text-[#204E4A] bg-[#FAF8F5] min-h-screen">
      <p>{initialLanguage === 'en' ? 'PAZO could not load. Reload or contact support.'
        : 'PAZO no pudo cargar. Recarga o contacta con soporte.'}</p>
      <a href={PAZO_PRIVACY_SUPPORT_MAILTO}>{PAZO_PRIVACY_SUPPORT_EMAIL}</a>
      <a href="/maintenance-admin.html">{initialLanguage === 'en'?'Administrator recovery':'Recuperación administrativa'}</a>
    </main>)
  })
}
