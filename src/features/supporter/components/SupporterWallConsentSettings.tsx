import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../../services/supabaseClient'

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

  const button = 'min-h-11 rounded-full bg-[#E1E53F]/75 px-4 py-2.5 text-[13px] font-bold text-[#204E4A] hover:bg-[#E1E53F] disabled:opacity-50'
  return <section aria-labelledby="supporter-consent-title" className="space-y-3 rounded-3xl bg-white p-5 shadow-sm">
    <h3 id="supporter-consent-title" className="text-lg font-black">
      {label('Participar en el muro de agradecimiento','Join the gratitude wall')}
    </h3>
    <p className="text-[13px] leading-relaxed text-[#476862]">
      {label(
        'La inscripción nunca es automática. Solo las mascotas que autorices y tengan cobertura pagada verificada podrán mostrarse públicamente. Puedes retirar un permiso cuando quieras, incluso después de cancelar.',
        'Opt-in is never automatic. Only pets you authorize with verified paid coverage can appear publicly. You can withdraw consent anytime, including after cancellation.'
      )}
    </p>
    {loading && <p role="status" className="text-sm">{label('Consultando permisos…','Checking permissions…')}</p>}
    {error && <div role="alert" className="space-y-2 rounded-2xl bg-[#FCE5D8] p-3 text-sm">
      <p>{error}</p><button type="button" className={button} disabled={loading||!!pendingId}
        onClick={()=>void refresh()}>{label('Actualizar permisos','Refresh permissions')}</button>
    </div>}
    {ready && pets.length===0 && <p role="status" className="text-sm">
      {label('No hay mascotas propias disponibles.','No owned pets available.')}
    </p>}
    {ready && pets.map(pet=>{
      const granted=optedIn.includes(pet.id)
      const confirming=confirmId===pet.id
      return <div key={pet.id} className="space-y-3 rounded-2xl bg-[#F8F5EC] p-4">
        <div className="flex items-center gap-3">
          {pet.photo_url && <img src={pet.photo_url} alt="" className="h-12 w-12 rounded-full object-cover"/>}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-black">{pet.name}</p>
            <p className="text-xs text-[#5C7470]">
              {granted ? label('Permiso registrado','Consent recorded')
                : label('Sin autorización para el muro','Not authorized for the wall')}
            </p>
          </div>
        </div>
        {granted
          ? <button className={button} type="button" disabled={!!pendingId}
              onClick={()=>void change(pet.id,false)}>
              {label('Retirar permiso','Withdraw consent')}
            </button>
          : confirming ? <div className="space-y-3">
            <p className="text-[13px] leading-relaxed text-[#476862]">
              {label(
                'Si aceptas, el nombre, foto pública e insignia Amigo de PAZO de esta mascota podrán aparecer en el muro, visible incluso sin iniciar sesión. No mostraremos datos personales, correo ni pagos. Retirar el permiso quita la mascota del muro de PAZO, pero no borra capturas ajenas.',
                'If you opt in, this pet’s name, public photo and PAZO Friend badge may appear on a wall visible even to signed-out visitors. We never show personal details, email or payments. Withdrawal removes your pet from PAZO’s wall, not third-party screenshots.'
              )}
            </p>
            <div className="flex flex-wrap gap-2">
              <button className={button} type="button" disabled={!!pendingId}
                onClick={()=>void change(pet.id,true)}>{label('Sí, autorizar','Yes, opt in')}</button>
              <button className={button} type="button" disabled={!!pendingId}
                onClick={()=>setConfirmId(null)}>{label('Ahora no','Not now')}</button>
            </div>
          </div>
          : <button className={button} type="button" disabled={!!pendingId}
              onClick={()=>setConfirmId(pet.id)}>
              {label('Revisar y autorizar','Review and authorize')}
            </button>
        }
      </div>
    })}
  </section>
}
