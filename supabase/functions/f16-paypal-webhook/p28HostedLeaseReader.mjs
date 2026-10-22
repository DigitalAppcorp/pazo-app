// PAZO F16-P28 service-only RPC transport. Never browser-import.
// A P21 read proves a fenced processing claim, not payment or merchant origin.
import {createP28LeaseAttestationAdapter} from './p28LeaseAttestationAdapter.mjs'
const BASE='https://mrybvqdebbgcayuvgkkr.supabase.co'
export function createP28HostedLeaseReader({
 projectUrl,serviceRoleKey,fetchImpl=fetch,scope='DISABLED'
}={}){
 if(scope!=='SERVER_ONLY_READ_GATE'||projectUrl!==BASE||
  typeof serviceRoleKey!=='string'||serviceRoleKey.length<32||
  typeof fetchImpl!=='function')
  return async()=>null
 return createP28LeaseAttestationAdapter({
  callServiceRpc:async(name,args)=>{
   if(name!=='f16_p05_draft_read_claimed_event')throw Error('rpc_not_allowed')
   const res=await fetchImpl(BASE+'/rest/v1/rpc/'+name,{
    method:'POST',redirect:'error',signal:AbortSignal.timeout(10000),
    headers:{apikey:serviceRoleKey,Authorization:'Bearer '+serviceRoleKey,
     'content-type':'application/json',Accept:'application/json'},
    body:JSON.stringify(args),
   })
   if(!res.ok)throw Error('claim_read_unavailable')
   const data=await res.json()
   if(data===null||!data||typeof data!=='object'||Array.isArray(data))
    return null
   return data
  }
 })
}
