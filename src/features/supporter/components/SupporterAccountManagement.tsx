import { useEffect, useRef, useState } from 'react'
import { supabase } from '../../../services/supabaseClient'
import { getPublicSupabaseConfig } from '../../../lib/publicConfig'
import { SandboxCheckoutQaPanel } from './SandboxCheckoutQaPanel'
import { SupporterWallConsentSettings } from './SupporterWallConsentSettings'
import { SupporterSandboxBenefitsStatus } from './SupporterSandboxBenefitsStatus'

type Account = {
  intentId: string
  state: 'pending' | 'bound'
  canDownloadAcceptance: boolean
}
type AccountResult = {
  ok?: boolean
  code?: string
  accounts?: Account[]
  providerStatus?: string
  cancelled?: boolean
  paidThrough?: null
}
type Props = {lang: 'es' | 'en'; onClose: () => void}

const host = 'https://mrybvqdebbgcayuvgkkr.supabase.co'
const qaV2Screen = import.meta.env.VITE_PAZO_F16_SANDBOX_QA_UI === 'true'
const intentPattern = /^intent-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
export function SupporterAccountManagement({lang, onClose}: Props) {
  const [accounts, setAccounts] = useState<Account[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [showSandboxQa, setShowSandboxQa] = useState(false)
  const [error, setError] = useState(false)
  const [status, setStatus] = useState<Record<string, string>>({})
  const [cancelConfirm, setCancelConfirm] = useState<string | null>(null)
  const [cancelDone, setCancelDone] = useState<string | null>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const spanish = lang === 'es'
  const label = (es: string, en: string) => spanish ? es : en

  useEffect(() => {
    closeRef.current?.focus()
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) onClose()
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [busy, onClose])

  const call = async (body: Record<string, unknown>, download = false) => {
    const config = getPublicSupabaseConfig(import.meta.env)
    if (!config || config.url !== host) throw Error('configuration_missing')
    const { data: {session}, error: sessionError } = await supabase.auth.getSession()
    // getSession here is ONLY for obtaining bearer; backend verifies getUser().
    if (sessionError || !session?.access_token) throw Error('authentication_required')
    const response = await fetch(config.url + '/functions/v1/f16-paypal-supporter-account', {
      method: 'POST',
      headers: {
        authorization: 'Bearer ' + session.access_token,
        apikey: config.key,
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
      cache: 'no-store',
    })
    if (!response.ok) throw Error('server_confirmation_missing')
    if (download) return response
    const data = await response.json() as AccountResult
    if (!data || data.ok !== true || data.paidThrough !== null)
      throw Error('server_response_untrusted')
    return data
  }

  const refresh = async () => {
    setBusy(true)
    setError(false)
    try {
      const data = await call({ action: 'list' }) as AccountResult
      if (!Array.isArray(data.accounts) || data.accounts.length > 5 ||
        data.accounts.some(a => !intentPattern.test(a?.intentId || '') ||
          !['pending','bound'].includes(a.state) ||
          typeof a.canDownloadAcceptance !== 'boolean'))
        throw Error('account_list_invalid')
      setAccounts(data.accounts)
    } catch { setError(true); setAccounts(null) }
    finally { setBusy(false) }
  }
  useEffect(() => { void refresh() }, [])

  const checkStatus = async (intentId: string) => {
    setBusy(true)
    setError(false)
    try {
      const data = await call({action:'status',intentId}) as AccountResult
      if (typeof data.providerStatus !== 'string')
        throw Error('provider_status_missing')
      setStatus(current => ({...current,[intentId]:data.providerStatus!}))
      setCancelConfirm(null)
    } catch {setError(true)} finally {setBusy(false)}
  }

  const cancel = async (intentId: string) => {
    setBusy(true)
    setError(false)
    try {
      const data = await call({action:'cancel',intentId,confirmCancellation:true}) as AccountResult
      if (data.code !== 'future_renewals_cancelled' || data.cancelled !== true)
        throw Error('paypal_cancellation_unconfirmed')
      setCancelDone(intentId)
      setCancelConfirm(null)
      setStatus(current=>({...current,[intentId]:'CANCELLED'}))
    } catch {setError(true)} finally {setBusy(false)}
  }

  const download = async (intentId: string) => {
    setBusy(true)
    setError(false)
    try {
      const response = await call({action:'acknowledgement',intentId},true) as Response
      if (!response.headers.get('content-type')?.startsWith('text/plain'))
        throw Error('unexpected_acknowledgement_type')
      const content = await response.text()
      if (content.length < 100 || content.length > 16000)
        throw Error('acknowledgement_untrusted')
      const href = URL.createObjectURL(new Blob([content],{type:'text/plain;charset=utf-8'}))
      const link = document.createElement('a')
      link.href = href
      link.download = 'pazo-accepted-terms.txt'
      document.body.appendChild(link)
      link.click()
      // Revoking synchronously can abort a download in some browsers.
      setTimeout(() => {
        link.remove()
        URL.revokeObjectURL(href)
      }, 1500)
    } catch {setError(true)} finally {setBusy(false)}
  }

  const control = 'min-h-11 rounded-full bg-[#E1E53F]/50 px-4 py-2.5 text-[13px] font-bold text-[#204E4A] transition-colors hover:bg-[#E1E53F] focus-visible:bg-[#E1E53F] disabled:opacity-50'
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="supporter-account-title"
      className="fixed inset-0 z-[115] overflow-y-auto bg-[#FAF8F5] text-[#204E4A]">
      <div className="sticky top-0 z-10 bg-[#FAF8F5]/95 px-4 py-4 backdrop-blur-xl">
        <div className="mx-auto flex max-w-xl items-center justify-between gap-3">
          <div>
            <h2 id="supporter-account-title" className="text-xl font-black">
              {qaV2Screen?label('Amigo de PAZO · Sandbox','Friend of PAZO · Sandbox'):label('Gestionar Amigo de PAZO','Manage Friend of PAZO')}
            </h2>
            <p className="text-sm text-[#5C7470]">{qaV2Screen?label('Pruebas con saldo ficticio de PayPal','PayPal test-money only'):label('Solo gestión de cuentas · No hay compras disponibles','Account management only · Purchases unavailable')}</p>
          </div>
          <button ref={closeRef} type="button" onClick={onClose} disabled={busy}
            className={control}>{label('Cerrar','Close')}</button>
        </div>
      </div>
      <div className="mx-auto max-w-xl space-y-4 px-4 py-5">
        <p className="text-sm text-[#5C7470]">
          {label('PAZO continúa siendo gratis. El estado de PayPal no confirma un período pagado ni concede beneficios.',
            'PAZO remains free. PayPal status does not establish a paid period or grant benefits.')}
        </p>
        {import.meta.env.VITE_PAZO_F16_SANDBOX_QA_UI === 'true' && (
          <div className="space-y-3">
            <button type="button" onClick={()=>setShowSandboxQa(v=>!v)}
              className={control}>
              {label(showSandboxQa?'Cerrar prueba Sandbox':'Abrir prueba Sandbox',
                showSandboxQa?'Close Sandbox test':'Open Sandbox test')}
            </button>
            {showSandboxQa && <SandboxCheckoutQaPanel lang={lang}/>}
          </div>
        )}
        {import.meta.env.VITE_PAZO_F16_SANDBOX_QA_UI === 'true' &&
          import.meta.env.VITE_PAZO_F16_SUPPORTER_BENEFITS_ENABLED === 'true' && (
            <SupporterSandboxBenefitsStatus lang={lang} />
          )}
        {error && (
          <div role="alert" className="rounded-3xl bg-[#FCE5D8] p-4 text-sm">
            {label('No pudimos confirmar la operación en el servidor. No se ha mostrado ningún cambio como completado.',
              'The server could not confirm this action. No change is shown as completed.')}
            <button type="button" onClick={()=>void refresh()} disabled={busy}
              className={'ml-2 '+control}>{label('Reintentar','Retry')}</button>
          </div>
        )}
        {accounts === null && !error && <p role="status">{label('Consultando…','Checking…')}</p>}
        {accounts?.length === 0 && (
          <p className="rounded-3xl bg-white p-5 text-sm shadow-sm">
            {label('Esta cuenta no tiene una suscripción Amigo de PAZO registrada. No necesitas suscribirte para seguir usando PAZO.',
              'This account has no recorded Friend of PAZO subscription. PAZO remains free.')}
          </p>
        )}
        {import.meta.env.VITE_PAZO_F16_SUPPORTER_BENEFITS_ENABLED === 'true' && (
          <SupporterWallConsentSettings lang={lang} />
        )}
        {!qaV2Screen && accounts?.map(account=>(
          <div key={account.intentId} className="space-y-3 rounded-3xl bg-white p-5 shadow-sm">
            <h3 className="text-base font-extrabold">
              {label('Suscripción de apoyo','Support subscription')}
            </h3>
            <p className="text-sm text-[#5C7470]">
              {account.state === 'bound'
                ? label('Vinculada a PayPal (pago no verificado)','Linked to PayPal (payment unverified)')
                : label('Solicitud pendiente de revisión','Pending review')}
            </p>
            {status[account.intentId] && (
              <p role="status" className="text-sm">
                {label('Estado informado por PayPal: ','PayPal-reported status: ')}
                <strong>{status[account.intentId]}</strong>
              </p>
            )}
            {cancelDone === account.intentId && <p role="status" className="text-sm font-bold text-[#204E4A]">
              {label('PayPal confirmó la cancelación de futuras renovaciones.','PayPal confirmed future renewals are cancelled.')}
            </p>}
            <div className="flex flex-wrap gap-2">
              {account.state === 'bound' && (
                <button type="button" disabled={busy} onClick={()=>void checkStatus(account.intentId)}
                  className={control}>{label('Consultar estado','Check status')}</button>
              )}
              {account.canDownloadAcceptance && (
                <button type="button" disabled={busy} onClick={()=>void download(account.intentId)}
                  className={control}>{label('Descargar aceptación','Download acceptance')}</button>
              )}
              {account.state === 'bound' && status[account.intentId] !== 'CANCELLED' &&
                cancelDone !== account.intentId && (
                  <button type="button" disabled={busy}
                    onClick={()=>setCancelConfirm(account.intentId)} className={control}>
                    {label('Cancelar renovación','Cancel renewal')}
                  </button>
                )}
            </div>
            {cancelConfirm === account.intentId && (
              <div className="space-y-2 rounded-3xl bg-[#FCE5D8] p-4">
                <p className="text-sm">{label('¿Confirmas que deseas detener las futuras renovaciones de esta suscripción?',
                  'Confirm that you want to stop future renewals of this subscription?')}</p>
                <div className="flex flex-wrap gap-2">
                  <button type="button" disabled={busy} className={control}
                    onClick={()=>void cancel(account.intentId)}>{label('Sí, cancelar renovación','Yes, cancel renewal')}</button>
                  <button type="button" disabled={busy} className={control}
                    onClick={()=>setCancelConfirm(null)}>{label('Mantener','Keep renewal')}</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
