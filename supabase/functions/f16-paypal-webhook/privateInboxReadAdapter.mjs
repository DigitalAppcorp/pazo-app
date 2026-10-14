// F16 future server-only reader. The draft RPC is NOT installed on PAZO hosted.
// No browser import, direct table SELECT, payment, checkout, or entitlement.
import {createF16PrivateInboxDecisionGate} from './privateInboxDecisionGate.mjs'
const BASE='https://mrybvqdebbgcayuvgkkr.supabase.co'
const RPC=BASE+'/rest/v1/rpc/f16_paypal_read_verified_inbox'
const REF=/^[A-Za-z0-9._-]{1,128}$/
const EVENT=/^[A-Z0-9._-]{1,128}$/
const STATES=new Set(['pending','processing','quarantined','processed'])
const KEYS=['event_type','processing_state','provider_event_id','retention_hold']
function validRow(r,id){
 if(!r||typeof r!=='object'||Array.isArray(r))return false
 const k=Object.keys(r).sort()
 return k.length===4&&k.every((v,i)=>v===KEYS[i])&&
  r.provider_event_id===id&&typeof r.event_type==='string'&&
  EVENT.test(r.event_type)&&STATES.has(r.processing_state)&&
  typeof r.retention_hold==='boolean'
}
export function createF16PrivateInboxReadAdapter({projectUrl,serviceRoleKey,fetchImpl=fetch}={}){
 if(projectUrl!==BASE||typeof serviceRoleKey!=='string'||
    serviceRoleKey.length<24||/\s/.test(serviceRoleKey)||
    typeof fetchImpl!=='function')throw Error('private_reader_not_configured')
 return Object.freeze({
  async loadVerifiedInbox(eventId){
   if(typeof eventId!=='string'||!REF.test(eventId))
    throw Error('private_inbox_event_invalid')
   let response
   try{
    response=await fetchImpl(RPC,{
     method:'POST',redirect:'error',signal:AbortSignal.timeout(12000),
     headers:{'Content-Type':'application/json',Accept:'application/json',
      apikey:serviceRoleKey,Authorization:'Bearer '+serviceRoleKey},
     body:JSON.stringify({p_provider_event_id:eventId}),
    })
   }catch{throw Error('private_inbox_read_unavailable')}
   if(!response?.ok)throw Error('private_inbox_read_unavailable')
   let data
   try{data=await response.json()}catch{throw Error('private_inbox_read_unavailable')}
   if(data===null)return null
   if(!validRow(data,eventId))throw Error('private_inbox_read_contract_mismatch')
   return Object.freeze({
    provider_event_id:data.provider_event_id,event_type:data.event_type,
    processing_state:data.processing_state,retention_hold:data.retention_hold,
   })
  },
 })
}
export function createF16ServerInboxGate(config){
 const reader=createF16PrivateInboxReadAdapter(config)
 return createF16PrivateInboxDecisionGate({loadVerifiedInbox:id=>reader.loadVerifiedInbox(id)})
}
