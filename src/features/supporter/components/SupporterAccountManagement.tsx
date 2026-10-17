import { useEffect, useRef, useState } from 'react'
import { supabase } from '../../../services/supabaseClient'
import { getPublicSupabaseConfig } from '../../../lib/publicConfig'
import { SandboxCheckoutQaPanel } from './SandboxCheckoutQaPanel'
import { SandboxV2AccountPanel } from './SandboxV2AccountPanel'
import { SupporterWallConsentSettings } from './SupporterWallConsentSettings'
import { SupporterSandboxBenefitsStatus } from './SupporterSandboxBenefitsStatus'
import { SupporterBenefitsHome } from './SupporterBenefitsHome'
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
  const [showSandboxQa, setShowSandboxQa] = useState(false)
  const [error, setError] = useState(false)
  const [status, setStatus] = useState<Record<string, string>>({})
  const [cancelConfirm, setCancelConfirm] = useState<string | null>(null)
  const [cancelDone, setCancelDone] = useState<string | null>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const {status: membership, refresh: refreshMembership} = useSupporterMembershipStatus(pet?.id)
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
  const primary = 'min-h-12 rounded-full bg-[#204E4A] px-6 py-3 text-sm font-extrabold text-white transition-colors hover:bg-[#32635D] focus-visible:bg-[#32635D] disabled:opacity-50'
  const benefits = [
    [label('Una insignia especial', 'A special badge'), label('En el perfil y junto a tus publicaciones.', 'On your pet profile and feed posts.')],
    [label('Cinco fondos para tu mascota', 'Five pet backgrounds'), label('Personaliza su perfil con estilos únicos.', 'Personalize their profile with unique styles.')],
    [label('Un lugar en nuestro muro', 'A place on our thank-you wall'), label('Solo para las mascotas que tú autorices.', 'Only for pets you explicitly choose.')],
    [label('Reconocimiento a tu constancia', 'A thank-you for continued support'), label('Insignias conmemorativas a los 3, 6 y 12 meses pagados.', 'Milestone badges after 3, 6 and 12 completed paid months.')],
  ]
  if (membership.kind === 'verified') {
    return <SupporterBenefitsHome lang={lang} onClose={onClose} pet={pet}
      milestone={membership.milestone} qa={qaV2Screen}/>
  }
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="supporter-account-title"
      className="fixed inset-0 z-[115] overflow-y-auto bg-[#FAF8F5] text-[#204E4A]">
      <div className="sticky top-0 z-20 bg-[#FAF8F5]/95 px-4 py-3 backdrop-blur-xl">
        <div className="mx-auto flex max-w-xl items-center justify-between gap-3">
          <div>
            <h2 id="supporter-account-title" className="text-xl font-black">
              {label('Amigo de PAZO','Friend of PAZO')}
            </h2>
            {qaV2Screen && <p className="text-[11px] font-bold text-[#5C7470]">
              {label('Entorno de prueba · PayPal Sandbox', 'Test environment · PayPal Sandbox')}
            </p>}
          </div>
          <button ref={closeRef} type="button" onClick={onClose} disabled={busy}
            className={control}>{label('Volver a PAZO','Back to PAZO')}</button>
        </div>
      </div>

      <main className="mx-auto max-w-xl space-y-5 px-4 pb-12 pt-4">
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
        <section aria-labelledby="supporter-offer-title"
          className="relative overflow-hidden rounded-[32px] bg-[#E6EDDB] px-5 pb-6 pt-7 sm:px-7">
          <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-[#E1E53F]/35 blur-3xl"/>
          <div className="relative">
            <p className="text-xs font-extrabold uppercase tracking-widest text-[#52716A]">
              {label('Gracias por ser parte de PAZO', 'Thank you for being part of PAZO')}
            </p>
            <h3 id="supporter-offer-title" className="mt-3 max-w-[18ch] text-[clamp(27px,7vw,38px)] font-black leading-tight tracking-tight">
              {label('Ayúdanos a mantener vivo este pequeño mundo', 'Help keep this little world going')}
            </h3>
            <p className="mt-3 max-w-[48ch] text-sm leading-relaxed text-[#476862]">
              {label('PAZO es gratis y seguirá ofreciendo sus herramientas principales sin membresía. Tu apoyo voluntario nos ayuda a mantenerlo y mejorarlo.',
                'PAZO is free, and its core tools will remain available without a membership. Your voluntary support helps us maintain and improve it.')}
            </p>
            <div className="mt-5 flex flex-wrap items-baseline gap-x-2">
              <strong className="text-4xl font-black tabular-nums">US$2.99</strong>
              <span className="text-sm font-bold text-[#476862]">{label('al mes','per month')}</span>
            </div>
            <p className="mt-1 text-xs font-medium text-[#52716A]">
              {label('Suscripción voluntaria · Renovación mensual · Puedes cancelar las próximas renovaciones.',
                'Voluntary subscription · Monthly renewal · You can cancel future renewals.')}
            </p>
          </div>
        </section>

        <section aria-labelledby="supporter-benefits-title" className="space-y-3">
          <h3 id="supporter-benefits-title" className="px-1 text-lg font-black">
            {label('Un gracias especial por tu apoyo', 'A special thank-you for your support')}
          </h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {benefits.map(([name, description], index) => (
              <div key={name} className="flex gap-3 rounded-[24px] bg-white p-4 shadow-[0_4px_16px_rgba(32,78,74,0.04)]">
                <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#E1E53F]/35 font-black text-[#204E4A]">
                  {index + 1}
                </span>
                <div>
                  <h4 className="text-sm font-extrabold">{name}</h4>
                  <p className="mt-1 text-[12px] leading-relaxed text-[#5C7470]">{description}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="px-1 text-xs leading-relaxed text-[#5C7470]">
            {label('Las recompensas se habilitan únicamente cuando PAZO verifica el período pagado. Nunca por solo regresar de PayPal.',
              'Rewards become available only after PAZO verifies the paid period, never just because you returned from PayPal.')}
          </p>
        </section>

        <section aria-label={label('Elegir cómo continuar', 'Choose how to continue')}
          className="space-y-3 rounded-[28px] bg-white p-5 shadow-[0_4px_20px_rgba(32,78,74,0.04)]">
          {qaV2Screen ? (
            <>
              <p className="text-xs font-bold text-[#476862]">
                {label('Modo de prueba: PayPal Sandbox utiliza dinero ficticio. No estás haciendo un pago real.',
                  'Test mode: PayPal Sandbox uses test money. You are not making a real payment.')}
              </p>
              {!showSandboxQa && <button type="button" className={primary}
                onClick={() => setShowSandboxQa(true)}>
                {label('Apoyar a PAZO · Prueba Sandbox', 'Support PAZO · Sandbox test')}
              </button>}
              {showSandboxQa && <SandboxCheckoutQaPanel lang={lang}/>}
            </>
          ) : (
            <p role="status" className="rounded-2xl bg-[#F0F3ED] px-4 py-3 text-sm font-semibold text-[#476862]">
              {label('Las suscripciones todavía no están disponibles. Puedes seguir disfrutando de PAZO gratis.',
                'Subscriptions are not available yet. You can keep enjoying PAZO for free.')}
            </p>
          )}
          <button type="button" onClick={onClose} className="min-h-11 w-full rounded-full bg-[#F0F3ED] px-4 py-3 text-sm font-bold text-[#204E4A] hover:bg-[#E1E53F]/35 focus-visible:bg-[#E1E53F]/45">
            {label('Ahora no, seguir usando PAZO', 'Not now, keep using PAZO')}
          </button>
        </section>

        </>}
        {(qaV2Screen || accounts === null || (accounts?.length ?? 0)>0) && <section aria-labelledby="supporter-manage-title" className="space-y-3">
          {qaV2Screen && <p className="rounded-2xl bg-[#F0F3ED] p-3 text-xs font-bold text-[#476862]">
            {label('Solo entorno de pruebas: consulta de solicitudes y cancelación V2.', 'Test environment only: V2 requests and cancellation.')}
          </p>}
          <h3 id="supporter-manage-title" className="px-1 text-lg font-black">
            {label('Mi membresía', 'My membership')}
          </h3>
          {qaV2Screen ? (
            <SandboxV2AccountPanel lang={lang}/>
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
  )
}
