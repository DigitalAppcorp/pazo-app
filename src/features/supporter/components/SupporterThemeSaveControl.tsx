import { useEffect, useRef, useState } from 'react'
import { supabase } from '../../../services/supabaseClient'
import type { SupporterProfileThemeSelection } from './SupporterProfileThemes'

type Props = {
  petId: string
  selectedTheme: SupporterProfileThemeSelection
  lang: 'es' | 'en'
  onLoaded: (theme: SupporterProfileThemeSelection) => void
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const ids = new Set(['classic','nature','hearts','stars','adventure'])
type PublicState = { badge: boolean; theme: string | null; milestone: number }

function parseState(raw: unknown): PublicState | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const r = raw as Partial<PublicState>
  if (typeof r.badge !== 'boolean' ||
      (r.theme !== null && (typeof r.theme !== 'string' || !ids.has(r.theme))) ||
      ![0,3,6,12].includes(r.milestone as number)) return null
  // Backend must never claim saved cosmetics without verified coverage.
  if (!r.badge && (r.theme !== null || r.milestone !== 0)) return null
  return r as PublicState
}

export function SupporterThemeSaveControl({petId, selectedTheme, lang, onLoaded}:Props) {
  const [current, setCurrent] = useState<SupporterProfileThemeSelection>(null)
  const [eligible, setEligible] = useState(false)
  const [busy, setBusy] = useState(true)
  const [error, setError] = useState(false)
  const [saved, setSaved] = useState(false)
  const callbackRef = useRef(onLoaded)
  useEffect(()=>{ callbackRef.current=onLoaded },[onLoaded])
  const isEs=lang==='es'
  const label=(es:string,en:string)=>isEs?es:en

  const read = async () => {
    if (!UUID.test(petId)) throw Error('PET_ID_INVALID')
    const [{data:{user},error: authError},petResult] = await Promise.all([
      supabase.auth.getUser(),
      supabase.from('pets').select('owner_id').eq('id',petId).maybeSingle(),
    ])
    if (authError || !user || petResult.error || petResult.data?.owner_id!==user.id)
      throw Error('AUTH_OWNERSHIP_REQUIRED')
    const {data,error: readError}=await supabase.rpc('pazo_supporter_public_pet_benefits',{
      p_pet_id:petId,
    })
    const state=parseState(data)
    if (readError || !state) throw Error('SERVER_PROOF_UNAVAILABLE')
    return state
  }

  useEffect(()=>{
    let mounted=true
    setBusy(true);setError(false);setEligible(false);setSaved(false)
    void read().then(state=>{
      if (!mounted) return
      setEligible(state.badge)
      setCurrent(state.theme as SupporterProfileThemeSelection)
      callbackRef.current(state.theme as SupporterProfileThemeSelection)
    }).catch(()=>{if(mounted)setError(true)})
      .finally(()=>{if(mounted)setBusy(false)})
    return ()=>{mounted=false}
  },[petId])

  const save = async () => {
    if (busy || error || (!eligible && selectedTheme!==null)) return
    setBusy(true);setSaved(false);setError(false)
    try {
      const before=await read()
      if (!before.badge && selectedTheme!==null) throw Error('NOT_ELIGIBLE')
      const {data,error: writeError}=await supabase.rpc('pazo_supporter_set_pet_theme',{
        p_pet_id:petId,p_theme:selectedTheme,
      })
      if (writeError || data!==true) throw Error('SERVER_WRITE_DENIED')
      const after=await read()
      if (after.theme!==selectedTheme) throw Error('SERVER_POSTFLIGHT_MISMATCH')
      setCurrent(after.theme as SupporterProfileThemeSelection)
      setEligible(after.badge)
      setSaved(true)
    } catch {
      setError(true)
    } finally {setBusy(false)}
  }
  const changed=selectedTheme!==current
  return <section className="space-y-2 rounded-[20px] bg-white/95 px-4 py-4 shadow-sm"
    aria-label={label('Guardar fondo de la mascota','Save pet background')}>
    {busy && <p role="status" className="text-[12px] text-[#5C7470]">
      {label('Verificando tu perfil…','Verifying your profile…')}
    </p>}
    {!busy && !error && !eligible && <p role="status" className="text-[12px] text-[#5C7470]">
      {label('Puedes explorar los fondos. Para guardar uno exclusivo necesitas una mensualidad verificada.',
        'You can preview backgrounds. A verified paid month is required to save an exclusive one.')}
    </p>}
    {error && <p role="alert" className="text-[12px] text-[#9F472E]">
      {label('No se pudo confirmar el cambio. Tu perfil conservará su diseño anterior.',
        'The change could not be confirmed. Your profile keeps its previous design.')}
    </p>}
    {saved && <p role="status" className="text-[12px] font-bold text-[#204E4A]">
      {label('Fondo guardado y confirmado en PAZO.','Background saved and verified by PAZO.')}
    </p>}
    <button type="button" onClick={()=>void save()}
      disabled={busy || error || !changed || (!eligible && selectedTheme!==null)}
      className="min-h-11 rounded-full bg-[#204E4A] px-5 py-3 text-[13px] font-bold text-white disabled:opacity-40">
      {label('Guardar para mi mascota','Save for my pet')}
    </button>
  </section>
}
