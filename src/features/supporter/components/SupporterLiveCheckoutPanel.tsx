import {useCallback,useEffect,useRef,useState} from 'react'
import {supabase} from '../../../services/supabaseClient'
import {getPublicSupabaseConfig} from '../../../lib/publicConfig'

// Live checkout UI is safe to ship while Live remains OFF. The backend must
// explicitly attest an active merchant AND a healthy private settlement worker.
// No purchase, paid status or retry is inferred from frontend flags/redirects.
type Locale='es'|'en'
type Stage='checking'|'unavailable'|'ready'|'submitting'|'review'
type AvailabilityReason='origin'|'canary'|'general'
type Offer={version:string;locale:Locale;exactCopy:string;termsDigest:string;
 consentLabel:string;priceMinor:number;currency:string;cadence:string}
const HOST='https://mrybvqdebbgcayuvgkkr.supabase.co'
const digest=/^[a-f0-9]{64}$/
const approvalUrl=(url:unknown):string|null=>{
 if(typeof url!=='string'||url.length>2048)return null
 try{
  const u=new URL(url)
  return u.protocol==='https:'&&u.hostname==='www.paypal.com'&&
   !u.username&&!u.password&&!u.port&&!u.hash&&
   u.pathname==='/webapps/billing/subscriptions'&&
   u.searchParams.size===1&&Boolean(u.searchParams.get('ba_token'))
   ?u.toString():null
 }catch{return null}
}
const privateConfig=()=>{
 const c=getPublicSupabaseConfig(import.meta.env)
 if(!c||c.url!==HOST)throw Error('invalid_public_configuration')
 return c
}
const published=(raw:unknown,locale:Locale):raw is Offer=>{
 if(!raw||typeof raw!=='object'||Array.isArray(raw))return false
 const o=raw as Partial<Offer>
 return o.locale===locale&&o.priceMinor===299&&o.currency==='USD'&&
  o.cadence==='MONTH_1'&&typeof o.version==='string'&&
  o.version==='pazo-supporter-live.beta20261021-v1'&&
  typeof o.exactCopy==='string'&&o.exactCopy.length>500&&
  typeof o.consentLabel==='string'&&o.consentLabel.length>30&&
  digest.test(o.termsDigest||'')
}
export function SupporterLiveCheckoutPanel({lang,onAvailabilityChange,availabilityRevision}:{lang:Locale;availabilityRevision?:string;onAvailabilityChange?:(phase:'loading'|'ready'|'blocked')=>void}){
 const [stage,setStage]=useState<Stage>('checking')
 const [offer,setOffer]=useState<Offer|null>(null)
 const [availabilityReason,setAvailabilityReason]=useState<AvailabilityReason>('general')
 const [accepted,setAccepted]=useState(false)
 const [revision,setRevision]=useState(0)
 const attempted=useRef(false)
 const active=useRef(true)
 const label=(es:string,en:string)=>lang==='es'?es:en
 useEffect(()=>{onAvailabilityChange?.(stage==='checking'?'loading':stage==='unavailable'?'blocked':'ready')},[stage,onAvailabilityChange])
 useEffect(()=>{
  active.current=true
  if(attempted.current)return()=>{active.current=false}
  setAccepted(false)
  setOffer(null)
  setStage('checking')
  const controller=new AbortController()
  void (async()=>{
   try{
    const config=privateConfig()
    const {data:{session},error}=await supabase.auth.getSession()
    if(error||!session?.access_token)throw Error('owner_auth_unavailable')
    const res=await fetch(HOST+'/functions/v1/pazo-paypal-live-checkout?locale='+lang,{
     method:'GET',headers:{apikey:config.key,authorization:'Bearer '+session.access_token,
      Accept:'application/json'},
     cache:'no-store',signal:controller.signal
    })
    const value=await res.json() as {code?:string;ready?:boolean;
     mayGrantBenefits?:boolean;offer?:unknown}
    if(active.current&&!controller.signal.aborted){
     const valid=res.status===200&&value.code==='live_checkout_ready'&&
      value.ready===true&&value.mayGrantBenefits===false&&
      published(value.offer,lang)
     setOffer(valid?value.offer as Offer:null)
     setAvailabilityReason(value.code==='live_origin_migration_required'?'origin':
      value.code==='checkout_admission_denied'?'canary':'general')
     setStage(valid?'ready':'unavailable')
    }
   }catch{if(active.current&&!controller.signal.aborted){setAvailabilityReason('general');setStage('unavailable')}}
  })()
  return ()=>{active.current=false;controller.abort()}
 },[lang,revision,availabilityRevision])
 const refresh=useCallback(()=>{
  if(attempted.current)return
  setRevision(x=>x+1)
 },[])
 const begin=async()=>{
  if(stage!=='ready'||!accepted||attempted.current||
   !published(offer,lang))return
  // This local request key is single-use. After any ambiguous provider/network
  // outcome we must NOT create another PayPal subscription on this screen.
  attempted.current=true
  setStage('submitting')
  try{
   const config=privateConfig()
   const {data:{session},error}=await supabase.auth.getSession()
   if(error||!session?.access_token)throw Error('owner_auth_unavailable')
   const key=crypto.randomUUID()
   const res=await fetch(HOST+'/functions/v1/pazo-paypal-live-checkout',{
    method:'POST',cache:'no-store',
    headers:{apikey:config.key,authorization:'Bearer '+session.access_token,
     'content-type':'application/json'},
    body:JSON.stringify({action:'subscribe',consent:{
     requestKey:key,locale:lang,termsVersion:offer.version,
     termsDigest:offer.termsDigest,affirmativeConsent:true}})
   })
   const data=await res.json() as {code?:string;phase?:string;
    approvalUrl?:unknown;entitlement?:boolean}
   const url=res.status===200&&data.code==='paypal_approval_required'&&
    data.phase==='APPROVAL_PENDING'&&data.entitlement===false
     ?approvalUrl(data.approvalUrl):null
   if(!url)throw Error('subscription_requires_reconciliation')
   window.location.assign(url)
  }catch{
   // PayPal or SQL may have acted before a timeout. Never automatically
   // reset the key or call CREATE again; keep the owner in review.
   if(active.current)setStage('review')
  }
 }
 return <section aria-label={label('Confirmar Amigo de PAZO','Confirm Friend of PAZO')}
  className="space-y-3 text-left" data-pazo-live-checkout="server-gated">
  {stage==='checking'&&<p role="status" className="text-center text-[12px] text-[#476862]">
   {label('Comprobando si las suscripciones están disponibles…',
    'Checking subscription availability…')}</p>}
  {stage==='unavailable'&&<div className="space-y-3 text-center">
   <p role="status" className="text-[12px] leading-relaxed text-[#526F63]">
    {availabilityReason==='origin'
      ?label('Estamos actualizando el dominio de regreso de PayPal. No se iniciará ningún cobro hasta comprobar la configuración.',
        'We are updating PayPal’s return domain. No payment will start until the configuration is verified.')
      :availabilityReason==='canary'
        ?label('No pudimos habilitar la compra para esta cuenta. Revisa tu sesión o contacta con soporte. PAZO sigue siendo gratis.',
          'Checkout is unavailable for this account. Check your session or contact support. PAZO remains free.')
        :label('Las suscripciones todavía no están disponibles. PAZO continúa siendo gratis.',
          'Subscriptions are not available yet. PAZO remains free.')}</p>
   <button type="button" onClick={refresh}
    className="min-h-11 rounded-full bg-[#EAF0DD] px-4 text-[13px] font-bold">
    {label('Comprobar disponibilidad','Check availability')}</button>
  </div>}
  {(stage==='ready'||stage==='submitting')&&published(offer,lang)&&<>
   <details className="rounded-[15px] bg-[#F4F6EF] px-3 py-1.5">
    <summary className="min-h-9 cursor-pointer py-2 text-[12px] font-semibold text-[#476862]">
     {label('Condiciones de la suscripción mensual','Monthly subscription terms')}</summary>
    <div className="max-h-[190px] space-y-2 overflow-y-auto px-1 pb-2 text-[12px] leading-[1.5] text-[#476862]">
     {offer.exactCopy.split('\n\n').map((p,i)=><p key={i}>{p}</p>)}
    </div>
   </details>
   <label className="flex cursor-pointer items-start gap-3 rounded-[15px] bg-[#F4F6EF] px-3 py-2.5 text-[12px] font-medium leading-snug">
    <input type="checkbox" checked={accepted} disabled={stage==='submitting'}
     onChange={e=>setAccepted(e.target.checked)}
     className="mt-1 h-5 w-5 shrink-0 accent-[#204E4A]"/>
    <span>{offer.consentLabel}</span>
   </label>
   <button type="button" disabled={!accepted||stage==='submitting'}
    onClick={()=>void begin()}
    className="min-h-12 w-full rounded-full bg-[#204E4A] px-4 py-3 text-[14px] font-bold text-white shadow-[0_5px_15px_rgba(32,78,74,0.12)] transition-colors hover:bg-[#2B615A] focus-visible:bg-[#2B615A] disabled:opacity-45">
    {stage==='submitting'
      ?label('Conectando con PayPal…','Connecting to PayPal…')
      :label('Continuar con PayPal','Continue with PayPal')}
   </button>
   <p className="text-center text-[11px] leading-relaxed text-[#526F63]">
    {label('Solo un pago confirmado y verificado activa tu membresía.',
     'Only a verified completed payment activates your membership.')}
   </p>
  </>}
  {stage==='review'&&<p role="alert" className="rounded-[16px] bg-[#FCE5D8] p-4 text-[12px] font-semibold leading-relaxed text-[#724927]">
   {label('El resultado del intento de PayPal necesita revisión. Por seguridad no iniciaremos una segunda suscripción. Consulta Administrar mi suscripción o contacta con soporte.',
    'The PayPal attempt needs verification. For safety, we will not start another subscription. Check Manage my subscription or contact support.')}
  </p>}
 </section>
}
