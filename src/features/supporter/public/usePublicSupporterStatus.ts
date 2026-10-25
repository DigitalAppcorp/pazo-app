import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../../services/supabaseClient'
import { useAuth } from '../../../context/AuthContext'
export type PublicSupporterStatus = {
  source: 'public_supporter_v1'
  paid: boolean
  pending: boolean
  eligible: boolean
  checkoutReady: boolean
  feedback: 'ok' | 'issue' | 'skipped' | null
}
export function usePublicSupporterStatus(enabled = true) {
  const { user } = useAuth()
  const owner = enabled ? user?.id : null
  const [revision, setRevision] = useState(0)
  const [result, setResult] = useState<{
    owner: string
    value: PublicSupporterStatus | null
  } | null>(null)
  const refresh = useCallback(() => setRevision((n) => n + 1), [])
  useEffect(() => {
    if (!owner) return
    let active = true
    const read = async () => {
      try {
        const { data, error } = await supabase.rpc('pazo_supporter_status')
        const valid =
          !error &&
          data?.source === 'public_supporter_v1' &&
          ['paid', 'pending', 'eligible', 'checkoutReady'].every(
            (k) => typeof data[k] === 'boolean',
          ) &&
          [null, 'ok', 'issue', 'skipped'].includes(data.feedback)
        if (active) setResult({ owner, value: valid ? data : null })
      } catch {
        if (active) setResult({ owner, value: null })
      }
    }
    void read()
    const visible = () => {
      if (document.visibilityState === 'visible') void read()
    }
    window.addEventListener('online', visible)
    window.addEventListener('focus', visible)
    return () => {
      active = false
      window.removeEventListener('online', visible)
      window.removeEventListener('focus', visible)
    }
  }, [owner, revision])
  return {
    value: result && result.owner === owner ? result.value : null,
    refresh,
  }
}
