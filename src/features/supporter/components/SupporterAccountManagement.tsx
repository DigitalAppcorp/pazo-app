import { useEffect, useRef, useState } from 'react'
import { supabase } from '../../../services/supabaseClient'
import { getPublicSupabaseConfig } from '../../../lib/publicConfig'
import { SandboxCheckoutQaPanel } from './SandboxCheckoutQaPanel'
import { SandboxV2AccountPanel } from './SandboxV2AccountPanel'
import { SupporterWallConsentSettings } from './SupporterWallConsentSettings'
import { SupporterSandboxBenefitsStatus } from './SupporterSandboxBenefitsStatus'
import { SupporterBenefitsHome } from './SupporterBenefitsHome'
import { SupporterOfferB } from './SupporterOfferB'
import { SupporterScreenPortal } from './SupporterScreenPortal'
import { useSupporterMembershipStatus } from '../useSupporterMembershipStatus'
import type { Pet } from '../../../types/pazo'

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
type Props = {lang: 'es' | 'en'; onClose: () => void; pet?: Pet}

const host = 'https://mrybvqdebbgcayuvgkkr.supabase.co'
const qaV2Screen = import.meta.env.VITE_PAZO_F16_SANDBOX_QA_UI === 'true'
const intentPattern = /^intent-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
export function SupporterAccountManagement({lang, onClose, pet}: Props) {
  const [accounts, setAccounts] = useState<Account[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)
  const [status, setStatus] = useState<Record<string, string>>({})
  const [cancelConfirm, setCancelConfirm] = useState<string | null>(null)
  const [cancelDone, setCancelDone] = useState<string | null>(null)
  // An authenticated, already-bound V2 attempt must be managed, never offered a new request key.
  const [qaV2AccountState,setQaV2AccountState] = useState<'checking'|'none'|'pending'|'bound'|'unavailable'>('checking')
  const [qaManagementOpen,setQaManagementOpen] = useState(!qaV2Screen)
  const closeRef = useRef<HTMLButtonElement>(null)
  const {status: membership, refresh: refreshMembership} = useSupporterMembershipStatus()
  const spanish = lang === 'es'
  const label = (es: string, en: string) => spanish ? es : en

  useEffect(() => {
    // Member home owns its own close/keyboard handling.
    if (membership.kind === 'verified') return
    closeRef.current?.focus()
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) onClose()
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [busy, onClose, membership.kind])

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
  useEffect(() => { if (!qaV2Screen) void refresh() }, [])

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

  const control = 'min-h-11 rounded-full bg-[#E1E53F]/50 px-4 py-2.5 text-[13px] font-bold text-[#204E4A] transition-colors hover:bg-[#E1E53F] focus-visible:bg-[#E1E53F]/55 disabled:opacity-50'
  if (membership.kind === 'verified') {
    return <SupporterBenefitsHome lang={lang} onClose={onClose} pet={pet}
      milestone={membership.milestone} qa={qaV2Screen}/>
  }
  return (
    <SupporterScreenPortal>
    <div role="dialog" aria-modal="true" aria-labelledby="supporter-account-title"
      className="h-full w-full min-h-0 overflow-y-auto overscroll-contain bg-[#FAF8F5] text-[#204E4A]">
      <header className="sticky top-0 z-20 bg-[#FAF8F5]/95 px-4 py-2 backdrop-blur-xl">
        <div className="mx-auto grid min-h-11 max-w-xl grid-cols-[44px_minmax(0,1fr)_44px] items-center gap-2">
          <button ref={closeRef} type="button" onClick={onClose} disabled={busy}
            aria-label={label('Volver a PAZO','Back to PAZO')}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-[#204E4A] shadow-[0_3px_12px_rgba(32,78,74,0.06)] hover:bg-[#E7EDDC] focus-visible:bg-[#E1E53F]/50">
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m14 5-7 7 7 7M8 12h12"/>
            </svg>
          </button>
          <h2 id="supporter-account-title" className="min-w-0 text-center text-[13px] font-extrabold text-[#204E4A]">
            {label('Amigo de PAZO','Friend of PAZO')}
          </h2>
          <span aria-hidden="true" className="h-11 w-11"/>
        </div>
      </header>

      <main className="mx-auto w-full min-w-0 max-w-xl space-y-2.5 px-4 pb-7 pt-1">
        {membership.kind === 'checking' && <p role="status" className="rounded-3xl bg-white p-5 text-sm font-semibold">
          {label('Comprobando tu membresía…','Checking your membership…')}
        </p>}
        {membership.kind === 'unavailable' && <div role="alert" className="space-y-3 rounded-3xl bg-[#FCE5D8] p-5 text-sm">
          <p>{label('No pudimos verificar tu membresía. Por seguridad no te mostraremos una invitación a pagar hasta comprobar el estado.',
            'We could not verify your membership. For safety, the payment invitation is hidden until status is confirmed.')}</p>
          <button type="button" className={control} onClick={refreshMembership}>
            {label('Intentar de nuevo','Try again')}
          </button>
        </div>}
        {membership.kind === 'inactive' && <>
          <SupporterOfferB lang={lang}>
            {qaV2Screen ? (
              qaV2AccountState==='none'
                ? <SandboxCheckoutQaPanel lang={lang} inline/>
                : <div role="status" className="space-y-3 rounded-[18px] bg-[#EFF3E7] px-4 py-3 text-[12px] leading-relaxed text-[#204E4A]">
                    <p>{qaV2AccountState==='bound'
                      ? label('Ya existe una suscripción Sandbox vinculada a esta cuenta. PAZO no puede crear otra. Consulta su estado y, si falta la aprobación, recuperaremos el enlace de la operación existente.',
                        'A Sandbox subscription is already linked to this account. PAZO cannot create another. Check its status; if approval is still needed, the original approval link must be recovered.')
                      : qaV2AccountState==='pending'
                        ? label('Ya existe una solicitud de suscripción Sandbox pendiente. No se iniciará una segunda.',
                          'A Sandbox subscription request is pending. A second one will not be started.')
                        : qaV2AccountState==='unavailable'
                          ? label('No se pudo comprobar si ya tienes una suscripción Sandbox. El pago permanece bloqueado hasta verificarlo.',
                            'Could not verify whether you already have a Sandbox subscription. Checkout remains blocked until it is verified.')
                          : label('Comprobando si ya existe una suscripción Sandbox para evitar cobros duplicados…',
                            'Checking for an existing Sandbox subscription to prevent duplicate payments…')}</p>
                    <button type="button" onClick={()=>setQaManagementOpen(true)}
                      disabled={qaV2AccountState==='checking'}
                      className="min-h-11 w-full rounded-full bg-white px-4 py-2 text-[12px] font-extrabold text-[#204E4A] hover:bg-[#E6EDD9] focus-visible:bg-[#E1E53F]/35 disabled:opacity-50">
                      {label('Consultar mi suscripción Sandbox','Review my Sandbox subscription')}
                    </button>
                  </div>
            ) : (
              <div className="space-y-2">
                <button type="button" disabled
                  className="min-h-12 w-full cursor-not-allowed rounded-full bg-[#E1E53F]/45 px-5 py-3 text-[14px] font-extrabold text-[#6D8780]">
                  {label('Continuar con PayPal','Continue with PayPal')}
                </button>
                <p role="status" className="text-center text-[12px] leading-relaxed text-[#5C7470]">
                  {label('Las suscripciones todavía no están disponibles. Puedes seguir disfrutando de PAZO gratis.',
                    'Subscriptions are not available yet. You can keep enjoying PAZO for free.')}
                </p>
              </div>
            )}
            <p className="px-1 text-center text-[10px] leading-relaxed text-[#5C7470]">
              {label('PAZO seguirá siendo gratis para todos.','PAZO will remain free for everyone.')}
            </p>
            <button type="button" onClick={onClose}
              className="min-h-9 w-full rounded-full px-4 py-2 text-center text-[12px] font-bold text-[#204E4A] underline decoration-[#A6BBB1] underline-offset-4 hover:bg-[#E9EEDC] focus-visible:bg-[#E1E53F]/30">
              {label('Ahora no, seguir usando PAZO','Not now, keep using PAZO')}
            </button>
          </SupporterOfferB>
        </>}
        {(qaV2Screen || error || accounts === null || (accounts?.length ?? 0)>0) &&
          <section aria-labelledby="supporter-manage-title" className="space-y-3">
          <details open={qaManagementOpen} onToggle={e=>setQaManagementOpen(e.currentTarget.open)}
            className="rounded-[24px] bg-white p-4 shadow-[0_4px_16px_rgba(32,78,74,0.04)]">
            <summary className="min-h-11 cursor-pointer py-2 text-sm font-extrabold focus-visible:bg-[#E1E53F]/30">
              {qaV2Screen
                ? label('Gestionar mi prueba de PayPal Sandbox', 'Manage my PayPal Sandbox test')
                : label('Administrar mi suscripción', 'Manage my subscription')}
            </summary>
          <h3 id="supporter-manage-title" className="px-1 text-lg font-black">
            {label('Mi membresía', 'My membership')}
          </h3>
          {qaV2Screen ? (
            <SandboxV2AccountPanel lang={lang} onAccountInspection={setQaV2AccountState}/>
          ) : (
            <>
              {error && <div role="alert" className="rounded-3xl bg-[#FCE5D8] p-4 text-sm">
                {label('No pudimos consultar tu suscripción. No mostraremos ningún cambio como completado.',
                  'Could not check your subscription. No change will be shown as completed.')}
                <button type="button" onClick={() => void refresh()} disabled={busy}
                  className={control}>{label('Reintentar', 'Retry')}</button>
              </div>}
              {accounts === null && !error && <p role="status">{label('Consultando…','Checking…')}</p>}
              {accounts?.length === 0 && <p className="rounded-3xl bg-white p-5 text-sm">
                {label('No tienes una suscripción registrada. PAZO sigue siendo gratis.',
                  'You have no recorded subscription. PAZO remains free.')}
              </p>}
              {accounts?.map(account => (
                <div key={account.intentId} className="space-y-3 rounded-3xl bg-white p-5 shadow-sm">
                  <h4 className="text-base font-extrabold">{label('Suscripción de apoyo','Support subscription')}</h4>
                  <p className="text-sm text-[#5C7470]">
                    {account.state === 'bound'
                      ? label('Vinculada a PayPal; período pagado no verificado.', 'Linked to PayPal; paid period unverified.')
                      : label('Solicitud pendiente de revisión', 'Pending review')}
                  </p>
                  {status[account.intentId] && <p role="status" className="text-sm">
                    {label('Estado informado por PayPal: ','PayPal-reported status: ')}
                    <strong>{status[account.intentId]}</strong>
                  </p>}
                  {cancelDone === account.intentId && <p role="status" className="text-sm font-bold">
                    {label('Cancelada la próxima renovación.','Future renewals cancelled.')}
                  </p>}
                  <div className="flex flex-wrap gap-2">
                    {account.state === 'bound' && <button type="button" disabled={busy}
                      onClick={() => void checkStatus(account.intentId)} className={control}>
                      {label('Actualizar estado','Refresh status')}</button>}
                    {account.canDownloadAcceptance && <button type="button" disabled={busy}
                      onClick={() => void download(account.intentId)} className={control}>
                      {label('Descargar condiciones aceptadas','Download accepted terms')}</button>}
                    {account.state === 'bound' && status[account.intentId] !== 'CANCELLED' &&
                      cancelDone !== account.intentId && <button type="button" disabled={busy}
                        onClick={() => setCancelConfirm(account.intentId)} className={control}>
                        {label('Cancelar renovación','Cancel renewal')}</button>}
                  </div>
                  {cancelConfirm === account.intentId && <div className="space-y-3 rounded-2xl bg-[#FCE5D8] p-4">
                    <p className="text-sm">{label('¿Quieres detener los próximos cobros de esta suscripción?',
                      'Stop future charges for this subscription?')}</p>
                    <button type="button" disabled={busy} className={control}
                      onClick={() => void cancel(account.intentId)}>
                      {label('Sí, cancelar renovación','Yes, cancel renewal')}</button>
                    <button type="button" disabled={busy} className={control}
                      onClick={() => setCancelConfirm(null)}>{label('Mantener suscripción','Keep subscription')}</button>
                  </div>}
                </div>
              ))}
            </>
          )}
          </details>
        </section>}

        {membership.kind === 'unavailable' && import.meta.env.VITE_PAZO_F16_SUPPORTER_BENEFITS_ENABLED === 'true' && (
          <section aria-labelledby="supporter-rewards-title" className="space-y-3">
            <h3 id="supporter-rewards-title" className="px-1 text-lg font-black">
              {label('Mis recompensas', 'My rewards')}
            </h3>
            <p className="px-1 text-xs text-[#5C7470]">
              {label('Tu mascota solo recibirá beneficios con cobertura verificada. Puedes retirar su permiso del muro en cualquier momento.',
                'Your pet receives rewards only with verified coverage. You can withdraw wall permission any time.')}
            </p>
            <SupporterWallConsentSettings lang={lang}/>
            {qaV2Screen && <details className="rounded-3xl bg-[#F0F3ED] p-4">
              <summary className="min-h-11 cursor-pointer py-2 text-sm font-extrabold focus-visible:bg-[#E1E53F]/40">
                {label('Detalles de verificación · Solo pruebas','Verification details · Tests only')}
              </summary>
              <SupporterSandboxBenefitsStatus lang={lang}/>
            </details>}
          </section>
        )}
      </main>
    </div>
    </SupporterScreenPortal>
  )
}
