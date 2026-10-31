import {useEffect,useRef,useState} from 'react'
import type {ReactNode} from 'react'

// #169 DESIGN CANDIDATE — never imported, rendered or served by live PAZO.
// Requires the separately released first-party withdrawal endpoint. Browser
// preferences alone do not prove server persistence or release to Meta.
// Legal/Design OS review and PO approval required before any publication.
interface Props {
  lang:'es'|'en'
  onGrant:()=>Promise<boolean>
  onWithdraw:()=>Promise<boolean>
  onContinue:()=>void
  onPrivacy:()=>void
  busy?:boolean
}
const COPY={
 es:{
  title:'Tú decides qué compartir',
  description:'¿Nos permites informar a Meta que confirmaste tu cuenta para saber si nuestros anuncios funcionan? Si aceptas, Meta podría recibir esa señal y datos técnicos, como tu dirección IP y navegador. También podría usar información derivada de tu correo para reconocer el registro. Consulta los detalles antes de decidir.',
  toggle:'Sí, permito medir mi registro con Meta.',
  link:'Cómo se usarían mis datos',
  grant:'Permitir medición',
  continue:'Continuar sin permitirlo',
  blocked:'Tu navegador solicita no compartir datos para publicidad. No activaremos esta medición.',
  syncSaved:'Tu preferencia de no compartir quedó guardada en PAZO.',
  syncPending:'Guardando tu preferencia en PAZO…',
  syncError:'No pudimos confirmar tu preferencia en el servidor. No activaremos la medición. Puedes reintentar.',
  retry:'Reintentar guardar',
  error:'No se pudo guardar el permiso. Puedes continuar sin permitirlo.',
  optional:'Es opcional. Todas las herramientas de PAZO funcionan sin esta medición.',
 },
 en:{
  title:'You decide what to share',
  description:'May PAZO tell Meta you confirmed your account so we can measure our ads? If you agree, Meta may receive that event and technical data such as your IP address and browser. It may also use information derived from your email to recognize the registration. Review the details before deciding.',
  toggle:'Yes, I allow Meta to measure my registration.',
  link:'How my data may be used',
  grant:'Allow measurement',
  continue:'Continue without allowing',
  blocked:'Your browser requests no advertising data sharing. This measurement will not be enabled.',
  syncSaved:'Your do-not-share preference has been saved in PAZO.',
  syncPending:'Saving your preference in PAZO…',
  syncError:'We could not confirm your preference on the server. We will not enable measurement. You can retry.',
  retry:'Retry saving',
  error:'We could not save permission. You can continue without allowing.',
  optional:'Optional. All PAZO tools work without this measurement.',
 },
} as const
export const META_CHOICES_RELEASED=false

export function MetaConsentChoice({
 lang,onGrant,onWithdraw,onContinue,onPrivacy,busy=false,
}:Props):ReactNode{
 const [selected,setSelected]=useState(false)
 const [saving,setSaving]=useState(false)
 const [failed,setFailed]=useState(false)
 const [gpcState,setGpcState]=useState<'idle'|'saving'|'saved'|'error'>('idle')
 const gpcRequest=useRef<Promise<boolean>|null>(null)
 const gpc=typeof navigator!=='undefined' &&
   (navigator as Navigator&{globalPrivacyControl?:boolean}).globalPrivacyControl===true
 const t=COPY[lang]
 const disabled=busy||saving

 const persistWithdrawal=()=>{
  try{return Promise.resolve(onWithdraw()).then(value=>value===true).catch(()=>false)}
  catch{return Promise.resolve(false)}
 }
 // Not a Meta event. This is a first-party opt-out-only request, made even
 // when grant/Pixel/CAPI are OFF. Never claim it succeeded until confirmed.
 // Promise reuse keeps React Strict Mode effect replay idempotent.
 useEffect(()=>{
  if(!gpc)return
  if(!gpcRequest.current)gpcRequest.current=persistWithdrawal()
  let active=true
  setGpcState('saving')
  void gpcRequest.current.then(saved=>{
   if(active)setGpcState(saved?'saved':'error')
  })
  return ()=>{active=false}
 },[gpc,onWithdraw])

 const retryWithdrawal=()=>{
  if(!gpc||gpcState==='saving')return
  gpcRequest.current=persistWithdrawal()
  setGpcState('saving')
  void gpcRequest.current.then(saved=>setGpcState(saved?'saved':'error'))
 }

 const accept=async()=>{
  if(disabled||!selected||gpc)return
  setSaving(true);setFailed(false)
  try{if(await onGrant()===true){onContinue();return}}
  catch{/* Unconfirmed permission cannot authorize any Meta request. */}
  setFailed(true);setSaving(false)
 }
 const continueWithoutSharing=()=>{
  // Declining this new optional invitation is NOT a permanent withdrawal
  // of an earlier grant. With no affirmative grant, no Meta transfer is
  // authorized. A GPC signal IS an opt-out and must reach the server.
  // Failure never blocks the underlying PAZO account or QR tools.
  if(gpc&&gpcState==='error')void persistWithdrawal()
  onContinue()
 }
 return (
  <section aria-labelledby="meta-consent-title"
   className="mx-auto w-full max-w-md rounded-3xl bg-white p-5 text-[#204E4A]">
   <h2 id="meta-consent-title" className="text-xl font-extrabold leading-snug">{t.title}</h2>
   <p className="mt-3 text-[15px] leading-relaxed">{t.description}</p>
   <p className="mt-3 text-[15px] font-medium">{t.optional}</p>
   <button type="button" onClick={onPrivacy} disabled={disabled}
    className="my-3 min-h-11 text-[15px] font-semibold underline underline-offset-4 focus-visible:bg-[#E1E53F]">
    {t.link}
   </button>
   {gpc ? <>
    <p role="status" className="my-3 text-[15px]">{t.blocked}</p>
    {gpcState!=='idle'&&<p role={gpcState==='error'?'alert':'status'}
      className="mb-3 text-[15px] leading-relaxed">
      {gpcState==='saved'?t.syncSaved:gpcState==='error'?t.syncError:t.syncPending}
    </p>}
    {gpcState==='error'&&<button type="button" onClick={retryWithdrawal}
      className="min-h-11 text-[15px] font-semibold underline underline-offset-4 focus-visible:bg-[#E1E53F]">
      {t.retry}
    </button>}
   </> :
    <label className="my-3 flex min-h-12 items-center gap-3 rounded-2xl bg-[#F1F6F2] px-3 py-3 text-[15px] font-semibold">
     <input type="checkbox" checked={selected} disabled={disabled}
      onChange={e=>setSelected(e.currentTarget.checked)}
      className="h-5 w-5 accent-[#204E4A] focus-visible:shadow-[0_0_0_4px_#204E4A]"/>
     <span>{t.toggle}</span>
    </label>}
   {failed && <p role="alert" className="my-2 text-[15px]">{t.error}</p>}
   {!gpc && <button type="button" disabled={disabled||!selected}
     onClick={()=>{void accept()}}
     className="mt-2 min-h-12 w-full rounded-full bg-[#204E4A] px-5 text-[16px] font-bold text-white disabled:opacity-40 focus-visible:shadow-[0_0_0_4px_#E1E53F] focus-visible:underline focus-visible:underline-offset-4">
     {t.grant}
   </button>}
   <button type="button" onClick={continueWithoutSharing} disabled={disabled}
    className="mt-3 min-h-12 w-full rounded-full bg-[#E1E53F] px-5 text-[16px] font-bold text-[#204E4A] disabled:opacity-40 focus-visible:shadow-[0_0_0_4px_#204E4A] focus-visible:underline focus-visible:underline-offset-4">
    {t.continue}
   </button>
  </section>
 )
}
