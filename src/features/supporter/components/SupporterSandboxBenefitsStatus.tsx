import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../../services/supabaseClient'
import { SupporterBadge } from './SupporterBadge'

// This is the ACTUAL PAZO account screen reading actual server RPCs, NOT a
// local preview or browser-injected membership. Development QA only.
// The backend remains the sole source of truth for every benefit.
type CheckedPet = {
  id: string
  name: string
  badge: boolean
  milestone: 0 | 3 | 6 | 12
  theme: string | null
  wallConsented: boolean
  inPublicWall: boolean
}
type Props = { lang:'es'|'en' }
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const themes=new Set(['classic','nature','hearts','stars','adventure'])
function checkPublicResponse(value:unknown) {
  if(!value || typeof value!=='object' || Array.isArray(value))return null
  const r=value as Record<string,unknown>
  if(typeof r.badge!=='boolean' || ![0,3,6,12].includes(r.milestone as number) ||
    !(r.theme===null||(typeof r.theme==='string'&&themes.has(r.theme)))||
    (!r.badge && (r.milestone!==0||r.theme!==null)))return null
  return r as {badge:boolean;milestone:0|3|6|12;theme:string|null}
}

export function SupporterSandboxBenefitsStatus({lang}:Props) {
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState(false)
  const [pets,setPets]=useState<CheckedPet[]>([])
  const t=(es:string,en:string)=>lang==='es'?es:en
  const refresh=useCallback(async()=>{
    setLoading(true);setError(false);setPets([])
    try {
      const {data:{user},error:authError}=await supabase.auth.getUser()
      if(authError||!UUID.test(user?.id||''))throw Error('NO_TEST_OWNER')
      const [owned,consent,wall]=await Promise.all([
        supabase.from('pets').select('id,name').eq('owner_id',user!.id).limit(8),
        supabase.rpc('pazo_wall_my_consents'),
        supabase.rpc('pazo_supporter_public_wall',{p_limit:48}),
      ])
      if(owned.error||consent.error||wall.error ||
        !Array.isArray(owned.data)||!Array.isArray(consent.data)||
        !Array.isArray(wall.data)||owned.data.length>8||wall.data.length>48)
        throw Error('SERVER_READ_UNAVAILABLE')
      const opted=new Set<string>(),listed=new Set<string>()
      for(const row of consent.data){
        if(!UUID.test(row?.pet_id||'')||typeof row?.opted_in!=='boolean')
          throw Error('INVALID_CONSENT_DATA')
        if(row.opted_in)opted.add(row.pet_id)
      }
      for(const row of wall.data){
        if(!UUID.test(row?.pet_id||''))throw Error('INVALID_PUBLIC_WALL_DATA')
        listed.add(row.pet_id)
      }
      const checked:CheckedPet[]=[]
      for(const pet of owned.data) {
        if(!UUID.test(pet?.id||'')||typeof pet?.name!=='string')
          throw Error('INVALID_OWNED_PET')
        const {data,error:proofError}=await supabase.rpc('pazo_supporter_public_pet_benefits',{
          p_pet_id:pet.id,
        })
        const proof=checkPublicResponse(data)
        if(proofError||!proof)throw Error('INVALID_PAID_COVERAGE')
        if(listed.has(pet.id) && (!opted.has(pet.id)||!proof.badge))
          throw Error('PUBLIC_WALL_CONTRADICTS_PRIVATE_STATUS')
        checked.push({
          id:pet.id,name:pet.name,badge:proof.badge,
          milestone:proof.milestone,theme:proof.theme,
          wallConsented:opted.has(pet.id),inPublicWall:listed.has(pet.id),
        })
      }
      setPets(checked)
    }catch{setError(true)}
    finally{setLoading(false)}
  },[])
  useEffect(()=>{void refresh()},[refresh])
  const yes=(value:boolean)=>value?t('Sí','Yes'):t('No','No')
  return <section className="space-y-3 rounded-[24px] bg-[#E8EFEB] p-4 text-[#204E4A]"
    aria-labelledby="sandbox-four-benefits-status">
    <h3 id="sandbox-four-benefits-status" className="text-[16px] font-black">
      {t('Verificación de beneficios Sandbox','Sandbox benefit verification')}
    </h3>
    <p className="text-[12px] font-medium leading-relaxed text-[#476862]">
      {t('Solo laboratorio. El regreso de PayPal no concede beneficios; aquí se consulta el estado real del servidor.',
        'Lab only. Returning from PayPal never grants benefits; this reads actual server state.')}
    </p>
    <button type="button" disabled={loading} onClick={()=>void refresh()}
      className="min-h-11 rounded-full bg-[#204E4A] px-4 py-2 text-[13px] font-bold text-white disabled:opacity-40">
      {t('Actualizar verificación','Refresh verification')}
    </button>
    {loading&&<p role="status">{t('Consultando servidor…','Reading server…')}</p>}
    {error&&<p role="alert" className="rounded-2xl bg-[#FCE5D8] p-3 text-[13px]">
      {t('No se pudo verificar el estado. No se muestra ninguna recompensa.',
        'Unable to verify status. No rewards are displayed.')}
    </p>}
    {!loading&&!error&&pets.length===0&&<p role="status">
      {t('Esta cuenta de prueba no tiene mascotas para verificar.','This test account has no pets to verify.')}
    </p>}
    {!loading&&!error&&pets.map(pet=><article key={pet.id} className="rounded-[20px] bg-white p-4">
      <div className="flex items-center gap-2">
        {pet.badge&&<SupporterBadge active milestone={pet.milestone} lang={lang} />}
        <h4 className="min-w-0 break-words font-extrabold">{pet.name}</h4>
      </div>
      <p className="mt-1 text-[12px]">{t('Período pagado verificado: ','Verified paid period: ')}{yes(pet.badge)}</p>
      <p className="text-[12px]">{t('Fondo guardado: ','Saved theme: ')}{pet.theme||t('Original','Original')}</p>
      <p className="text-[12px]">{t('Permiso de muro: ','Wall consent: ')}{yes(pet.wallConsented)}</p>
      <p className="text-[12px]">{t('Visible en muro: ','Visible on wall: ')}{yes(pet.inPublicWall)}</p>
      <p className="text-[12px]">{t('Medalla completada: ','Completed medal: ')}{pet.milestone ? pet.milestone+' '+t('meses','months') : t('Todavía ninguna','None yet')}</p>
    </article>)}
  </section>
}
