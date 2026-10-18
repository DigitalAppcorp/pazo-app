import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../../services/supabaseClient'
import {IconHeart,IconPaw} from '../../../components/icons/PazoIcons'
import {GratitudeWallLive} from './GratitudeWallLive'

type OwnedPet = { id: string; name: string; photo_url: string | null }
type Consent = { pet_id: string; opted_in: boolean }
type Props = { lang: 'es' | 'en' }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const NOTICE = 'wall_consent_v1'

/**
 * Live owner-only consent management. Supabase remains the authority:
 * pazo_wall_consent_enable verifies auth.uid(), ownership and paid eligibility;
 * pazo_wall_consent_disable is authorized independently of paid status so a
 * cancelling/former supporter can always withdraw an existing consent.
 * This UI never grants or infers a supporter entitlement.
 */
export function SupporterWallConsentSettings({ lang }: Props) {
  const [pets, setPets] = useState<OwnedPet[]>([])
  const [optedIn, setOptedIn] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  const [showPublicWall,setShowPublicWall]=useState(false)
  const isEs = lang === 'es'
  const label = (es: string, en: string) => isEs ? es : en

  const refresh = useCallback(async () => {
    setLoading(true)
    setReady(false)
    setError(null)
    try {
      // Don't trust local pet IDs, PayPal redirects or checkout state.
      const {data: {user},error: authError} = await supabase.auth.getUser()
      if (authError || !user || !UUID.test(user.id)) throw Error('AUTH_REQUIRED')
      const [petResponse, consentResponse] = await Promise.all([
        supabase.from('pets').select('id,name,photo_url').eq('owner_id',user.id).limit(100),
        supabase.rpc('pazo_wall_my_consents'),
      ])
      if (petResponse.error || consentResponse.error) throw Error('READ_FAILED')
      const owned = petResponse.data || []
      const consents = consentResponse.data || []
      if (!Array.isArray(owned) || !Array.isArray(consents) ||
          owned.some(p=>!UUID.test(p.id) || typeof p.name!=='string' ||
            p.name.length>160 || (p.photo_url !== null && typeof p.photo_url!=='string')) ||
          consents.some(c=>!UUID.test(c.pet_id) || typeof c.opted_in!=='boolean')) {
        throw Error('DATA_INVALID')
      }
      const ownedIds = new Set(owned.map(p=>p.id))
      setPets(owned)
      setOptedIn(consents.filter(c=>c.opted_in && ownedIds.has(c.pet_id)).map(c=>c.pet_id))
      setReady(true)
    } catch {
      setPets([])
      setOptedIn([])
      setError(label('No pudimos consultar los permisos. Inténtalo de nuevo.',
        'Could not verify permissions. Try again.'))
    } finally {
      setLoading(false)
    }
  }, [lang])

  useEffect(()=>{ void refresh() },[refresh])

  const change = async (petId: string, allow: boolean) => {
    if (!ready || pendingId || !UUID.test(petId) || !pets.some(p=>p.id===petId)) return
    if (allow && confirmId!==petId) return
    setPendingId(petId)
    setError(null)
    try {
      // Backend security-definer RPC checks the authenticated owner. The
      // "enable" RPC also requires a verified supporter entitlement.
      const {data,error: rpcError} = allow
        ? await supabase.rpc('pazo_wall_consent_enable',
          {p_pet_id:petId,p_notice_version:NOTICE})
        : await supabase.rpc('pazo_wall_consent_disable',{p_pet_id:petId})
      if (rpcError || data!==true) throw Error('SERVER_NOT_CONFIRMED')
      const {data: latest,error: verifyError} = await supabase.rpc('pazo_wall_my_consents')
      if (verifyError || !Array.isArray(latest)) throw Error('RECHECK_FAILED')
      const row=(latest as Consent[]).find(c=>c.pet_id===petId)
      const verified = row?.opted_in===true
      if (verified!==allow) throw Error('SERVER_STATE_MISMATCH')
      setOptedIn(previous=>allow
        ? [...new Set([...previous,petId])]
        : previous.filter(id=>id!==petId))
      setConfirmId(null)
    } catch {
      setError(label(
        allow
          ? 'No se pudo confirmar tu membresía ni guardar el permiso. Ninguna mascota se añadirá por esta operación.'
          : 'No se pudo confirmar la retirada. Vuelve a consultar los permisos antes de continuar.',
        allow
          ? 'Membership or consent could not be verified. No pet is added by this action.'
          : 'Withdrawal could not be confirmed. Refresh permissions before continuing.'
      ))
      setReady(false)
    } finally {
      setPendingId(null)
    }
  }

  const button = 'min-h-11 rounded-full bg-[#E1E53F] px-5 py-2.5 text-[12px] font-extrabold text-[#204E4A] transition-colors hover:bg-[#F0F27C] focus-visible:bg-[#E9EF8A] disabled:opacity-50'
  return <section aria-labelledby="supporter-consent-title" className="space-y-5 pb-4">
    <div className="flex flex-col items-center px-3 pt-3 text-center">
      <span aria-hidden="true" className="flex h-[70px] w-[70px] items-center justify-center rounded-full bg-[#F3E8DD] text-[#204E4A]">
        <IconHeart filled size={35}/>
      </span>
      <h3 id="supporter-consent-title" className="mt-4 max-w-[320px] text-[23px] font-black leading-tight">
        {label('Ellos también son parte de PAZO','They are part of PAZO too')}
      </h3>
      <p className="mt-3 max-w-[35ch] text-[13px] leading-relaxed text-[#5C7470]">
        {label('Tú eliges qué mascotas aparecen en nuestro muro. Puedes retirar el permiso cuando quieras.',
          'You choose which pets appear on our wall. Withdraw permission whenever you want.')}
      </p>
    </div>
    {loading&&<p role="status" className="rounded-[22px] bg-white p-4 text-center text-[12px]">
      {label('Consultando permisos…','Checking permissions…')}
    </p>}
    {error&&<div role="alert" className="space-y-3 rounded-[22px] bg-[#FCE5D8] p-4 text-[12px]">
      <p>{error}</p>
      <button type="button" className={button} disabled={loading||!!pendingId} onClick={()=>void refresh()}>
        {label('Actualizar permisos','Refresh permissions')}
      </button>
    </div>}
    {ready&&pets.length===0&&<p role="status" className="rounded-[23px] bg-white p-5 text-center text-[13px] text-[#476862]">
      {label('Aún no tienes mascotas para mostrar en el muro.','You do not have any pets to show on the wall yet.')}
    </p>}
    {ready&&pets.map(pet=>{
      const granted=optedIn.includes(pet.id)
      const confirming=confirmId===pet.id
      return <article key={pet.id} className="space-y-4 rounded-[27px] bg-white p-4 shadow-[0_5px_22px_rgba(32,78,74,0.04)]">
        <div className="flex items-center gap-3">
          <span className="flex h-[67px] w-[67px] shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#E9EFE6]">
            {pet.photo_url
              ?<img src={pet.photo_url} alt="" className="h-full w-full object-cover"/>
              :<IconPaw size={31} className="text-[#204E4A]/45"/>}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[17px] font-black text-[#204E4A]">{pet.name}</p>
            <p role="status" className="mt-1 flex items-center gap-2 text-[12px] text-[#5C7470]">
              <span aria-hidden="true" className={'h-2 w-2 shrink-0 rounded-full '+(granted?'bg-[#6E9E75]':'bg-[#C6CDBB]')}/>
              {granted?label('Visible en el muro','Visible on the wall'):
                label('No aparece en el muro','Not shown on the wall')}
            </p>
          </div>
        </div>
        {granted
          ? <button className="min-h-11 w-full rounded-full bg-[#EFF2EA] px-4 py-3 text-[12px] font-black text-[#204E4A] hover:bg-[#E5EBD8] focus-visible:bg-[#E1E53F]/35" type="button"
              disabled={!!pendingId} onClick={()=>void change(pet.id,false)}>
              {pendingId===pet.id?label('Actualizando permiso…','Updating permission…'):
                label('Retirar del muro','Remove from wall')}
            </button>
          : confirming ? <div className="space-y-4 rounded-[20px] bg-[#F8F5EC] p-4">
            <p className="text-[12px] leading-relaxed text-[#476862]">
              {label('Al autorizar, el nombre, foto pública e insignia Amigo de PAZO de esta mascota podrán aparecer en un muro visible sin iniciar sesión. Nunca se mostrarán tu correo ni datos de pago. Podrás retirar el permiso cuando quieras; las capturas ajenas no se pueden borrar.',
                'When you opt in, this pet’s name, public photo and PAZO Friend badge may appear on a wall visible without signing in. Your email and payment data will not be shown. You can withdraw at any time; third-party screenshots cannot be removed.')}
            </p>
            <div className="flex flex-wrap gap-2">
              <button className={button} type="button" disabled={!!pendingId}
                onClick={()=>void change(pet.id,true)}>{label('Sí, autorizar','Yes, opt in')}</button>
              <button className="min-h-11 rounded-full bg-white px-5 py-2.5 text-[12px] font-bold text-[#204E4A] hover:bg-[#EFF3E7] focus-visible:bg-[#E1E53F]/35" type="button" disabled={!!pendingId}
                onClick={()=>setConfirmId(null)}>{label('Ahora no','Not now')}</button>
            </div>
          </div>
          : <button className={button+' w-full'} type="button" disabled={!!pendingId}
              onClick={()=>setConfirmId(pet.id)}>
              {label('Revisar y autorizar','Review and authorize')}
            </button>}
      </article>
    })}
    <button type="button" onClick={()=>setShowPublicWall(true)}
      className="min-h-12 w-full rounded-full bg-[#E8EEDD] px-4 py-3 text-[13px] font-black text-[#204E4A] hover:bg-[#DFE9D0] focus-visible:bg-[#E1E53F]/40">
      {label('Conocer el muro público','View the public wall')}
      <span aria-hidden="true" className="ml-2">›</span>
    </button>
    {showPublicWall&&<div className="fixed inset-0 z-[120] bg-[#FAF8F5]">
      <GratitudeWallLive lang={lang} onClose={()=>setShowPublicWall(false)}/>
    </div>}
  </section>
}
