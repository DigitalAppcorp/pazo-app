// PAZO F16 — READ ONLY: owner's original PayPal Live checkout requests.
// Does not contact PayPal or modify subscriptions, payments or benefits.
// Deployed with Edge JWT verification ON; GoTrue rechecks the bearer.
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import {createPazoLiveOwnerAccountRead} from './liveAccountRead.mjs'
import {createPazoLiveGoTrueOwnerResolver} from '../pazo-paypal-live-checkout/liveGoTrueOwner.mjs'
const PROJECT='https://mrybvqdebbgcayuvgkkr.supabase.co'
const READONLY_RELEASED=true
const unavailable=()=>createPazoLiveOwnerAccountRead()
function setup(){
 if(!READONLY_RELEASED)return unavailable()
 try{
  const url=Deno.env.get('SUPABASE_URL')
  const anon=Deno.env.get('SUPABASE_ANON_KEY')
  const service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if(url!==PROJECT||!anon||!service||service.length<24)throw Error('invalid_env')
  const resolveAuthenticatedOwner=createPazoLiveGoTrueOwnerResolver({
   supabaseUrl:url,anonKey:anon
  })
  const readPrivateOwner=async({ownerId}:{ownerId:string})=>{
   const res=await fetch(PROJECT+'/rest/v1/rpc/pazo_f16_live_service_owner_checkouts_read',{
    method:'POST',cache:'no-store',redirect:'error',signal:AbortSignal.timeout(10000),
    headers:{apikey:service,Authorization:'Bearer '+service,
     'content-type':'application/json',Accept:'application/json'},
    body:JSON.stringify({p_owner:ownerId})
   })
   if(res.status!==200||!res.ok)throw Error('private_owner_unavailable')
   const raw=await res.text()
   if(raw.length>24576)throw Error('private_owner_response_too_large')
   return JSON.parse(raw)
  }
  return createPazoLiveOwnerAccountRead({released:true,
   resolveAuthenticatedOwner,readPrivateOwner})
 }catch{return unavailable()}
}
Deno.serve(setup())
