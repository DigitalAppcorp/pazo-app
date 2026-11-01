import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { supabase } from '../../services/supabaseClient'
import { useAuth } from '../../context/AuthContext'
import { LegalPreviewDialog } from '../legal/LegalPreviewDialog'
import { MetaConsentChoice } from './MetaConsentChoice'
import { createMetaConsentController } from './metaConsentController.mjs'
import { isMetaConsentEligible, subscribeMetaConsentEligibility } from './marketingRuntime'
import { isMetaPixelEnabled } from './metaRelease'

interface Snapshot { id: string; accessToken: string }

// Keeps the Auth session readable synchronously; the controller rechecks it
// before every step so that a switched account can never use a pending grant.
function useMetaController() {
  const { user } = useAuth()
  const snapshot = useRef<Snapshot | null>(null)
  const [token, setToken] = useState<string | null>(null)
  useEffect(() => {
    const accept = (id?: string, accessToken?: string) => {
      snapshot.current = id && accessToken ? { id, accessToken } : null
      setToken(accessToken ?? null)
    }
    void supabase.auth.getSession().then(({ data }) => accept(data.session?.user.id, data.session?.access_token))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      accept(session?.user.id, session?.access_token)
    })
    return () => subscription.unsubscribe()
  }, [user?.id])
  return useMemo(() => {
    if (!user?.id || !token) return null
    return createMetaConsentController({
      releaseEnabled: true, privacyApproved: true, withdrawalReleased: true,
      supabaseClient: supabase, ownerId: user.id, accessToken: token,
      getSessionSnapshot: () => snapshot.current, stillPermitted: () => true,
      browser: window, dom: document,
      // CAPI still needs the receipt, which records the original browser.
      ...(isMetaPixelEnabled(import.meta.env) ? {} : { pixelLoader: async () => ({ status: 'pixel_off' }) }),
    })
  }, [user?.id, token])
}

// Offered once, in the session of a new account that arrived from an ad.
// Organic visitors, logins, Demo and QA never reach it.
export default function MetaConsentGate({ lang }: { lang: 'es' | 'en' }) {
  const { user } = useAuth()
  const controller = useMetaController()
  const eligible = useSyncExternalStore(subscribeMetaConsentEligibility, () => isMetaConsentEligible(user?.id))
  const [closed, setClosed] = useState(false)
  const [showPrivacy, setShowPrivacy] = useState(false)
  const synced = useRef<string | null>(null)

  // A browser signal is an opt-out for any account, with or without this screen.
  useEffect(() => {
    if (!controller || !user?.id || synced.current === user.id) return
    synced.current = user.id
    void controller.syncGpc()
  }, [controller, user?.id])

  if (!controller || !eligible || closed) return null
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="meta-consent-title"
      className="fixed inset-0 z-[9998] flex items-center justify-center overflow-y-auto bg-black/40 p-4">
      <MetaConsentChoice lang={lang} pixelEnabled={isMetaPixelEnabled(import.meta.env)} onGrant={controller.onGrant} onWithdraw={controller.onWithdraw}
        onContinue={() => setClosed(true)} onPrivacy={() => setShowPrivacy(true)}/>
      {showPrivacy && <LegalPreviewDialog kind="privacy" lang={lang} onClose={() => setShowPrivacy(false)}/>}
    </div>
  )
}

// Permanent way out, inside the privacy policy.
export function MetaPrivacyControl({ lang }: { lang: 'es' | 'en' }) {
  const controller = useMetaController()
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  if (!controller) return null
  const withdraw = async () => {
    setState('saving')
    setState(await controller.onWithdraw() ? 'saved' : 'error')
  }
  return (
    <div className="mt-4 rounded-2xl bg-white px-4 py-4">
      <p className="text-xs font-bold">{lang === 'es' ? 'Medición con Meta' : 'Measurement with Meta'}</p>
      <button type="button" onClick={() => void withdraw()} disabled={state === 'saving'}
        className="mt-2 min-h-11 text-sm font-semibold underline underline-offset-4 focus-visible:bg-[#E1E53F]">
        {lang === 'es' ? 'No compartir mi registro con Meta' : 'Do not share my registration with Meta'}
      </button>
      {state === 'saved' && <p role="status" className="mt-2 text-xs">
        {lang === 'es' ? 'Guardado. No se harán más envíos.' : 'Saved. No further transfers will be made.'}</p>}
      {state === 'error' && <p role="alert" className="mt-2 text-xs">
        {lang === 'es' ? 'No pudimos confirmarlo. Inténtalo de nuevo.' : 'We could not confirm this. Please try again.'}</p>}
    </div>
  )
}
