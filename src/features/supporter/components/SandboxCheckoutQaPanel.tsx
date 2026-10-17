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
type Props = {lang: 'es' | 'en'; inline?: boolean}
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
export function SandboxCheckoutQaPanel({lang,inline=false}: Props) {
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
      className={inline ? 'min-w-0 space-y-2' : 'space-y-4 rounded-[28px] bg-[#F0F3ED] p-4 sm:p-5'}>
      <h3 id="f16-qa-checkout-title" className={inline ? 'sr-only' : 'text-lg font-black'}>
        {label('Confirmar mi apoyo · Sandbox','Confirm my support · Sandbox')}
      </h3>

      {phase==='loading'&&<p role="status" className="py-2 text-center text-[12px] text-[#476862]">
        {label('Consultando las condiciones…','Checking subscription terms…')}
      </p>}
      {phase==='blocked'&&<p role="alert" className="rounded-xl bg-[#FCE5D8] p-3 text-[12px] text-[#204E4A]">
        {label('Esta oferta de prueba no está disponible. No es posible iniciar el pago.',
          'This test offer is unavailable. Checkout cannot start.')}
      </p>}

      {offer&&<div className={inline ? 'space-y-2' : 'space-y-4'}>
        <label className="flex min-h-11 items-start gap-2.5 px-1 text-[11px] font-medium leading-[1.45] text-[#476862]">
          <input type="checkbox" checked={consent}
            onChange={e=>setConsent(e.target.checked)}
            disabled={attempted.current}
            className="mt-0.5 h-[18px] w-[18px] shrink-0 accent-[#204E4A]"/>
          <span>{label('Acepto la suscripción de prueba de US$2.99 al mes, con renovación automática. Puedo cancelar las futuras renovaciones.',
            'I accept the US$2.99/month test subscription with automatic renewal. I can cancel future renewals.')}</span>
        </label>
        <details className={inline ? 'px-1 text-[11px] text-[#476862]' : 'rounded-[18px] bg-white p-3'}
          aria-label={label('Condiciones completas de la prueba','Full test terms')}>
          <summary className={inline
            ? 'min-h-6 cursor-pointer text-[11px] font-semibold underline decoration-[#B9C8B6] underline-offset-2 focus-visible:bg-[#E1E53F]/30'
            : 'min-h-11 cursor-pointer py-2 text-sm font-extrabold text-[#204E4A] focus-visible:bg-[#E1E53F]/35'}>
            {label('Leer las condiciones completas','Read full terms')}
          </summary>
          <div className="max-h-[35dvh] overflow-y-auto whitespace-pre-wrap pt-2 text-[12px] leading-relaxed text-[#476862]">{offer.exactCopy}</div>
        </details>
        <button type="button" onClick={()=>void begin()}
          disabled={!consent||busy||phase!=='ready'||attempted.current}
          className={inline
            ? 'min-h-12 w-full rounded-full bg-[#E1E53F] px-4 py-2.5 text-[13px] font-extrabold text-[#204E4A] transition-colors hover:bg-[#EDF150] focus-visible:bg-[#EDF150] disabled:cursor-not-allowed disabled:opacity-50'
            : 'min-h-11 rounded-full bg-[#204E4A] px-5 py-3 text-sm font-bold text-white disabled:opacity-50'}>
          <span className="inline-flex items-center justify-center gap-2">
            <svg viewBox="0 0 24 24" aria-hidden="true" className="h-[21px] w-[21px] fill-[#003087]">
              <path d="M8.1 2.2h7.5c4.9 0 6.3 3 5.6 6.3-.9 4.2-4 6.2-8.5 6.2h-2.5l-1.7 7.1H3.6L8.1 2.2Z"/>
              <path d="M10 7.6h6.1c4.3 0 5.8 2.6 5 6.4-.6 3.8-3.6 5.2-7.3 5.2H8l2-11.6Z" fill="#009CDE"/>
            </svg>
            {label('Continuar con PayPal','Continue with PayPal')}
          </span>
        </button>
        <p className="text-center text-[10px] leading-relaxed text-[#5C7470]">
          {label('PayPal Sandbox · Solo dinero ficticio · Renovación mensual',
            'PayPal Sandbox · Test money only · Monthly renewal')}
        </p>
      </div>}
      {phase==='pending'&&<p role="status" className="rounded-xl bg-[#E8EEDC] p-3 text-[12px] leading-relaxed text-[#204E4A]">
        {label('Solicitud enviada o pendiente de verificación. No vuelvas a iniciar el pago; PAZO no ha acreditado beneficios todavía.',
          'Request sent or awaiting verification. Do not restart checkout; PAZO has not granted benefits yet.')}
      </p>}
    </section>
  )
}
