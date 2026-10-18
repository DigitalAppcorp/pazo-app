import {useCallback, useEffect, useRef, useState} from 'react'
import {supabase} from '../../services/supabaseClient'
import {supporterBenefitsUiEnabled, SUPPORTER_PAYMENT_VERIFIED_EVENT} from './supporterUiRelease'

// A public, derived pet-benefit RPC is the only available authority for F16
// Sandbox perks. Payment redirects, stored flags and PayPal ACTIVE are not proof.
const benefitsEnabled = supporterBenefitsUiEnabled
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

export function useSupporterMembershipStatus(petId?:string, enabled=true) {
  const [status,setStatus] = useState<SupporterStatus>(noStatus('checking'))
  const [revision,setRevision] = useState(0)
  const lastScope = useRef({petId,enabled})
  const lastOwnerId = useRef<string|null>(null)
  const refresh = useCallback(() => setRevision(value => value + 1),[])
  useEffect(() => {
    // Switching PAZO accounts must never briefly expose the previous owner's UI.
    // SIGNED_IN for the SAME owner can fire on refocus, so do not clear on it.
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,session)=>{
      const nextOwnerId=session?.user?.id??null
      const changed=lastOwnerId.current!==null && lastOwnerId.current!==nextOwnerId
      lastOwnerId.current=nextOwnerId
      if(changed){setStatus(noStatus('checking'));refresh()}
    })
    return ()=>subscription.unsubscribe()
  },[refresh])
  useEffect(() => {
    if (!enabled || !benefitsEnabled) return
    // Switching back from PayPal or verifying a payment re-reads the SERVER.
    // No local flag, redirect, or event grants a membership.
    const onVisible = () => { if (document.visibilityState === 'visible') refresh() }
    window.addEventListener(SUPPORTER_PAYMENT_VERIFIED_EVENT, refresh)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.removeEventListener(SUPPORTER_PAYMENT_VERIFIED_EVENT, refresh)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [enabled,refresh])
  useEffect(() => {
    let cancelled = false
    const sameScope=lastScope.current.petId===petId &&
      lastScope.current.enabled===enabled
    lastScope.current={petId,enabled}
    // Revalidating a KNOWN paid account must not unmount its management
    // panel. If server proof fails or expires, the resolved result immediately
    // replaces this prior state; all writes/public reads stay server-gated.
    setStatus(previous=>sameScope&&previous.kind==='verified'
      ?previous:noStatus('checking'))
    if (!enabled || !benefitsEnabled) {
      setStatus(noStatus('inactive'))
      return () => {cancelled = true}
    }
    const read = async ():Promise<SupporterStatus> => {
      const {data:{user},error:authError} = await supabase.auth.getUser()
      if(authError || !UUID.test(user?.id || ''))throw Error('OWNER_UNVERIFIED')
      lastOwnerId.current=user!.id
      const query = supabase.from('pets').select('id').eq('owner_id',user!.id)
      const {data:pets,error:petError} = petId
        ? await query.eq('id',petId).limit(1)
        : await query.limit(101)
      if(petError || !Array.isArray(pets) || pets.length>100 ||
        pets.some(p=>!UUID.test(p?.id || '')) ||
        (petId && pets[0]?.id!==petId))throw Error('PETS_UNVERIFIED')
      // A paid subscription belongs to the Auth account, not to a pet.
      // The authenticated owner-only RPC is read-only and supplies no
      // payment, personal or subscription IDs. Never invent a pet to enroll.
      if(pets.length===0){
        if(petId)throw Error('PETS_UNVERIFIED')
        const {data,error}=await supabase.rpc('pazo_supporter_my_account_status')
        const v=data as {active?:unknown;milestone?:unknown}|null
        if(error || !v || typeof v.active!=='boolean' ||
           ![0,3,6,12].includes(v.milestone as number) ||
           (!v.active && v.milestone!==0))
          throw Error('OWNER_COVERAGE_UNVERIFIED')
        return v.active ? {kind:'verified',milestone:v.milestone as 0|3|6|12}
          : noStatus('inactive')
      }
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
  },[petId,enabled,revision])
  return {status,refresh}
}
