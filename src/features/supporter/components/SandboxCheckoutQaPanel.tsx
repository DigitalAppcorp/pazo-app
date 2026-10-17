import { useEffect, useRef, useState } from 'react'
import { supabase } from '../../../services/supabaseClient'
import { getPublicSupabaseConfig } from '../../../lib/publicConfig'

// F16 P06: owner-only Sandbox QA purchase experience, HIDDEN from public builds.
// Server still enforces a separate, private test-UID allowlist and disabled default.
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
  offer?: Offer
  approvalUrl?: string
  entitlement?: boolean
  mayGrantBenefits?: boolean
  paidThrough?: null
}
type Props = {lang: 'es' | 'en'}
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
export function SandboxCheckoutQaPanel({lang}: Props) {
  const [offer,setOffer] = useState<Offer | null>(null)
  const [busy,setBusy] = useState(false)
  const [consent,setConsent] = useState(false)
  const [phase,setPhase] = useState<'loading' | 'ready' | 'blocked' | 'pending'>('loading')
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
    if(!res.ok)throw Error('not_authorized_or_unavailable')
    const value=await res.json() as ServerResult
    if(value?.entitlement===true || value?.mayGrantBenefits===true ||
       value?.paidThrough !== null)throw Error('untrusted_paid_response')
    return value
  }
  useEffect(()=>{
    let live=true
    setPhase('loading')
    setOffer(null)
    setConsent(false)
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
        setPhase('blocked');return
      }
      setOffer(o);setPhase('ready')
    }).catch(()=>{if(live)setPhase('blocked')})
    return ()=>{live=false}
  },[lang])
  const begin=async()=>{
    if(!offer || !consent || busy || attempted.current || phase!=='ready')return
    attempted.current=true
    key.current ||= crypto.randomUUID()
    setBusy(true)
    setPhase('pending')
    try{
      const data=await call({action:'begin',consent:{
        requestKey:key.current,locale:offer.locale,termsVersion:offer.version,
        termsDigest:offer.termsDigest,affirmativeConsent:true,
      }})
      const url=data.phase==='APPROVAL_PENDING'?approveUrl(data.approvalUrl):null
      if(url){window.location.assign(url);return}
    }catch{ /* Failed/ambiguous responses MUST NOT trigger another PayPal POST. */ }
    finally{setBusy(false)}
  }
  return (
    <section aria-labelledby="f16-qa-checkout-title"
      className="space-y-4 rounded-[28px] bg-[#F0F3ED] p-4 sm:p-5">
      <h3 id="f16-qa-checkout-title" className="text-lg font-black">
        {label('Confirmar mi apoyo · Sandbox','Confirm my support · Sandbox')}
      </h3>
      <p className="text-sm text-[#476862]">
        {label('Esta es una prueba con PayPal Sandbox: no se usa dinero real. Los beneficios solo se activan después de comprobar el pago en el servidor.',
          'This is a PayPal Sandbox test with no real money. Benefits activate only after server-side payment verification.')}
      </p>
      {phase==='loading'&&<p role="status">{label('Consultando la oferta…','Checking offer…')}</p>}
      {phase==='blocked'&&<p role="status">
        {label('No está publicada la nueva oferta Sandbox con cuatro beneficios. La prueba antigua no permite activarlos.',
          'The new four-benefit Sandbox offer has not been published. The previous test cannot grant them.')}
      </p>}
      {offer&&<div className="space-y-4">
        <details className="group rounded-[22px] bg-white p-4" aria-label={label('Condiciones completas de la prueba','Full test terms')}>
          <summary className="min-h-11 cursor-pointer py-2 text-sm font-extrabold text-[#204E4A] focus-visible:bg-[#E1E53F]/35">
            {label('Leer condiciones de renovación y beneficios','Read renewal and benefit terms')}
          </summary>
          <div className="whitespace-pre-wrap pt-3 text-[13px] leading-relaxed text-[#476862]">{offer.exactCopy}</div>
        </details>
        <label className="flex min-h-11 items-start gap-3 text-sm font-semibold">
          <input type="checkbox" checked={consent}
            onChange={e=>setConsent(e.target.checked)}
            disabled={attempted.current}
            className="mt-1 h-5 w-5 accent-[#204E4A]"/>
          <span>{label('He leído y acepto las condiciones de esta prueba de US$2.99/mes con renovación automática y cuatro beneficios, sin dinero real.',
            'I have read and accept the terms of this US$2.99/month automatically renewing test with four benefits and no real money.')}</span>
        </label>
        <button type="button" onClick={()=>void begin()}
          disabled={!consent||busy||phase!=='ready'||attempted.current}
          className="min-h-11 rounded-full bg-[#204E4A] px-5 py-3 text-sm font-bold text-white disabled:opacity-50">
          {label('Continuar a PayPal Sandbox','Continue to PayPal Sandbox')}
        </button>
      </div>}
      {phase==='pending'&&<p role="status" className="text-sm">
        {label('Solicitud enviada o pendiente de verificación. Por seguridad no se repetirá automáticamente. No se ha acreditado ningún pago.',
          'Request sent or awaiting verification. It will not retry automatically. No payment has been credited.')}
      </p>}
    </section>
  )
}
