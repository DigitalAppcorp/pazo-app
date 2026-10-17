import {useCallback, useEffect, useState} from 'react'
import {supabase} from '../../services/supabaseClient'

// A public, derived pet-benefit RPC is the only available authority for F16
// Sandbox perks. Payment redirects, stored flags and PayPal ACTIVE are not proof.
const benefitsEnabled = import.meta.env.VITE_PAZO_F16_SUPPORTER_BENEFITS_ENABLED === 'true'
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const themes = new Set(['classic','nature','hearts','stars','adventure'])
export type SupporterStatus = {
  kind: 'checking' | 'verified' | 'inactive' | 'unavailable'
  milestone: 0 | 3 | 6 | 12
}
type Proof = {badge:boolean; milestone:0|3|6|12; theme:string|null}
const noStatus = (kind:SupporterStatus['kind']):SupporterStatus => ({kind,milestone:0})
function verifiedProof(raw: unknown): Proof | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const proof = raw as Partial<Proof>
  if(typeof proof.badge !== 'boolean' || ![0,3,6,12].includes(proof.milestone as number) ||
    !(proof.theme === null || (typeof proof.theme === 'string' && themes.has(proof.theme))) ||
    (!proof.badge && (proof.theme !== null || proof.milestone !== 0))) return null
  return proof as Proof
}

export function useSupporterMembershipStatus(petId?:string) {
  const [status,setStatus] = useState<SupporterStatus>(noStatus('checking'))
  const [revision,setRevision] = useState(0)
  const refresh = useCallback(() => setRevision(value => value + 1),[])
  useEffect(() => {
    let cancelled = false
    setStatus(noStatus('checking'))
    if (!benefitsEnabled) {
      setStatus(noStatus('inactive'))
      return () => {cancelled = true}
    }
    const read = async ():Promise<SupporterStatus> => {
      const {data:{user},error:authError} = await supabase.auth.getUser()
      if(authError || !UUID.test(user?.id || ''))throw Error('OWNER_UNVERIFIED')
      const query = supabase.from('pets').select('id').eq('owner_id',user!.id)
      const {data:pets,error:petError} = petId
        ? await query.eq('id',petId).limit(1)
        : await query.limit(101)
      if(petError || !Array.isArray(pets) || pets.length===0 ||
        pets.length>100 || pets.some(p=>!UUID.test(p?.id || '')) ||
        (petId && pets[0]?.id!==petId))throw Error('PETS_UNVERIFIED')
      let milestone:0|3|6|12 = 0
      let active = false
      for(const pet of pets) {
        const {data,error} = await supabase.rpc('pazo_supporter_public_pet_benefits',{p_pet_id:pet.id})
        const proof = verifiedProof(data)
        if(error || !proof)throw Error('COVERAGE_UNVERIFIED')
        if(proof.badge) {active=true; milestone=Math.max(milestone,proof.milestone) as 0|3|6|12}
      }
      return active ? {kind:'verified',milestone} : noStatus('inactive')
    }
    void read().then(value => {if(!cancelled)setStatus(value)})
      .catch(() => {if(!cancelled)setStatus(noStatus('unavailable'))})
    return () => {cancelled=true}
  },[petId,revision])
  return {status,refresh}
}
