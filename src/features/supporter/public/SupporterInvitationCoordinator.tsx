import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../../../services/supabaseClient'
import { useAuth } from '../../../context/AuthContext'
import { SupporterInvitationPrompt } from '../components/SupporterInvitationPrompt'
import { SUPPORTER_ACCOUNT_HASH } from '../supporterAccountRoute.mjs'
export function SupporterInvitationCoordinator({
  safe,
  lang,
}: {
  safe: boolean
  lang: 'es' | 'en'
}) {
  const { user } = useAuth()
  const owner = user?.id
  const [invitation, setInvitation] = useState<{
    owner: string
    token: string
  } | null>(null)
  const [revision, setRevision] = useState(0)
  const attempted = useRef<string | null>(null)
  const [saveFailed, setSaveFailed] = useState(false)
  useEffect(() => {
    if (!owner) return
    void supabase.rpc('pazo_supporter_visit').then(() => {})
    const focus = () => {
      if (document.visibilityState === 'visible') setRevision((n) => n + 1)
    }
    document.addEventListener('visibilitychange', focus)
    return () => document.removeEventListener('visibilitychange', focus)
  }, [owner])
  useEffect(() => {
    if (!safe || !owner || attempted.current === owner) return
    let active = true
    const timer = setTimeout(() => {
      if (
        document.visibilityState !== 'visible' ||
        document.querySelector(
          '[role="dialog"],form,[data-pazo-critical-task]',
        ) ||
        document.activeElement?.matches(
          'input,textarea,select,[contenteditable="true"]',
        )
      )
        return
      void (async () => {
        try {
          const r = await supabase.rpc('pazo_supporter_promotion', {
            p_action: 'claim',
          })
          if (
            active &&
            !r.error &&
            r.data?.source === 'supporter_promotion_v1' &&
            r.data.show === true &&
            /^[a-f0-9-]{36}$/i.test(r.data.token)
          ) {
            // A recoverable reservation is not a display. Commit one permit
            // immediately before mounting; SQL rejects expired/stale devices.
            const display = await supabase.rpc('pazo_supporter_promotion', {
              p_action: 'display', p_token: r.data.token,
            })
            if(active && !display.error && display.data?.show===true && display.data.token===r.data.token){
              attempted.current = owner
              setInvitation({ owner, token: r.data.token })
            }
          }
        } catch {
          /* Fail closed. No checkout or user task is blocked. */
        }
      })()
    }, 2500)
    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [safe, owner, revision])
  useEffect(() => {
    if (!safe) setInvitation(null)
  }, [safe])
  const current = invitation?.owner === owner ? invitation : null
  const record = useCallback(
    async (action: string) => {
      if (!current) return false
      try {
        const r = await supabase.rpc('pazo_supporter_promotion', {
          p_action: action,
          p_token: current.token,
        })
        return !r.error
      } catch {
        return false
      }
    },
    [current],
  )
  const dismiss = useCallback(() => {
    void record('later')
    setInvitation(null)
  }, [record])
  const close = useCallback(() => {
    void record('close')
    setInvitation(null)
  }, [record])
  const shown = useCallback(() => {
    void record('shown')
  }, [record])
  if (!current || !safe) return null
  return (
    <SupporterInvitationPrompt
      lang={lang}
      onShown={shown}
      onDismiss={dismiss}
      onClose={close}
      saveFailed={saveFailed}
      onExplore={() => {
        void record('explore')
        setInvitation(null)
        window.location.hash = SUPPORTER_ACCOUNT_HASH + '?from=invitation'
      }}
      onOptOut={() => {
        void record('opt_out').then((ok) => {
          setSaveFailed(!ok)
          if (ok) setInvitation(null)
        })
      }}
    />
  )
}
