import { useEffect, useRef, useState } from 'react'
import { supabase } from '../../../services/supabaseClient'
import { getPublicSupabaseConfig } from '../../../lib/publicConfig'
import { saveSandboxApproval } from '../sandboxApprovalReturn.mjs'

// F16 P06: owner-only Sandbox QA purchase experience, HIDDEN from public builds.
// Local Vite Sandbox admits confirmed Auth owners automatically after explicit
// consent. Live and duplicate-charge protections remain server enforced.
// No membership/badge claim is ever inferred from PayPal approval or redirect.
type Offer = {
  version: string
  locale: 'es' | 'en'
  exactCopy: string
  termsDigest: string
  priceMinor: 299
  currency: 'USD'
  cadence: 'MONTH_1'
}
type ServerResult = {
  phase?: string
  code?: string
  offer?: Offer
  intentId?: string
  approvalUrl?: string
  entitlement?: boolean
  mayGrantBenefits?: boolean
  paidThrough?: null
}
type Props = {lang: 'es' | 'en'; inline?: boolean; onReviewExisting?: ()=>void; retry?:boolean}
const HOST = 'https://mrybvqdebbgcayuvgkkr.supabase.co'
const DIGEST = /^[0-9a-f]{64}$/
// Previous P06 QA terms explicitly excluded benefits: NEVER reuse them.
const BENEFITS_V2='pazo-supporter-sandbox.benefits-v2'
const approveUrl = (raw: unknown): string | null => {
  if (typeof raw !== 'string' || raw.length > 2048) return null
  try {
    const u = new URL(raw)
    return u.protocol === 'https:' && ['www.sandbox.paypal.com','sandbox.paypal.com'].includes(u.hostname) &&
      !u.username && !u.password && !u.port && u.pathname.startsWith('/webapps/billing/subscriptions')
      ? u.toString() : null
  } catch { return null }
}
export function SandboxCheckoutQaPanel({lang,inline=false,onReviewExisting,retry=false}: Props) {
  const [offer,setOffer] = useState<Offer | null>(null)
  const [busy,setBusy] = useState(false)
  const [consent,setConsent] = useState(false)
  const [phase,setPhase] = useState<'loading' | 'ready' | 'blocked' | 'pending'>('loading')
  // Only the *published offer* can be retried; beginning a subscription remains one-shot.
  const [offerRevision,setOfferRevision] = useState(0)
  const [offerFailure,setOfferFailure] = useState<'rate_limited' | 'restricted' | 'unavailable' | 'invalid_offer' | null>(null)
  const [beginFailure,setBeginFailure] = useState<'already_linked' | 'rate_limited' | 'restricted' | 'unknown' | null>(null)
  const key = useRef<string | null>(null)
  const attempted = useRef(false)
  const spanish=lang==='es'
  const label=(es:string,en:string)=>spanish?es:en
  async function call(payload: object): Promise<ServerResult> {
    const config=getPublicSupabaseConfig(import.meta.env)
    if (!config || config.url !== HOST) throw Error('bad_client_config')
    const {data:{session},error}=await supabase.auth.getSession()
    if (error || !session?.access_token) throw Error('not_signed_in')
    const res=await fetch(HOST+'/functions/v1/f16-paypal-supporter-v2-qa',{
      method:'POST',headers:{
        authorization:'Bearer '+session.access_token,
        apikey:config.key,'content-type':'application/json',
      },body:JSON.stringify(payload),cache:'no-store',
    })
    let value: ServerResult
    try {value=await res.json() as ServerResult}
    catch {throw Error('invalid_qa_response')}
    if(!res.ok) {
      if(res.status===429)throw Error('qa_rate_limited')
      if(res.status===403)throw Error('qa_restricted')
      if(res.status===409 && value?.phase==='ALREADY_LINKED_NOT_PAYMENT_VERIFIED')
        throw Error('qa_already_linked')
      throw Error('qa_request_unavailable')
    }
    if(value?.entitlement===true || value?.mayGrantBenefits===true ||
       value?.paidThrough !== null)throw Error('untrusted_paid_response')
    return value
  }
  useEffect(()=>{
    let live=true
    setPhase('loading')
    setOffer(null)
    setConsent(false)
    setOfferFailure(null)
    // A read-only recheck is allowed after an error; never reissue begin.
    void call({action:'offer',locale:lang}).then(r=>{
      if(!live)return
      const o=r?.offer
      if(r.phase!=='PUBLISHED_OFFER'||!o||
        o.locale!==lang||
        !DIGEST.test(o.termsDigest||'')||o.version!==BENEFITS_V2||
        typeof o.exactCopy!=='string'||o.exactCopy.length<100||
        !(lang==='es' ?
          /insignia Amigo de PAZO/.test(o.exactCopy) && /cinco fondos/.test(o.exactCopy) && /muro público/.test(o.exactCopy) :
          /Friend of PAZO badge/.test(o.exactCopy) && /five pet profile themes/.test(o.exactCopy) && /public Thank You/.test(o.exactCopy))||
        o.priceMinor!==299||o.currency!=='USD'||o.cadence!=='MONTH_1'){
        setOfferFailure('invalid_offer')
        setPhase('blocked');return
      }
      setOffer(o);setPhase('ready')
    }).catch(error=>{
      if(!live)return
      const code=error instanceof Error ? error.message : ''
      setOfferFailure(code==='qa_rate_limited'?'rate_limited':
        code==='qa_restricted'?'restricted':'unavailable')
      setPhase('blocked')
    })
    return ()=>{live=false}
  },[lang,offerRevision])
  const begin=async()=>{
    if(!offer || !consent || busy || attempted.current || phase!=='ready')return
    attempted.current=true
    key.current ||= crypto.randomUUID()
    setBusy(true)
    setBeginFailure(null)
    setPhase('pending')
    try{
      const data=await call({action:retry?'retry_begin':'begin',consent:{
        requestKey:key.current,locale:offer.locale,termsVersion:offer.version,
        termsDigest:offer.termsDigest,affirmativeConsent:true,
      }})
      const url=data.phase==='APPROVAL_PENDING'?approveUrl(data.approvalUrl):null
      if(url){
        // Pausing on PayPal login must NOT erase the original approval link.
        // It is bound to the same Auth owner + immutable intent and expires
        // from this tab after 30 minutes. No second PayPal subscription POST.
        const {data:{session}}=await supabase.auth.getSession()
        if(session?.user?.id&&typeof data.intentId==='string')
          saveSandboxApproval({ownerId:session.user.id,intentId:data.intentId,approvalUrl:url})
        window.location.assign(url);return
      }
    }catch(error) {
      // Failed/ambiguous responses MUST NOT trigger another PayPal POST.
      // Render only safe error categories; never expose raw provider or user data.
      const code=error instanceof Error ? error.message : ''
      setBeginFailure(code==='qa_already_linked'?'already_linked':
        code==='qa_rate_limited'?'rate_limited':
        code==='qa_restricted'?'restricted':'unknown')
    }finally{setBusy(false)}
  }
  return (
    <section aria-labelledby="f16-qa-checkout-title"
      className={inline ? 'min-w-0 space-y-2' : 'space-y-4 rounded-[28px] bg-[#F0F3ED] p-4 sm:p-5'}>
      <h3 id="f16-qa-checkout-title" className={inline ? 'sr-only' : 'text-lg font-black'}>
        {label('Confirmar mi apoyo · Sandbox','Confirm my support · Sandbox')}
      </h3>

      {phase==='loading'&&<p role="status" className="py-2 text-center text-[12px] text-[#476862]">
        {label('Consultando las condiciones…','Checking subscription terms…')}
      </p>}
      {phase==='blocked'&&<div role="alert" className="space-y-2 rounded-xl bg-[#FCE5D8] p-3 text-[12px] text-[#204E4A]">
        <p>{offerFailure==='rate_limited'
          ? label('Demasiadas consultas a PayPal Sandbox. Espera un momento antes de volver a consultar la oferta.',
            'Too many PayPal Sandbox checks. Please wait before checking the offer again.')
          : offerFailure==='restricted'
            ? label('No se pudo autorizar esta sesión para Sandbox. Verifica tu correo y vuelve a iniciar sesión; no repitas un pago pendiente.',
              'This account or session is not authorized for Sandbox testing. Do not start another subscription.')
            : offerFailure==='invalid_offer'
              ? label('No se pudo comprobar la versión y las condiciones de esta oferta. El pago permanece bloqueado.',
                'Could not verify this offer version and terms. Checkout remains blocked.')
              : label('No pudimos consultar la oferta Sandbox. Esto no significa que haya dejado de existir.',
                'Could not check the Sandbox offer. This does not mean it no longer exists.')}
        </p>
        {(offerFailure==='rate_limited'||offerFailure==='unavailable')&&
          <button type="button" onClick={()=>setOfferRevision(n=>n+1)}
            className="min-h-11 rounded-full bg-white px-4 py-2 text-[12px] font-extrabold text-[#204E4A] hover:bg-[#F0F3ED] focus-visible:bg-[#E1E53F]/40">
            {label('Volver a consultar la oferta','Check the offer again')}
          </button>}
      </div>}

      {offer&&<div className={inline ? 'space-y-2' : 'space-y-4'}>
        <button type="button" onClick={()=>void begin()}
          disabled={!consent||busy||phase!=='ready'||attempted.current}
          className={inline
            ? 'min-h-[49px] w-full rounded-full bg-[#E1E53F] px-4 py-2.5 text-[14px] font-extrabold text-[#204E4A] shadow-[0_6px_16px_rgba(32,78,74,0.12)] transition-colors hover:bg-[#EBEF67] focus-visible:bg-[#EBEF67] disabled:cursor-not-allowed disabled:bg-[#EEF1B7] disabled:text-[#204E4A]'
            : 'min-h-11 rounded-full bg-[#E1E53F] px-5 py-3 text-sm font-bold text-[#204E4A] hover:bg-[#EBEF67] focus-visible:bg-[#EBEF67] disabled:cursor-not-allowed disabled:bg-[#EEF1B7] disabled:text-[#204E4A]'}>
          <span className="inline-flex items-center justify-center gap-2">
            <svg viewBox="0 0 24 24" aria-hidden="true" className="h-[25px] w-[25px] shrink-0 fill-[#003087]">
              <path d="M8.1 2.2h7.5c4.9 0 6.3 3 5.6 6.3-.9 4.2-4 6.2-8.5 6.2h-2.5l-1.7 7.1H3.6L8.1 2.2Z"/>
              <path d="M10 7.6h6.1c4.3 0 5.8 2.6 5 6.4-.6 3.8-3.6 5.2-7.3 5.2H8l2-11.6Z" fill="#009CDE"/>
            </svg>
            <span className="flex flex-col items-center gap-0.5">
              <span>{retry?label('Volver a intentar con PayPal','Try again with PayPal'):label('Quiero apoyar a PAZO','I want to support PAZO')}</span>
              {!retry&&<span className="text-[11px] font-semibold leading-tight">{label('Continuar con PayPal','Continue with PayPal')}</span>}
            </span>
          </span>
        </button>
        <label className="flex min-h-11 items-start gap-2.5 px-1 pt-2 text-left text-[11px] font-medium leading-[1.45] text-[#476862]">
          <input type="checkbox" checked={consent}
            onChange={e=>setConsent(e.target.checked)}
            disabled={attempted.current}
            className="mt-0.5 h-[18px] w-[18px] shrink-0 accent-[#204E4A]"/>
          <span>{label('Acepto la suscripción de prueba de US$2.99 al mes, con renovación automática. Puedo cancelar las futuras renovaciones.',
            'I accept the US$2.99/month test subscription with automatic renewal. I can cancel future renewals.')}</span>
        </label>
        <details className={inline ? 'px-1 text-left text-[11px] text-[#476862]' : 'rounded-[18px] bg-white p-3'}
          aria-label={label('Condiciones completas de la prueba','Full test terms')}>
          <summary className={inline
            ? 'min-h-6 cursor-pointer text-[11px] font-semibold underline decoration-[#B9C8B6] underline-offset-2 focus-visible:bg-[#E1E53F]/30'
            : 'min-h-11 cursor-pointer py-2 text-sm font-extrabold text-[#204E4A] focus-visible:bg-[#E1E53F]/35'}>
            {label('Leer las condiciones completas','Read full terms')}
          </summary>
          <div className="max-h-[35dvh] overflow-y-auto whitespace-pre-wrap pt-2 text-[12px] leading-relaxed text-[#476862]">{offer.exactCopy}</div>
        </details>
        <p className="text-center text-[10px] leading-relaxed text-[#5C7470]">
          {label('PayPal Sandbox · Solo dinero ficticio · Renovación mensual',
            'PayPal Sandbox · Test money only · Monthly renewal')}
        </p>
      </div>}
      {phase==='pending'&&<div className="space-y-2">
       <p role={beginFailure?'alert':'status'}
        className="rounded-xl bg-[#E8EEDC] p-3 text-[12px] leading-relaxed text-[#204E4A]">
        {beginFailure==='already_linked'
          ? label('Ya existe una suscripción Sandbox vinculada. No abras otra. Consulta «Gestionar mi prueba de PayPal Sandbox» para revisar la operación existente.',
            'A Sandbox subscription is already linked. Do not start another. Open “Manage my PayPal Sandbox test” to review it.')
          : beginFailure==='rate_limited'
            ? label('Se alcanzó el límite temporal de consultas. No repitas el pago. Consulta tu prueba existente más tarde.',
              'The temporary request limit was reached. Do not repeat checkout. Check your existing test later.')
            : beginFailure==='restricted'
              ? label('No se autorizó este intento. No se abrirá PayPal; consulta el estado de tu prueba existente.',
                'This attempt was not authorized. PayPal will not open; check your existing test status.')
              : label('PayPal no se abrió o la respuesta quedó sin confirmar. No repitas el pago: revisa la suscripción desde «Gestionar mi prueba de PayPal Sandbox».',
                'PayPal did not open or the response is unconfirmed. Do not retry payment: review the subscription in “Manage my PayPal Sandbox test”.')}
       </p>
       {onReviewExisting&&<button type="button" onClick={onReviewExisting}
         className="min-h-11 w-full rounded-full bg-[#204E4A] px-4 py-2.5 text-[12px] font-extrabold text-white hover:bg-[#31615B] focus-visible:bg-[#31615B]">
         {label('Revisar mi solicitud de PayPal','Review my PayPal request')}
       </button>}
      </div>}
    </section>
  )
}
