import {exitSupporterScreen} from './supporterExit'
import {usePublicSupporterStatus} from '../public/usePublicSupporterStatus'
import {SupporterBenefitReview} from '../public/SupporterBenefitReview'
import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../../../services/supabaseClient'
import { getPublicSupabaseConfig } from '../../../lib/publicConfig'
import { SandboxCheckoutQaPanel } from './SandboxCheckoutQaPanel'
import { SandboxV2AccountPanel } from './SandboxV2AccountPanel'
import { SupporterWallConsentSettings } from './SupporterWallConsentSettings'
import { SupporterSandboxBenefitsStatus } from './SupporterSandboxBenefitsStatus'
import { SupporterApprovedBenefits } from './SupporterApprovedBenefits'
import { SupporterApprovedOffer } from './SupporterApprovedOffer'
import { SupporterLiveCheckoutPanel } from './SupporterLiveCheckoutPanel'
import { SupporterScreenPortal } from './SupporterScreenPortal'
import { supporterPaypalReturnKind,supporterEntrySource } from '../supporterAccountRoute.mjs'
import { SupporterPreparingScreen } from './SupporterPreparingScreen'
import { useSupporterMembershipStatus } from '../useSupporterMembershipStatus'
import {supporterBenefitsUiEnabled} from '../supporterUiRelease'
import type { Pet } from '../../../types/pazo'

type Account = {
  intentId: string
  state: 'pending' | 'bound'
  canDownloadAcceptance: boolean
  needsReconciliation?: boolean
  cancelInReview?: boolean
  cancelConfirmed?: boolean
}
type AccountResult = {
  ok?: boolean
  code?: string
  accounts?: Account[]
  acceptances?: {intentId:string;acceptedAt:string}[]
  providerStatus?: string
  cancelled?: boolean
  approvalUrl?: string
  paidThrough?: null
}
type Props = {lang: 'es' | 'en'; onClose: () => void; pet?: Pet}

const host = 'https://mrybvqdebbgcayuvgkkr.supabase.co'
const qaV2Screen = import.meta.env.DEV &&
  import.meta.env.VITE_PAZO_F16_SANDBOX_QA_UI === 'true' &&
  typeof window !== 'undefined' && ['localhost','127.0.0.1'].includes(window.location.hostname)
const intentPattern = /^intent-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
export function SupporterAccountManagement({lang, onClose, pet}: Props) {
  const [accounts, setAccounts] = useState<Account[] | null>(null)
  const [acceptances,setAcceptances]=useState<{intentId:string;acceptedAt:string}[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)
  // Status read errors must not erase a separately verified owner account list.
  const [statusReadError,setStatusReadError]=useState<string|null>(null)
  const [status, setStatus] = useState<Record<string, string>>({})
  const [cancelConfirm, setCancelConfirm] = useState<string | null>(null)
  const [cancelDone, setCancelDone] = useState<string | null>(null)
  const [cancelReview, setCancelReview] = useState<string | null>(null)
  const [showLiveManagement,setShowLiveManagement] = useState(false)
  const [recoveryMessage,setRecoveryMessage] = useState<string|null>(null)
  const [confirmLiveAbandon,setConfirmLiveAbandon] = useState(false)
  const [showRestartHelp,setShowRestartHelp] = useState(false)
  const operationInFlight=useRef(false)
  const accountEpoch=useRef(0)
  const [accountRevision,setAccountRevision]=useState(0)
  useEffect(()=>{
    let lastOwner:string|null|undefined
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,session)=>{
      const nextOwner=session?.user?.id??null
      if(lastOwner!==undefined&&lastOwner!==nextOwner){
        accountEpoch.current++
        operationInFlight.current=false
        setAccounts(null);setAcceptances([]);setStatus({});setError(false);setStatusReadError(null);setBusy(false)
        setCancelConfirm(null);setCancelDone(null);setCancelReview(null)
        setRecoveryMessage(null);setConfirmLiveAbandon(false);setShowRestartHelp(false);setShowLiveManagement(false);setVoluntarySupport(false);setPromotionChoice('idle')
        setAccountRevision(n=>n+1)
      }
      lastOwner=nextOwner
    })
    return ()=>subscription.unsubscribe()
  },[])
  // An authenticated, already-bound V2 attempt must be managed, never offered a new request key.
  const [qaV2AccountState,setQaV2AccountState] = useState<'checking'|'none'|'pending'|'bound'|'unavailable'>('checking')
  const [qaManagementOpen,setQaManagementOpen] = useState(false)
  const [qaReviewRevision,setQaReviewRevision] = useState(0)
  const [qaResumeRevision,setQaResumeRevision] = useState(0)
  const [,setQaRecoveryStage] = useState('unverified')
  const [qaPayAction,setQaPayAction] = useState<'idle'|'checking'|'unavailable'|'retry_ready'|'reconciliation_needed'>('idle')
  const [qaRecoveryDiagnostic,setQaRecoveryDiagnostic]=useState<string|null>(null)
  const [qaPendingReset,setQaPendingReset]=useState(false)
  const [paypalReturnKind] = useState(() => supporterPaypalReturnKind(window.location.hash))
  const [preparationSlow,setPreparationSlow] = useState(false)
  const [preparationRevision,setPreparationRevision] = useState(0)
  const [qaOfferState,setQaOfferState] = useState<{
    phase:'loading'|'ready'|'blocked';mode:'initial'|'retry'
  }>({phase:'loading',mode:'initial'})
  const [offerRefreshRevision,setOfferRefreshRevision] = useState(0)
  // Each Live GET and published consent offer must settle behind the kitten,
  // scoped to language, Auth account and explicit read-only retry. Never allow
  // a completed response from a prior scope to reveal a different owner's offer.
  const liveOfferScope=`${lang}:${accountRevision}:${offerRefreshRevision}`
  const [liveOfferReadiness,setLiveOfferReadiness]=useState<{
    scope:string;phase:'loading'|'ready'|'blocked'
  }>({scope:'',phase:'loading'})
  const liveOfferPhase=liveOfferReadiness.scope===liveOfferScope
    ?liveOfferReadiness.phase:'loading'
  const receiveLiveOfferState=useCallback((phase:'loading'|'ready'|'blocked')=>{
    setLiveOfferReadiness(previous=>previous.scope===liveOfferScope&&previous.phase===phase
      ?previous:{scope:liveOfferScope,phase})
  },[liveOfferScope])
  const receiveOfferState=useCallback((phase:'loading'|'ready'|'blocked',
    mode:'initial'|'retry')=>{
    setQaOfferState(previous=>previous.phase===phase&&previous.mode===mode
      ?previous:{phase,mode})
  },[])
  const continueExistingQaRequest = () => {
    if(qaPayAction==='checking'||qaV2AccountState!=='bound')return
    // One obvious payment action. Server decides whether the old approval
    // can resume; no browser-generated subscription or paid entitlement.
    setQaPayAction('checking')
    setQaResumeRevision(n=>n+1)
  }
  const reviewExistingQaRequest = () => {
    setQaPayAction('idle')
    setQaManagementOpen(true)
    setQaV2AccountState('checking')
    setQaReviewRevision(n=>n+1)
  }
  const closeRef = useRef<HTMLButtonElement>(null)
  const {status: membership, refresh: refreshMembership} = useSupporterMembershipStatus()
  const publicStatus=usePublicSupporterStatus(!qaV2Screen)
  const [voluntarySupport,setVoluntarySupport]=useState(false)
  const [promotionChoice,setPromotionChoice]=useState<'idle'|'saved'|'error'>('idle')
  useEffect(()=>{if(!qaV2Screen)void supabase.rpc('pazo_supporter_promotion',{p_action:'offer',p_source:supporterEntrySource(window.location.hash)})},[paypalReturnKind,accountRevision])
  const spanish = lang === 'es'
  const label = (es: string, en: string) => spanish ? es : en
  // One coherent first paint: server-owned membership, private Sandbox
  // account list, AND published consent terms must all be ready before
  // revealing a first/retry checkout. An existing bound approval does not
  // require the offer endpoint until a new checkout is authorized.
  const offerRequired=qaV2Screen&&membership.kind==='inactive'&&
    (qaV2AccountState==='none'||
      (qaV2AccountState==='bound'&&qaPayAction==='retry_ready'))
  const offerMode=qaPayAction==='retry_ready'?'retry':'initial'
  const offerReadyForCurrentMode=qaOfferState.mode===offerMode
  const liveOfferRequired=!qaV2Screen&&
    (membership.kind==='inactive'||voluntarySupport)&&accounts?.length===0
  // Never reveal the offer while its Live checkout GET is still checking.
  // The consent/PayPal button must be present on the *first* offer paint.
  const preparationPending=membership.kind==='checking'||
    (!qaV2Screen&&membership.kind==='inactive'&&accounts===null&&!error)||
    (qaV2Screen&&membership.kind==='inactive'&&qaV2AccountState==='checking')||
    (offerRequired&&(!offerReadyForCurrentMode||qaOfferState.phase==='loading'))||
    (liveOfferRequired&&liveOfferPhase==='loading')
  // Keep the read-only management path available for a known original request.
  // Never relax readiness or server gates for starting a new paid checkout.
  const knownExistingLiveRequest=!qaV2Screen&&accounts?.length===1
  const preparationUnavailable=(membership.kind==='unavailable'&&!knownExistingLiveRequest)||
    (!qaV2Screen&&membership.kind==='inactive'&&accounts===null&&error)||
    (qaV2Screen&&membership.kind==='inactive'&&qaV2AccountState==='unavailable')||
    (offerRequired&&offerReadyForCurrentMode&&qaOfferState.phase==='blocked')||
    (liveOfferRequired&&liveOfferPhase==='blocked')
  const preparing=preparationPending||preparationUnavailable
  useEffect(()=>{
    if(!preparationPending){setPreparationSlow(false);return}
    const timeout=window.setTimeout(()=>setPreparationSlow(true),12000)
    return ()=>window.clearTimeout(timeout)
  },[preparationPending,preparationRevision])
  const retryPreparation=()=>{
    setPreparationSlow(false)
    setPreparationRevision(n=>n+1)
    // Re-check the existing server-authoritative membership result. Never
    // infer a missing subscription from network failure.
    if(membership.kind==='checking'||membership.kind==='unavailable')
      refreshMembership()
    if(qaV2Screen&&membership.kind==='inactive'&&
      (qaV2AccountState==='checking'||qaV2AccountState==='unavailable')){
      setQaV2AccountState('checking')
      setQaReviewRevision(n=>n+1)
    }
    if(!qaV2Screen&&error)void refresh()
    if(liveOfferRequired&&liveOfferPhase==='blocked'){
      // New scope atomically restores the kitten while a fresh GET runs.
      // This retries READ only and never creates a PayPal subscription.
      setOfferRefreshRevision(n=>n+1)
    }
    if(offerRequired){
      // Keep the kitten visible while the same mounted published-offer
      // component retries a READ only. Never start PayPal automatically.
      setQaOfferState({phase:'loading',mode:offerMode})
      setOfferRefreshRevision(n=>n+1)
    }
  }

  useEffect(() => {
    // Member home owns its own close/keyboard handling.
    if (membership.kind === 'verified'&&!showLiveManagement) return
    closeRef.current?.focus()
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) {
        if(showLiveManagement)setShowLiveManagement(false)
        else exitSupporterScreen(onClose)
      }
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [busy, onClose, membership.kind,showLiveManagement])

  const call = async (body: Record<string, unknown>, download = false) => {
    const epoch=accountEpoch.current
    const config = getPublicSupabaseConfig(import.meta.env)
    if (!config || config.url !== host) throw Error('configuration_missing')
    const { data: {session}, error: sessionError } = await supabase.auth.getSession()
    // getSession here is ONLY for obtaining bearer; backend verifies getUser().
    if (sessionError || !session?.access_token) throw Error('authentication_required')
    if(epoch!==accountEpoch.current)throw Error('account_changed')
    if(!qaV2Screen && !['list','status','cancel','resume','reconcile','abandon','abandon_pending','acknowledgement'].includes(String(body.action)))
      throw Error('live_management_not_released')
    const endpoint=qaV2Screen?'f16-paypal-supporter-account':'pazo-paypal-live-account'
    const response = await fetch(config.url + '/functions/v1/' + endpoint, {
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
    if(epoch!==accountEpoch.current)throw Error('account_changed')
    if (download) return response
    const data = await response.json() as AccountResult
    if(epoch!==accountEpoch.current)throw Error('account_changed')
    if (!data || data.ok !== true || data.paidThrough !== null)
      throw Error('server_response_untrusted')
    return data
  }

  const refresh = async () => {
    const epoch=accountEpoch.current
    setBusy(true)
    setError(false)
    try {
      const data = await call({ action: 'list' }) as AccountResult
      if (!Array.isArray(data.accounts) || data.accounts.length > (qaV2Screen?5:1) ||
        data.accounts.some(a => !intentPattern.test(a?.intentId || '') ||
          !['pending','bound'].includes(a.state) ||
          typeof a.canDownloadAcceptance !== 'boolean'))
        throw Error('account_list_invalid')
      const history=data.acceptances??[]
      if(!Array.isArray(history)||history.length>20||history.some(a=>
        !intentPattern.test(a?.intentId||'')||typeof a.acceptedAt!=='string'||
        !Number.isFinite(Date.parse(a.acceptedAt))))throw Error('acceptance_history_invalid')
      if(epoch===accountEpoch.current){setAccounts(data.accounts);setAcceptances(history)}
    } catch { if(epoch===accountEpoch.current){setError(true);setAccounts(null)} }
    finally { if(epoch===accountEpoch.current)setBusy(false) }
  }
  useEffect(() => { if (!qaV2Screen) void refresh() }, [accountRevision])

  const checkStatus = async (intentId: string) => {
    const epoch=accountEpoch.current
    setBusy(true)
    setStatusReadError(null)
    try {
      const data = await call({action:'status',intentId}) as AccountResult
      if(epoch!==accountEpoch.current)return
      if (typeof data.providerStatus !== 'string')
        throw Error('provider_status_missing')
      setStatus(current => ({...current,[intentId]:data.providerStatus!}))
      if(data.providerStatus==='CANCELLED'&&data.cancelled===true){
        setCancelDone(intentId);setCancelReview(null)
        setAccounts(current=>current?.map(a=>a.intentId===intentId?
          {...a,cancelInReview:false}:a)??null)
      }
      setCancelConfirm(null)
    } catch {if(epoch===accountEpoch.current)setStatusReadError(intentId)}
    finally {if(epoch===accountEpoch.current)setBusy(false)}
  }

  const cancel = async (intentId: string) => {
    const epoch=accountEpoch.current
    if(operationInFlight.current)return
    operationInFlight.current=true
    setBusy(true)
    setError(false)
    setCancelReview(null)
    try {
      const data = await call({action:'cancel',intentId,confirmCancellation:true}) as AccountResult
      if(epoch!==accountEpoch.current)return
      if (data.code !== 'future_renewals_cancelled' || data.cancelled !== true)
        throw Error('paypal_cancellation_unconfirmed')
      setCancelDone(intentId)
      setCancelConfirm(null)
      setStatus(current=>({...current,[intentId]:'CANCELLED'}))
    } catch {if(epoch===accountEpoch.current){setError(true);setCancelReview(intentId)}} finally {
      if(epoch===accountEpoch.current){operationInFlight.current=false;setBusy(false)}
    }
  }

  const recover = async (intentId:string,action:'resume'|'reconcile'|'abandon'|'abandon_pending') => {
    const epoch=accountEpoch.current
    if(operationInFlight.current)return
    operationInFlight.current=true
    setBusy(true);setError(false);setRecoveryMessage(null)
    let released=false
    try{
      const data=await call(action==='abandon_pending'
        ?{action,intentId,confirmAbandon:true}:{action,intentId}) as AccountResult
      if(epoch!==accountEpoch.current)return
      if(data.code==='live_original_approval_ready'){
        const target=new URL(data.approvalUrl||'')
        if(target.protocol!=='https:'||target.hostname!=='www.paypal.com'||
          target.username||target.password||target.port||target.hash||
          target.pathname!=='/webapps/billing/subscriptions'||
          target.searchParams.size!==1||!target.searchParams.get('ba_token'))
          throw Error('untrusted_approval_url')
        window.location.assign(target.toString())
      }else if(data.code==='live_checkout_slot_released'){
        released=true
        // A retired intent changes eligibility: discard the previous Live GET
        // before the next offer paint, so the kitten prepares the new checkout.
        setOfferRefreshRevision(n=>n+1)
        setShowRestartHelp(false)
        setConfirmLiveAbandon(false)
        setRecoveryMessage(label('El intento anterior terminó. Para iniciar otro, acepta nuevamente las condiciones.',
          'The earlier request has ended. Accept the terms again to start another.'))
      }else if(data.code==='live_original_subscription_verified'&&
        ['ACTIVE','APPROVED','SUSPENDED','CANCELLED','EXPIRED'].includes(data.providerStatus||'')){
        setStatus(current=>({...current,[intentId]:data.providerStatus!}))
        refreshMembership()
      }else throw Error('recovery_unverified')
    }catch{
      if(epoch!==accountEpoch.current)return
      if(action==='resume')setShowRestartHelp(true)
      setRecoveryMessage(action==='resume'
        ?label('PayPal no permitió reanudar esta aprobación. Si tu tarjeta fue rechazada, utiliza «Comprobar cierre e intentar de nuevo» para verificar y cerrar únicamente una solicitud todavía pendiente. Después podrás elegir otro método de pago. No se creó otra suscripción.',
          'PayPal could not resume this approval. If your card was declined, use Verify closure and retry to confirm and close only an unapproved request. You can then choose another payment method. No new subscription was created.')
        :label('PayPal todavía no confirmó el cierre o el estado de esta solicitud. No creamos otra suscripción. Consulta «Administrar mi suscripción» antes de repetir la operación.',
          'PayPal has not confirmed the closure or state of this request. No new subscription was created. Check Manage my subscription before repeating.'))
    }finally{if(epoch===accountEpoch.current){operationInFlight.current=false;setBusy(false)}}
    if(released&&epoch===accountEpoch.current)await refresh()
  }

  const download = async (intentId: string) => {
    const epoch=accountEpoch.current
    setBusy(true)
    setError(false)
    try {
      const response = await call({action:'acknowledgement',intentId},true) as Response
      if (!response.headers.get('content-type')?.startsWith('text/plain'))
        throw Error('unexpected_acknowledgement_type')
      const content = await response.text()
      if(epoch!==accountEpoch.current)return
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
    } catch {if(epoch===accountEpoch.current)setError(true)}
    finally {if(epoch===accountEpoch.current)setBusy(false)}
  }

  const control = 'min-h-11 rounded-full bg-[#E1E53F]/50 px-4 py-2.5 text-[13px] font-bold text-[#204E4A] transition-colors hover:bg-[#E1E53F] focus-visible:bg-[#E1E53F]/55 disabled:opacity-50'
  if (membership.kind === 'verified'&&!showLiveManagement&&!voluntarySupport) {
    return <SupporterScreenPortal motionKey="benefits" back><SupporterApprovedBenefits lang={lang} onClose={()=>exitSupporterScreen(onClose)} pet={pet}
      onManageSubscription={()=>setShowLiveManagement(true)}
      onSupport={publicStatus.value&&!publicStatus.value.paid&&!publicStatus.value.pending?()=>setVoluntarySupport(true):undefined}
      milestone={membership.milestone} qa={qaV2Screen}
      courtesy={publicStatus.value?.paid===false}
      showThanks={paypalReturnKind==='return'&&publicStatus.value?.paid===true}/></SupporterScreenPortal>
  }
  return (
    <SupporterScreenPortal motionKey={preparing?'preparing':showLiveManagement?'management':'account'} back={false}>
    <div role="dialog" aria-modal="true" aria-labelledby={preparing?undefined:'supporter-account-title'}
      aria-label={preparing?label('Preparando tu membresía de PAZO','Preparing your PAZO membership'):undefined}
      className="supporter-account-view relative h-full w-full min-h-0 overflow-y-auto overscroll-contain bg-[#F5F5ED] text-[#204E4A]">
      {preparing&&<SupporterPreparingScreen lang={lang}
        unavailable={preparationUnavailable} slow={preparationSlow}
        onRetry={retryPreparation} onClose={()=>exitSupporterScreen(onClose)}/>}

      <header hidden={preparing} style={{display:preparing?'none':undefined}} className="sticky top-0 z-20 bg-[#F5F5ED]/95 px-4 py-2 backdrop-blur-xl">
        <div className="mx-auto grid min-h-11 max-w-xl grid-cols-[44px_minmax(0,1fr)_44px] items-center gap-2">
          <button ref={closeRef} type="button" onClick={()=>{
            if(showLiveManagement)setShowLiveManagement(false)
            else exitSupporterScreen(onClose)
          }} disabled={busy}
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

      <main hidden={preparing} style={{display:preparing?'none':undefined}} className="mx-auto w-full min-w-0 max-w-xl space-y-2.5 px-4 pb-7 pt-1">
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
        {!qaV2Screen&&<SupporterBenefitReview lang={lang}/>}
        {(membership.kind === 'inactive'||voluntarySupport) && <>
          {voluntarySupport&&<p className="rounded-2xl bg-white p-4 text-sm">{label('Tu cortesía se conserva. Si deseas apoyar PAZO, puedes contratar voluntariamente la suscripción mensual.','Your complimentary benefits remain. You may voluntarily support PAZO with a monthly subscription.')}</p>}
          {paypalReturnKind&&<p role="status" className="mx-auto mb-3 max-w-[420px] rounded-[16px] bg-[#EBF1E5] px-4 py-3 text-center text-[13px] font-medium leading-relaxed text-[#204E4A]">
            {paypalReturnKind==='cancel'
              ?label('Regresaste de PayPal sin completar el pago. Primero comprobaremos el intento anterior antes de ofrecer otro.',
                'You returned from PayPal without completing payment. We will verify the earlier request before offering another.')
              :label('Volviste de PayPal. Estamos comprobando el resultado; la membresía solo se activará si se verifica el pago.',
                'You returned from PayPal. We are checking the result; membership activates only when payment is verified.')}
          </p>}
          {qaPendingReset&&<p role="status" className="rounded-[18px] bg-[#ECF2E6] px-4 py-3 text-center text-[13px] font-medium leading-relaxed text-[#2D5F51]">
            {label('La solicitud de prueba anterior quedó archivada en PAZO (no cancelada en PayPal). Confirma otra vez los términos para iniciar un pago nuevo.',
              'Your earlier test request was archived in PAZO (not cancelled at PayPal). Accept the terms again to start a new checkout.')}
          </p>}
          <SupporterApprovedOffer lang={lang} qa={qaV2Screen} visible={!preparing} preferenceSaveFailed={promotionChoice==='error'}
            pending={!qaV2Screen&&(accounts?.length??0)>0}
            review={Boolean(accounts?.[0]?.needsReconciliation)}
            returnedWithoutPay={paypalReturnKind==='cancel'}
            initialPage={supporterEntrySource(window.location.hash)==='invitation'?'offer':'invitation'}
            onClose={()=>exitSupporterScreen(onClose)} onOptOut={()=>{
              const epoch=accountEpoch.current
              void supabase.rpc('pazo_supporter_promotion',{p_action:'opt_out'}).then(r=>{
                if(epoch!==accountEpoch.current)return
                setPromotionChoice(r.error?'error':'saved');if(!r.error)onClose()
              })
            }}>
            {qaV2Screen ? (
              offerRequired
                ? <SandboxCheckoutQaPanel lang={lang} inline
                    retry={qaPayAction==='retry_ready'}
                    onOfferState={receiveOfferState}
                    refreshRevision={offerRefreshRevision}
                    onReviewExisting={reviewExistingQaRequest}/>
                : <div className="space-y-3 rounded-[21px] bg-[#F0F4E6] px-4 py-4 text-center text-[14px] leading-relaxed text-[#204E4A]">
                    <p className="text-[16px] font-black">
                      {qaV2AccountState==='bound'
                        ? label('Tu pago quedó pendiente','Your payment was left pending')
                        : qaV2AccountState==='unavailable'
                          ? label('No pudimos comprobar tu pago','We could not check your payment')
                          : label('Comprobando tu pago…','Checking your payment…')}
                    </p>
                    {qaV2AccountState==='bound'&&
                      <p className="text-[13px] leading-relaxed text-[#526F63]">
                        {label('Si el intento anterior sigue disponible, lo continuaremos. Si terminó y PayPal lo confirma, podrás empezar otro sin perder tu cuenta.',
                          'If your earlier checkout is available, we will resume it. If it has ended and PayPal verifies this, you can start another with the same account.')}
                      </p>}
                    {qaV2AccountState==='bound'&&qaPayAction!=='retry_ready'&&
                      <button type="button" onClick={continueExistingQaRequest}
                        disabled={qaPayAction==='checking'}
                        className="min-h-12 w-full rounded-full bg-[#E1E53F] px-4 py-3 text-[15px] font-black text-[#204E4A] hover:bg-[#EBEF67] focus-visible:bg-[#EBEF67] disabled:opacity-65">
                        {qaPayAction==='checking'
                          ? label('Conectando con PayPal…','Connecting to PayPal…')
                          : label('Pagar con PayPal','Pay with PayPal')}
                      </button>}
                    {qaPayAction==='reconciliation_needed'&&qaV2AccountState==='bound'&&
                      <p role="alert" className="rounded-[14px] bg-white p-3 text-[13px] font-medium leading-relaxed text-[#724927]">
                        {label('No pudimos confirmar la solicitud anterior con PayPal. No se inició otro cobro.',
                          'We could not verify the earlier request with PayPal. No new charge was started.')}
                        {qaRecoveryDiagnostic&&<span className="mt-1 block text-[11px] opacity-75">
                          {label('Referencia de diagnóstico: ','Diagnostic reference: ')}{qaRecoveryDiagnostic}
                        </span>}
                      </p>}
                    {qaPayAction==='unavailable'&&qaV2AccountState==='bound'&&
                      <p role="alert" className="rounded-[14px] bg-white p-3 text-[13px] font-medium leading-relaxed text-[#724927]">
                        {label('No pudimos preparar otro intento de pago. No se inició ningún cobro.',
                          'We could not prepare another payment attempt. No charge was started.')}
                        {qaRecoveryDiagnostic&&<span className="mt-1 block text-[11px] opacity-75">
                          {label('Referencia de diagnóstico: ','Diagnostic reference: ')}{qaRecoveryDiagnostic}
                        </span>}
                      </p>}
                    {qaV2AccountState==='unavailable'&&
                      <p role="alert" className="text-[13px] leading-relaxed text-[#526F63]">
                        {label('Vuelve a abrir esta pantalla más tarde. No se inició otro cobro.',
                          'Reopen this screen later. No new charge was initiated.')}
                      </p>}
                  </div>
            ) : accounts?.length===0 ? (
              <SupporterLiveCheckoutPanel lang={lang} key={liveOfferScope}
                onAvailabilityChange={receiveLiveOfferState}/>
            ) : (
              <div data-pazo-live-existing-checkout="recover-original"
                className="space-y-3 rounded-[18px] bg-[#F0F4E6] p-4 text-center">
                <p role="status" className="text-[13px] leading-relaxed text-[#476862]">
                  {label('Ya tienes una solicitud de PayPal. Puedes continuar ese mismo intento; PAZO comprobará primero su estado sin crear otra suscripción.',
                    'You already have a PayPal request. You can continue that same attempt; PAZO checks its status first without creating another subscription.')}
                </p>
                <button type="button" disabled={busy||!accounts?.[0]}
                  onClick={()=>{const original=accounts?.[0];if(original)void recover(original.intentId,'resume')}}
                  className="min-h-12 w-full rounded-full bg-[#E1E53F] px-4 py-3 text-[15px] font-black text-[#204E4A] hover:bg-[#EBEF67] focus-visible:bg-[#EBEF67] disabled:opacity-65">
                  {busy?label('Comprobando con PayPal…','Checking with PayPal…')
                    :label('Continuar con PayPal','Continue with PayPal')}
                </button>
                <p className="text-[12px] leading-relaxed text-[#526F63]">
                  {label('Si PayPal ya no permite recuperar la aprobación, consulta el estado en «Administrar mi suscripción». No se intentará otro cobro automáticamente.',
                    'If PayPal can no longer recover the approval, check its status under Manage my subscription. No other charge will be attempted automatically.')}
                </p>
                <details open={showRestartHelp}
                  onToggle={event=>setShowRestartHelp(event.currentTarget.open)}
                  className="rounded-[14px] bg-white/70 px-3 py-2 text-left">
                  <summary className="min-h-9 cursor-pointer py-2 text-[12px] font-bold text-[#204E4A]">
                    {label('¿Tu tarjeta fue rechazada? Volver a intentar','Was your card declined? Try again')}
                  </summary>
                  <p className="mb-2 text-[12px] leading-relaxed text-[#526F63]">
                    {label('Para usar otra tarjeta, primero verificaremos en PayPal que esta aprobación sigue pendiente y cerraremos la solicitud original sin pagar. Si ya se aprobó o no podemos confirmar el cierre, conservaremos el intento para evitar cobros duplicados.',
                      'To use another card, we first verify in PayPal that this approval is still pending and close the original unpaid request. If it was approved or closure cannot be verified, the original stays protected to prevent duplicate charges.')}
                  </p>
                  <label className="flex items-start gap-2 text-[12px] font-medium">
                    <input type="checkbox" className="mt-0.5 h-4 w-4 accent-[#204E4A]"
                      checked={confirmLiveAbandon} onChange={e=>setConfirmLiveAbandon(e.target.checked)}/>
                    <span>{label('Confirmo que quiero cerrar esta aprobación pendiente.',
                      'I confirm that I want to close this pending approval.')}</span>
                  </label>
                  <button type="button" disabled={busy||!confirmLiveAbandon||!accounts?.[0]}
                    onClick={()=>{const original=accounts?.[0];if(original)void recover(original.intentId,
                      original.state==='pending'&&!original.needsReconciliation?'abandon':'abandon_pending')}}
                    className="mt-3 min-h-11 w-full rounded-full bg-[#EAF0DD] px-3 py-2.5 text-[13px] font-bold text-[#204E4A] disabled:opacity-45">
                    {label('Comprobar cierre e intentar de nuevo','Verify closure and retry')}
                  </button>
                </details>
                {recoveryMessage&&<p role="alert" className="rounded-[14px] bg-white p-3 text-[12px] leading-relaxed text-[#724927]">{recoveryMessage}</p>}
              </div>
            )}
          </SupporterApprovedOffer>
          <p className="supporter-account-free mx-auto max-w-[420px] px-1 pt-1 text-center text-[12px] leading-relaxed text-[#5C7470]">
            {label('PAZO seguirá siendo gratis para todos.','PAZO will remain free for everyone.')}
          </p>
          <button type="button" onClick={onClose}
            className="supporter-account-dismiss min-h-11 w-full rounded-full px-4 py-2 text-center text-[13px] font-bold text-[#204E4A] underline decoration-[#A6BBB1] underline-offset-4 hover:bg-[#E9EEDC] focus-visible:bg-[#E1E53F]/30">
            {label('Ahora no, seguir usando PAZO','Not now, keep using PAZO')}
          </button>
        </>}
        {recoveryMessage&&(qaV2Screen||!accounts?.length)&&<p role="status" className="rounded-2xl bg-[#F0F4E6] p-4 text-sm">{recoveryMessage}</p>}
        {(showLiveManagement || acceptances.length>0 || qaV2Screen || error || accounts === null || (accounts?.length ?? 0)>0) &&
          <section aria-labelledby="supporter-manage-title" className="space-y-3">
          <details open={showLiveManagement||qaManagementOpen} onToggle={e=>setQaManagementOpen(e.currentTarget.open)}
            className="rounded-[24px] bg-white p-4 shadow-[0_4px_16px_rgba(32,78,74,0.04)]">
            <summary className="min-h-11 cursor-pointer py-2 text-sm font-extrabold focus-visible:bg-[#E1E53F]/30">
              {qaV2Screen
                ? label('Detalles de mi pago de prueba', 'Test payment details')
                : label('Administrar mi suscripción', 'Manage my subscription')}
            </summary>
          <h3 id="supporter-manage-title" className="px-1 text-lg font-black">
            {label('Mi membresía', 'My membership')}
          </h3>
          {qaV2Screen ? (
            <SandboxV2AccountPanel lang={lang} onAccountInspection={setQaV2AccountState} onRecoveryStage={setQaRecoveryStage} onRecoveryDiagnostic={setQaRecoveryDiagnostic} onResumeStatus={setQaPayAction} onQaPendingReset={()=>setQaPendingReset(true)} onPaidVerified={refreshMembership} reviewRevision={qaReviewRevision} resumeRevision={qaResumeRevision}/>
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
                      ? membership.kind==='verified'
                        ?label('Tu cobertura pagada verificada se conserva hasta su vencimiento.',
                          'Your verified paid coverage remains until expiry.')
                        :label('Vinculada a PayPal; período pagado no verificado.', 'Linked to PayPal; paid period unverified.')
                      : label('Solicitud pendiente de revisión', 'Pending review')}
                  </p>
                  {statusReadError===account.intentId&&<p role="alert"
                     className="rounded-[14px] bg-[#FCE5D8] p-3 text-[12px] font-medium leading-relaxed text-[#724927]">
                     {label('No pudimos consultar el estado de la solicitud en PayPal. La solicitud original se conserva; no se inició otro pago. Puedes intentar «Actualizar estado» más adelante o contactar con soporte.',
                       'We could not check the request status with PayPal. Your original request is preserved; no new payment was initiated. You can retry Refresh status later or contact support.')}
                   </p>}
                   {status[account.intentId] && <p role="status" className="text-sm">
                    {label('Estado informado por PayPal: ','PayPal-reported status: ')}
                    <strong>{status[account.intentId]}</strong>
                  </p>}
                  {cancelDone === account.intentId && <p role="status" className="text-sm font-bold">
                    {label('Cancelada la próxima renovación.','Future renewals cancelled.')}
                  </p>}
                  {!qaV2Screen&&<p role="status" className="text-[12px] leading-relaxed text-[#526F63]">
                    {account.needsReconciliation
                      ? label('PayPal todavía está conciliando esta solicitud. No inicies otra.',
                        'PayPal is still reconciling this request. Do not start another.')
                      : label('Consulta el estado original de PayPal para administrar esta suscripción. Cancelar renovaciones no solicita un reembolso.',
                        'Check the original PayPal status to manage this subscription. Cancelling renewals does not request a refund.')}
                  </p>}
                  {!qaV2Screen && (account.cancelInReview||
                    cancelReview===account.intentId) && <p role="alert"
                      className="rounded-[14px] bg-[#FCE5D8] p-3 text-[12px] leading-relaxed text-[#724927]">
                    {label('Tu solicitud de cancelación necesita comprobación. No volveremos a solicitarla automáticamente; puedes consultar su estado aquí o desde PayPal.',
                      'Your cancellation needs verification. We will not automatically send it again. You can check its status here or in PayPal.')}
                  </p>}
                  {!qaV2Screen&&account.cancelConfirmed&&<p role="status"
                    className="text-[12px] font-semibold text-[#204E4A]">
                    {label('Cancelación de próximas renovaciones registrada y verificada.',
                      'Future renewal cancellation has been verified and recorded.')}
                  </p>}
                  <div className="flex flex-wrap gap-2">
                    {account.state === 'bound' && <button type="button" disabled={busy}
                      onClick={() => void checkStatus(account.intentId)} className={control}>
                      {label('Actualizar estado','Refresh status')}</button>}
                    {account.canDownloadAcceptance && <button type="button" disabled={busy}
                      onClick={() => void download(account.intentId)} className={control}>
                      {label('Descargar condiciones aceptadas','Download accepted terms')}</button>}
                    {!qaV2Screen&&(account.state==='pending'||status[account.intentId]==='APPROVAL_PENDING')&&
                      <button type="button" disabled={busy} className={control}
                        onClick={()=>void recover(account.intentId,'resume')}>
                        {label('Continuar solicitud anterior','Continue earlier request')}</button>}
                    {!qaV2Screen&&account.state==='pending'&&!account.needsReconciliation&&
                      <button type="button" disabled={busy} className={control}
                        onClick={()=>void recover(account.intentId,'abandon')}>
                        {label('Descartar solicitud sin enviar','Discard unsent request')}</button>}
                    {!qaV2Screen&&['CANCELLED','EXPIRED'].includes(status[account.intentId]||'')&&
                      <button type="button" disabled={busy} className={control}
                        onClick={()=>void recover(account.intentId,'reconcile')}>
                        {label('Comprobar si puedo volver a suscribirme','Check whether I can subscribe again')}</button>}
                    {account.state === 'bound' &&
                      (qaV2Screen ? status[account.intentId] !== 'CANCELLED' :
                        ['ACTIVE','SUSPENDED'].includes(status[account.intentId]||'') &&
                        !account.cancelInReview&&!account.cancelConfirmed) &&
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
              {acceptances.length>0&&<details className="rounded-2xl bg-[#F0F4E6] p-4">
                <summary className="min-h-11 cursor-pointer py-2 text-sm font-bold">
                  {label('Condiciones de solicitudes anteriores','Earlier accepted terms')}</summary>
                <div className="space-y-2">{acceptances.map(item=><button key={item.intentId}
                  type="button" disabled={busy} className={control}
                  onClick={()=>void download(item.intentId)}>
                  {label('Descargar condiciones aceptadas: ','Download accepted terms: ')}
                  {new Date(item.acceptedAt).toLocaleDateString(lang==='es'?'es-US':'en-US')}
                </button>)}</div>
              </details>}
            </>
          )}
          </details>
        </section>}

        {membership.kind === 'unavailable' && supporterBenefitsUiEnabled && (
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
        {!qaV2Screen&&<div className="supporter-account-promotion text-center"><button type="button" className="min-h-11 rounded-xl px-3 text-xs underline focus-visible:bg-[#E1E53F]" disabled={promotionChoice==='saved'} onClick={()=>{
          void supabase.rpc('pazo_supporter_promotion',{p_action:'opt_out'}).then(r=>setPromotionChoice(r.error?'error':'saved'))
        }}>{promotionChoice==='saved'?label('Invitaciones promocionales desactivadas','Promotional invitations disabled'):label('No recibir invitaciones promocionales','Stop promotional invitations')}</button>
        {promotionChoice==='error'&&<p role="alert" className="text-xs">{label('No pudimos guardar tu preferencia. Intenta de nuevo.','Your preference could not be saved. Try again.')}</p>}</div>}
      </main>
    </div>
    </SupporterScreenPortal>
  )
}
