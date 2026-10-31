// #169 disposable Supabase CLI Edge runtime harness only.
// Never deploy, import in production, or point this at hosted PAZO.
// This file is copied ONLY into a temporary functions folder by CI.
// Provider network is strictly limited to the local Supabase Docker "kong"
// hostname. No Meta endpoints/SDK, no external email, no analytics releases.
import {createMetaGrantHandler} from '../pazo-meta-consent/grantCore.mjs'
import {createMetaReceiptHandler} from '../pazo-meta-receipt/receiptCore.mjs'
import {createMetaWithdrawalHandler} from '../pazo-meta-consent/withdrawCore.mjs'

const API='http://kong:8000'
const DATASET='1438916858347709'
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const ANON=Deno.env.get('SUPABASE_ANON_KEY')
const SERVICE=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const setup=typeof ANON==='string'&&ANON.length>=16
 &&typeof SERVICE==='string'&&SERVICE.length>=16
const header=(key:string)=>({
 apikey:key,authorization:'Bearer '+key,'content-type':'application/json',
 accept:'application/json',
})
async function internal(path:string,options:RequestInit){
 // Absolute, hardcoded in-container URL. The client cannot supply path.
 if(!setup)throw Error('local_cli_secret_unavailable')
 if(!path.startsWith('/auth/v1/')&&!path.startsWith('/rest/v1/rpc/'))
   throw Error('local_path_not_allowed')
 const url=new URL(API+path)
 if(url.origin!==API||url.hostname!=='kong')
   throw Error('nonlocal_backend_forbidden')
 return fetch(url,{...options,redirect:'error',
  signal:AbortSignal.timeout(6000)})
}
const authenticate=async(jwt:string)=>{
 if(!jwt||jwt.length<12||jwt.length>4096)return null
 const result=await internal('/auth/v1/user',{
  method:'GET',headers:{apikey:ANON!,authorization:'Bearer '+jwt,
   accept:'application/json'},
 })
 if(result.status!==200)return null
 const u=await result.json().catch(()=>null)
 if(typeof u?.id!=='string'||!UUID.test(u.id)
    ||u.is_anonymous===true)return null
 return {id:u.id,is_anonymous:false,
  email_confirmed_at:u.email_confirmed_at}
}
const service=async(path:string,body:Record<string,unknown>)=>{
 const r=await internal('/rest/v1/rpc/'+path,{
  method:'POST',headers:header(SERVICE!),body:JSON.stringify(body),
 })
 if(r.status!==200)throw Error('local_sql_rpc_failed')
 return r.json()
}
const withdraw=async(owner:string)=>UUID.test(owner)
 &&(await service('pazo_meta_withdraw_candidate',{p_owner:owner}))===true
const checkLocalSettings=async()=>{
 const res=await internal('/auth/v1/settings',{
  method:'GET',headers:{apikey:ANON!,accept:'application/json'},
 })
 if(res.status!==200)return false
 const d=await res.json().catch(()=>null)
 return d?.mailer_autoconfirm===false
}
const verified=async(jwt:string)=>{
 const user=await authenticate(jwt)
 if(!user?.email_confirmed_at)return null
 if(!await checkLocalSettings())return null
 return user
}
const grant=createMetaGrantHandler({
 released:setup,privacyReviewed:setup,
 authenticate:verified,authenticateGpc:authenticate,
 persistGpc:withdraw,
 grant:async(owner:string,notice:string,gpc:boolean)=>
   UUID.test(owner)&&(await service('pazo_meta_grant_first_session_candidate',{
    p_owner:owner,p_notice:notice,p_gpc:gpc,
   }))===true,
})
const receipt=createMetaReceiptHandler({
 released:setup,privacyReviewed:setup,
 authenticate:verified,authenticateGpc:authenticate,
 persistGpc:withdraw,
 lookupReceipt:async(owner:string)=>{
  if(!UUID.test(owner))return null
  const rows=await service('pazo_meta_take_pixel_receipt_candidate',{
    p_owner:owner,
  })
  if(!Array.isArray(rows)||rows.length!==1)return null
  const row=rows[0]
  if(!row?.event_id||!row?.event_time)return null
  return {ownerId:owner,authorized:true,verifiedRegistration:true,
   excluded:false,gpc:false,sharingOptOut:false,withdrawn:false,
   metaReleaseEnabled:true,eventId:row.event_id,datasetId:DATASET,
   eventTime:Math.floor(Date.parse(row.event_time)/1000)}
 },
})
const optOut=createMetaWithdrawalHandler({
 released:setup,authenticate,withdraw,
})
Deno.serve(async(req:Request)=>{
 // The entire function is TEST-ONLY; it must never be deployed or published.
 // The first segment maps to candidate core handlers, not provider APIs.
 const path=new URL(req.url).pathname
 if(path.endsWith('/grant'))return grant(req)
 if(path.endsWith('/receipt'))return receipt(req)
 if(path.endsWith('/withdraw'))return optOut(req)
 return new Response(JSON.stringify({status:'not_available'}),{
  status:404,headers:{'content-type':'application/json'}})
})
