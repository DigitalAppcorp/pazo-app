import { useEffect, useRef } from 'react'
import { supabase } from '../../services/supabaseClient'
import { browserAnalyticsAllowed } from '../marketing/analyticsPreference'
import { isPazoStandalone } from './installPromptBridge'

export function useDetectedInstallation(ownerId?: string) {
  const recorded = useRef<string | null>(null)
  useEffect(() => {
    if (!ownerId) { recorded.current = null; return }
    let active = true
    let pending = false
    let observed = isPazoStandalone()
    const record = async () => {
      if (!active || pending || !observed || recorded.current === ownerId || !browserAnalyticsAllowed()) return
      pending = true
      try {
        const { data, error } = await supabase.rpc('pazo_record_pwa_installation', { p_expected_owner: ownerId })
        if (active && !error && data === true) recorded.current = ownerId
      } catch { /* An unavailable measurement must not affect app use. */ }
      finally { pending = false }
    }
    const installed = () => { observed = true; void record() }
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return
      observed ||= isPazoStandalone()
      void record()
    }
    window.addEventListener('appinstalled', installed)
    document.addEventListener('visibilitychange', onVisible)
    // Let a discarded render clean up before it can issue a request.
    queueMicrotask(() => { void record() })
    return () => {
      active = false
      window.removeEventListener('appinstalled', installed)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [ownerId])
}
