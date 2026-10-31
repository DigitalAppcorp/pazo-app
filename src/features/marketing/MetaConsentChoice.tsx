import {useState} from 'react'
import type {ReactNode} from 'react'

// #169 DESIGN CANDIDATE — not imported or rendered anywhere in PAZO.
// Present only after a fresh server-verified registration, once the
// authenticated server grant path, notice, revocation and privacy review
// pass release gates. Never treat this checkbox as trusted storage.
interface Props {
  lang:'es'|'en'
  onGrant:()=>Promise<boolean>
  onContinue:()=>void
  onPrivacy:()=>void
  busy?:boolean
}
const COPY={
 es:{
  title:'Tu privacidad, tu decisión',
  description:'¿Permites que PAZO comparta con Meta la confirmación de tu registro para medir nuestros anuncios? Meta podría recibir identificadores técnicos y datos de coincidencia autorizados, además de la señal de registro.',
  toggle:'Sí, permito esta medición con Meta.',
  link:'Ver cómo se usan mis datos',
  grant:'Permitir medición',
  continue:'Continuar sin permitirlo',
  blocked:'Tu navegador solicita no compartir datos para publicidad. Respetaremos esa preferencia.',
  error:'No se pudo guardar tu elección. Puedes continuar sin permitirlo.',
  optional:'Es opcional. PAZO funciona de la misma manera si no lo permites.',
 },
 en:{
  title:'Your privacy, your choice',
  description:'Do you allow PAZO to share your confirmed registration with Meta to measure our ads? Meta may receive technical identifiers and approved matching data as well as the registration signal.',
  toggle:'Yes, I allow this measurement with Meta.',
  link:'How my data may be used',
  grant:'Allow measurement',
  continue:'Continue without allowing',
  blocked:'Your browser asks websites not to share data for advertising. We will respect that preference.',
  error:'We could not save your choice. You can continue without allowing.',
  optional:'This is optional. PAZO works the same way if you do not allow it.',
 },
} as const
export const META_CHOICES_RELEASED=false
export function MetaConsentChoice({lang,onGrant,onContinue,onPrivacy,busy=false}:Props):ReactNode{
 const [selected,setSelected]=useState(false)
 const [saving,setSaving]=useState(false)
 const [failed,setFailed]=useState(false)
 const gpc=typeof navigator!=='undefined' &&
   (navigator as Navigator&{globalPrivacyControl?:boolean}).globalPrivacyControl===true
 const t=COPY[lang]
 const disabled=busy||saving
 const accept=async()=>{
  if(disabled||!selected||gpc)return
  setSaving(true);setFailed(false)
  try{if(await onGrant()===true){onContinue();return}}
  catch{/* no conversion or grant on failure */}
  setFailed(true);setSaving(false)
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
   {gpc ? <p role="status" className="my-3 text-[15px]">{t.blocked}</p> :
    <label className="my-3 flex min-h-12 items-center gap-3 rounded-2xl bg-[#F1F6F2] px-3 py-3 text-[15px] font-semibold">
     <input type="checkbox" checked={selected} disabled={disabled}
      onChange={e=>setSelected(e.currentTarget.checked)}
      className="h-5 w-5 accent-[#204E4A]"/>
     <span>{t.toggle}</span>
    </label>}
   {failed && <p role="alert" className="my-2 text-[15px]">{t.error}</p>}
   {!gpc && <button type="button" disabled={disabled||!selected}
     onClick={()=>{void accept()}}
     className="mt-2 min-h-12 w-full rounded-full bg-[#204E4A] px-5 text-[16px] font-bold text-white disabled:opacity-40">
     {t.grant}
   </button>}
   <button type="button" onClick={onContinue} disabled={disabled}
    className="mt-3 min-h-12 w-full rounded-full bg-[#E1E53F] px-5 text-[16px] font-bold text-[#204E4A] disabled:opacity-40">
    {t.continue}
   </button>
  </section>
 )
}
