// #169: isolated server adapter. NOT deployed or imported in PAZO runtime.
// Account identity comes only from a fresh Supabase Auth lookup, never
// from browser user_metadata, a JWT decoded without verification, or a payload.
import {createMarketingProvider}
  from '../pazo-marketing-attribution/intakeAdapter.mjs'
const URL='https://mrybvqdebbgcayuvgkkr.supabase.co'
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const NOTICE='pazo-meta-conversions-v1'
export function createMetaGrantProvider({url,anonKey,serviceKey,
  fetchImpl=fetch,
}={}) {
 const source=createMarketingProvider({url,anonKey,serviceKey,fetchImpl})
 if(url!==URL)throw Error('meta_grant_project_mismatch')
 return {
  authenticate:source.authenticate,
  grant:async(ownerId,notice,gpc)=>{
   if(typeof ownerId!=='string'||!UUID.test(ownerId)
      ||notice!==NOTICE||gpc!==false)return false
   let res
   try{res=await fetchImpl(URL+'/rest/v1/rpc/pazo_meta_grant_first_session_candidate',{
    method:'POST',redirect:'error',cache:'no-store',
    signal:AbortSignal.timeout(6000),
    headers:{'apikey':serviceKey,'authorization':'Bearer '+serviceKey,
      'content-type':'application/json','accept':'application/json'},
    body:JSON.stringify({p_owner:ownerId,p_notice:NOTICE,p_gpc:false}),
   })}catch{return false}
   if(res?.status!==200)return false
   try{return await res.json()===true}catch{return false}
  },
 }
}
