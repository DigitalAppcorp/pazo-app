// PAZO F16-P15 — owner-only Sandbox account management; NEVER checkout.
// Server-side authenticated, no public subscription creation, no benefits.
// PayPal cancellation is initiated ONLY on explicit user action.
import {createClient} from 'npm:@supabase/supabase-js@2.117.2'
import {resolvePazoAccountOriginGate,withCors} from './accountOriginGateP18.mjs'
import {createVerifiedAuthOwnerResolver} from '../f16-paypal-webhook/verifiedAuthOwner.mjs'
import {createF16IntentStore} from '../f16-paypal-webhook/intentStoreAdapter.mjs'
import {createF16GlobalAdmission} from '../f16-paypal-webhook/globalAdmissionAdapter.mjs'
import {createPazoCheckoutConsentStore} from '../f16-paypal-webhook/p06CheckoutConsentStore.mjs'
import {createPazoSandboxCancellationProvider} from '../f16-paypal-webhook/p06SandboxCancellationProvider.mjs'
import {createPazoSandboxSupporterAccountHandler} from '../f16-paypal-webhook/p14SandboxSupporterAccountHandler.mjs'

const BASE='https://mrybvqdebbgcayuvgkkr.supabase.co'
const INTENT=/^intent-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const reply=(status:number,code:string,extra:Record<string,unknown>={})=>
 new Response(JSON.stringify({ok:status===200,code,environment:'sandbox',
 paidThrough:null,mayGrantBenefits:false,mayCreateSubscription:false,...extra}),
 {status,headers:{'content-type':'application/json',
  'cache-control':'no-store','x-content-type-options':'nosniff'}})
const shouldRun=():boolean=>
 Deno.env.get('SUPABASE_URL')===BASE &&
 Deno.env.get('PAZO_F16_PAYPAL_ENV')==='sandbox' &&
 !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

function createRuntime(){
 const key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
 const auth=createClient(BASE,key,{auth:{
  autoRefreshToken:false,persistSession:false}})
 const resolveAuthenticatedOwner=createVerifiedAuthOwnerResolver({authClient:auth})
 const limiter=createF16GlobalAdmission({projectUrl:BASE,serviceRoleKey:key})
 const admit=()=>limiter.tryAdmit()
 const privateIntentStore=createF16IntentStore({projectUrl:BASE,serviceRoleKey:key})
 const consentStore=createPazoCheckoutConsentStore({projectUrl:BASE,serviceRoleKey:key})
 // Provider credentials are NOT required for list/acceptance retrieval.
 // Status/cancel require actual Sandbox credentials and fail closed if missing.
 const provider={
  read:async(args:unknown)=>createPazoSandboxCancellationProvider({
   clientId:Deno.env.get('PAZO_F16_PAYPAL_CLIENT_ID'),
   clientSecret:Deno.env.get('PAZO_F16_PAYPAL_CLIENT_SECRET')}).read(args as never),
  cancel:async(args:unknown)=>createPazoSandboxCancellationProvider({
   clientId:Deno.env.get('PAZO_F16_PAYPAL_CLIENT_ID'),
   clientSecret:Deno.env.get('PAZO_F16_PAYPAL_CLIENT_SECRET')}).cancel(args as never),
 }
 const manage=createPazoSandboxSupporterAccountHandler({
  resolveAuthenticatedOwner,privateIntentStore,admit,provider,consentStore,
  trustedOrigins:[Deno.env.get('PAZO_F16_APP_ORIGIN')!],
 })
 return{key,resolveAuthenticatedOwner,admit,manage}
}
async function listForOwner(ownerId:string,key:string){
 const response=await fetch(BASE+'/rest/v1/rpc/f16_p15_list_owner_supporter_intents',{
  method:'POST',redirect:'error',signal:AbortSignal.timeout(12000),
  headers:{apikey:key,Authorization:'Bearer '+key,
   'content-type':'application/json',Accept:'application/json'},
  body:JSON.stringify({p_owner_id:ownerId}),
 })
 if(!response.ok)throw Error('private_list_unavailable')
 const value=await response.json()
 if(!Array.isArray(value)||value.length>5||
    value.some(x=>!x||!INTENT.test(x.intentId||'')||
     !['pending','bound'].includes(x.state)||
     typeof x.canDownloadAcceptance!=='boolean'))
  throw Error('private_list_untrusted')
 return value.map(x=>({intentId:x.intentId,state:x.state,
  canDownloadAcceptance:x.canDownloadAcceptance}))
}
Deno.serve(async(request:Request)=>{
 const gate=resolvePazoAccountOriginGate(request,Deno.env.get('PAZO_F16_APP_ORIGIN'))
 if(gate.response)return gate.response
 const cors=gate.cors!
 const addCors=(res:Response)=>withCors(res,cors)
 // Runtime configuration is required only for POSTs. An authorized origin
 // can diagnose unavailable Sandbox configuration without PayPal traffic.
 if(!shouldRun())return addCors(reply(503,'supporter_account_not_configured'))
 if(request.method!=='POST')return addCors(reply(405,'method_not_allowed'))
 if(!request.headers.get('content-type')?.toLowerCase().startsWith('application/json'))
  return addCors(reply(415,'json_required'))
 const advertised=Number(request.headers.get('content-length')||0)
 if(!Number.isFinite(advertised)||advertised>2048)
  return addCors(reply(413,'request_too_large'))
 let data
 try{
  const raw=await request.clone().text()
  if(raw.length>2048) return addCors(reply(413,'request_too_large'))
  data=JSON.parse(raw)
 }catch{return addCors(reply(400,'invalid_request'))}
 if(!data||typeof data!=='object'||Array.isArray(data)||
    typeof data.action!=='string')
  return addCors(reply(400,'invalid_request'))
 let runtime
 try{runtime=createRuntime()}catch{return addCors(reply(503,'account_service_unavailable'))}
 if(data.action==='list'){
  if(Object.keys(data).join(',')!=='action')
   return addCors(reply(400,'invalid_request'))
  let owner
  try{owner=await runtime.resolveAuthenticatedOwner(request)}
  catch{return addCors(reply(401,'authentication_required'))}
  if(!owner)return addCors(reply(401,'authentication_required'))
  try{
   if(await runtime.admit()!==true)
    return addCors(reply(429,'rate_limited'))
   const accounts=await listForOwner(owner,runtime.key)
   return addCors(reply(200,'account_list_verified',{accounts}))
  }catch{return addCors(reply(503,'account_list_unavailable'))}
 }
 if(['status','cancel','acknowledgement'].includes(data.action))
  return addCors(await runtime.manage(request))
 return addCors(reply(400,'invalid_request'))
})
