// PAZO F16 — explicit PO-authorized ONE Sandbox E2E, local operator only.
// --preflight: no network/writes. --run: test user, private intent, one
// subscription, binding before buyer approval; then attempts cancellation.
// --cancel-only: recovery of the same Sandbox subscription, never a new one.
// No PayPal Live, checkout deployment, grants, ledger or paidThrough.
import {randomBytes,randomUUID} from 'node:crypto'
import {existsSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs'
import {homedir} from 'node:os'
import {join,dirname} from 'node:path'
import {pathToFileURL} from 'node:url'
import {createInterface} from 'node:readline/promises'
import {stdin as input,stdout as output} from 'node:process'
import {createClient} from '@supabase/supabase-js'
import {createF16BoundSandboxIntentCoordinator} from '../supabase/functions/f16-paypal-webhook/f16BoundSandboxIntentCoordinator.mjs'
import {createVerifiedAuthOwnerResolver} from '../supabase/functions/f16-paypal-webhook/verifiedAuthOwner.mjs'
import {createF16P05SandboxBillingSnapshotReader} from '../supabase/functions/f16-paypal-webhook/p05PaypalSandboxBillingSnapshotReader.mjs'
import {assessPazoSandboxPlan} from '../src/features/supporter/testing/paypalSandboxPlanContract.mjs'
const URL='https://mrybvqdebbgcayuvgkkr.supabase.co'
const HOST='https://api-m.sandbox.paypal.com'
const PLAN='P-14V25407JP6850922NLHMDKI'
const SUB=/^I-[A-Za-z0-9_-]{3,70}$/
const KEY=/^[\x21-\x7e]{8,4096}$/
const STATE=join(homedir(),process.platform==='win32'?'AppData\\Local\\PAZO-F16-E2E':'.pazo-f16-e2e','sandbox-state.json')
const supaAuth={auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}}
const ok=x=>console.log(JSON.stringify(x,null,2))
const info=(step,why)=>({environment:'sandbox',step,why,mayGrantBenefits:false,paidThrough:null,cycleVerified:false})
const config=env=>({
 id:env.PAYPAL_SANDBOX_CLIENT_ID,
 secret:env.PAYPAL_SANDBOX_CLIENT_SECRET,
 service:env.PAZO_F16_SUPABASE_SECRET_KEY,
})
const valid=x=>typeof x==='string'&&KEY.test(x)
function requireConfig(c){
 if(!valid(c.id)||c.id.includes(':')||!valid(c.secret)||!valid(c.service))
  throw Error('f16_missing_private_env')
}
function load(){
 if(!existsSync(STATE))return null
 const state=JSON.parse(readFileSync(STATE,'utf8'))
 if(state.environment!=='sandbox'||state.project!==URL||state.plan!==PLAN)
  throw Error('f16_untrusted_local_state')
 return state
}
function save(state,first=false){
 mkdirSync(dirname(STATE),{recursive:true,mode:0o700})
 writeFileSync(STATE,JSON.stringify({environment:'sandbox',project:URL,plan:PLAN,...state},null,2),{
  flag:first?'wx':'w',mode:0o600,encoding:'utf8',
 })
}
const client=secret=>createClient(URL,secret,supaAuth)
async function paypal(c,method,path,body,requestId){
 const auth=await fetch(HOST+'/v1/oauth2/token',{
  method:'POST',redirect:'error',signal:AbortSignal.timeout(15000),
  headers:{Authorization:'Basic '+btoa(c.id+':'+c.secret),
   Accept:'application/json','Content-Type':'application/x-www-form-urlencoded'},
  body:'grant_type=client_credentials',
 })
 if(!auth.ok)throw Error('f16_sandbox_oauth_failed')
 const token=await auth.json()
 if(token.token_type!=='Bearer'||typeof token.access_token!=='string'||
  token.access_token.length<8)throw Error('f16_sandbox_token_invalid')
 const h={Authorization:'Bearer '+token.access_token,Accept:'application/json'}
 if(body!==undefined)h['Content-Type']='application/json'
 if(requestId)h['PayPal-Request-Id']=requestId
 const response=await fetch(HOST+path,{
  method,redirect:'error',signal:AbortSignal.timeout(20000),headers:h,
  ...(body===undefined?{}:{body:JSON.stringify(body)}),
 })
 if(!response.ok)throw Error('f16_sandbox_api_failed')
 if(response.status===204)return {}
 const data=await response.json()
 if(!data||typeof data!=='object'||Array.isArray(data))
  throw Error('f16_sandbox_response_invalid')
 return data
}
// READ ONLY remote preflight. Ensures a valid service-level Supabase key and
// existing PayPal plan BEFORE reserving/creating any test assets.
// The missing Auth ID is deliberately synthetic, never another user's data.
async function validateRemote(c){
 requireConfig(c)
 const admin=client(c.service)
 const fakeId='00000000-0000-4000-8000-000000000000'
 const {data:unusedIntent,error:intentError}=await admin.rpc(
  'f16_paypal_read_private_intent',{p_intent_id:'intent-'+fakeId})
 if(intentError||unusedIntent!==null)throw Error('f16_supabase_service_rpc_not_ready')
 const {error:userError}=await admin.auth.admin.getUserById(fakeId)
 if(!userError||userError.status!==404)
  throw Error('f16_supabase_auth_admin_not_ready')
 const plan=await paypal(c,'GET','/v1/billing/plans/'+encodeURIComponent(PLAN))
 const check=assessPazoSandboxPlan(plan)
 if(!check.ok||check.warnings.length)
  throw Error('f16_existing_paypal_plan_not_ready')
 if(plan.quantity_supported!==false&&plan.quantity_supported!==undefined)
  throw Error('f16_plan_quantity_contract_unexpected')
 return Object.freeze({environment:'sandbox',step:'remote_readonly_validation',
  supabasePrivateReadReady:true,supabaseAuthAdminReady:true,
  paypalPlanReady:true,quantitySupported:false,networkReadOnly:true,
  writes:0,mayGrantBenefits:false})
}
async function cancel(c,state){
 if(!SUB.test(state?.subscriptionId||''))return false
 const path='/v1/billing/subscriptions/'+encodeURIComponent(state.subscriptionId)
 try{
  const before=await paypal(c,'GET',path)
  if(before.id!==state.subscriptionId||before.plan_id!==PLAN||
   before.custom_id!==state.intentId)return false
  if(before.status==='CANCELLED'){
   save({...state,phase:'cancelled'});return true
  }
  if(!['APPROVAL_PENDING','APPROVED','ACTIVE','SUSPENDED'].includes(before.status))
   return false
  await paypal(c,'POST',path+'/cancel',{reason:'PAZO authorized one-time Sandbox QA cleanup'})
  const after=await paypal(c,'GET',path)
  if(after.id!==state.subscriptionId||after.status!=='CANCELLED')return false
  save({...state,phase:'cancelled'})
  return true
 }catch{return false}
}
// Read-only diagnostic for the SAME local test only, no new purchase or grant.
// Can be run after cancellation when PayPal transaction listing catches up.
async function inspect(c,state){
 if(!SUB.test(state?.subscriptionId||'')||!state?.intentId||!state?.authOwnerId)
  throw Error('f16_inspect_no_bound_sandbox_reference')
 const admin=client(c.service)
 const {data:bound,error}=await admin.rpc('f16_paypal_read_private_intent',{
  p_intent_id:state.intentId,
 })
 if(error)throw Error('f16_inspect_private_intent_unavailable')
 const privateBound=bound?.state==='bound'&&
  bound.owner_id===state.authOwnerId&&
  bound.external_subscription_id===state.subscriptionId&&
  bound.plan_id===PLAN
 const startMs=Date.parse(state.createdAt)
 const endMs=Date.now()
 if(!Number.isFinite(startMs)||endMs-startMs>30*24*60*60*1000)
  throw Error('f16_inspect_window_expired')
 const path='/v1/billing/subscriptions/'+encodeURIComponent(state.subscriptionId)
 const sub=await paypal(c,'GET',path)
 if(sub.id!==state.subscriptionId||sub.plan_id!==PLAN||
  sub.custom_id!==state.intentId)throw Error('f16_inspect_paypal_mismatch')
 const start=new Date(startMs-3600000).toISOString().replace(/\.\d{3}Z$/,'Z')
 const end=new Date(endMs+60000).toISOString().replace(/\.\d{3}Z$/,'Z')
 const data=await paypal(c,'GET',path+'/transactions?'+new URLSearchParams({
  start_time:start,end_time:end,
 }))
 if(!Array.isArray(data.transactions)||!Number.isSafeInteger(data.total_pages)||
  !Number.isSafeInteger(data.total_items)||data.total_items!==data.transactions.length||
  (data.total_pages!==1&&!(data.total_pages===0&&data.total_items===0)))
  throw Error('f16_inspect_partial_provider_history')
 const completed=data.transactions.filter(tx=>
  tx?.status==='COMPLETED'&&
  tx?.amount_with_breakdown?.gross_amount?.currency_code==='USD'&&
  tx?.amount_with_breakdown?.gross_amount?.value==='2.99')
 return {
  environment:'sandbox',step:'read_only_inspect',
  merchantScopeVerified:true,privateAuthBindingConfirmed:privateBound,
  subscriptionCancelled:sub.status==='CANCELLED',
  completed299SalesObserved:completed.length,
  transactionWindowOnly:true,
  financialHistoryComplete:false,cycleVerified:false,
  mayGrantBenefits:false,paidThrough:null,
 }
}
export async function performF16SandboxE2E(c){
 requireConfig(c)
 if(load())throw Error('f16_existing_test_state_no_duplicate')
 // No test data or lock file is created if provider/admin credentials fail.
 ok(await validateRemote(c))
 let state={requestId:randomUUID(),phase:'reserved',createdAt:new Date().toISOString()}
 save(state,true) // First reservation blocks accidental second purchase on restart.
 const admin=client(c.service),login=client(c.service)
 const effectiveReader=createF16P05SandboxBillingSnapshotReader({
  clientId:c.id,clientSecret:c.secret,
 })
 const newEmail='pazo-f16-'+randomUUID()+'@example.com'
 const pass='Q9!'+randomBytes(32).toString('base64url')
 let stage='reserved'
 try{
  const created=await admin.auth.admin.createUser({
   email:newEmail,password:pass,email_confirm:true,
  })
  if(created.error||!created.data?.user?.id)throw Error('f16_auth_create_failed')
  stage='auth_created';state={...state,phase:stage,authOwnerId:created.data.user.id};save(state)
  const signed=await login.auth.signInWithPassword({email:newEmail,password:pass})
  if(signed.error||signed.data?.user?.id!==created.data.user.id||
   !signed.data.session?.access_token)throw Error('f16_auth_login_failed')
  const access=signed.data.session.access_token
  const verified=await admin.auth.getUser(access)
  if(verified.error||verified.data?.user?.id!==created.data.user.id)
   throw Error('f16_auth_owner_not_verified')
  const requestContext={headers:new Headers({Authorization:'Bearer '+access})}
  const coordinator=createF16BoundSandboxIntentCoordinator({
   resolveOwnerFromVerifiedSession:createVerifiedAuthOwnerResolver({authClient:admin}),
   newIntentId:()=> 'intent-'+randomUUID(),
   createPrivateIntent:async({ownerId,intentId})=>{
    const {data,error}=await admin.rpc('f16_paypal_create_private_intent',{
     p_owner_id:ownerId,p_intent_id:intentId,
    })
    return !error&&data===true
   },
   loadPrivateIntent:async id=>{
    const {data,error}=await admin.rpc('f16_paypal_read_private_intent',{p_intent_id:id})
    if(error||!data)return null
    return {id:data.id,ownerId:data.owner_id,planId:data.plan_id,
     provider:'paypal',state:data.state,
     externalSubscriptionId:data.external_subscription_id}
   },
   readPayPalSubscription:async id=>{
    const snapshot=await effectiveReader.read(id)
    const s=snapshot.subscription,p=snapshot.plan
    if(s?.plan_overridden!==false||s?.quantity!=='1'||
     p?.status!=='ACTIVE'||p.billing_cycles?.length!==1||
     p.billing_cycles[0]?.tenure_type!=='REGULAR'||
     p.billing_cycles[0]?.frequency?.interval_unit!=='MONTH'||
     p.billing_cycles[0]?.frequency?.interval_count!==1||
     p.billing_cycles[0]?.pricing_scheme?.fixed_price?.currency_code!=='USD'||
     p.billing_cycles[0]?.pricing_scheme?.fixed_price?.value!=='2.99')
     return null
    return {id:s.id,plan_id:s.plan_id,custom_id:s.custom_id,status:s.status}
   },
   bindPrivateIntent:async({ownerId,intentId,subscriptionId,planId})=>{
    const {data,error}=await admin.rpc('f16_paypal_bind_private_intent',{
     p_owner_id:ownerId,p_intent_id:intentId,
     p_subscription_id:subscriptionId,p_plan_id:planId,
    })
    return error?null:data
   },
  })
  const prep=await coordinator.prepare({requestContext})
  if(prep.readyForSandboxCreation!==true||!prep.intentId)
   throw Error('f16_intent_not_prepared')
  stage='intent_created';state={...state,phase:stage,intentId:prep.intentId};save(state)
  ok(info(stage,'trusted_auth_private_intent'))
  stage='paypal_post_requested';state={...state,phase:stage};save(state)
  // Never retry an uncertain PayPal POST using a new request ID.
  const sub=await paypal(c,'POST','/v1/billing/subscriptions',{
   plan_id:PLAN,custom_id:prep.intentId,
  },state.requestId)
  if(!SUB.test(sub.id||'')||sub.status!=='APPROVAL_PENDING')
   throw Error('f16_sandbox_subscription_not_pending')
  state={...state,subscriptionId:sub.id,phase:'paypal_created'};save(state)
  const link=sub.links?.find(l=>l?.rel==='approve'&&l.method==='GET')?.href
  const url=link?new URL(link):null
  if(!url||url.protocol!=='https:'||
   !['www.sandbox.paypal.com','sandbox.paypal.com'].includes(url.hostname))
   throw Error('f16_invalid_sandbox_buyer_url')
  const bound=await coordinator.bind({
   requestContext,intentId:prep.intentId,subscriptionId:sub.id,
  })
  if(bound.bound!==true||bound.bindingState!=='new_binding')
   throw Error('f16_private_binding_unverified')
  stage='bound_before_approval';state={...state,phase:stage};save(state)
  ok(info(stage,'auth_owner_plan_custom_id_matched'))
  console.log('Open this URL LOCALLY with PERSONAL PayPal Sandbox; do NOT paste it in chat:')
  console.log(url.toString())
  const rl=createInterface({input,output})
  try{await rl.question('Approve ONCE in PayPal Sandbox, then press Enter (or press Enter to cancel if you declined): ')}
  finally{rl.close()}
  const after=await paypal(c,'GET','/v1/billing/subscriptions/'+encodeURIComponent(sub.id))
  if(after.id!==sub.id||after.plan_id!==PLAN||after.custom_id!==prep.intentId||
   after.status!=='ACTIVE')throw Error('f16_sandbox_subscription_not_active')
  stage='active';state={...state,phase:stage};save(state)
  ok(info(stage,'buyer_approved_not_paid_cycle_proof'))
 }finally{
  if(state.subscriptionId){
   const done=await cancel(c,state)
   ok(info(done?'cancelled':'cancel_unverified',
    done?'paypal_sandbox_cancellation_verified':'use_cancel_only_no_second_purchase'))
  }else ok(info('no_known_subscription',
   'uncertain_paypal_post_must_be_checked_manually_not_retried'))
 }
 return info('test_end','no_ledger_no_entitlements')
}
async function main(){
 const mode=process.argv[2]??'--preflight',c=config(process.env)
 if(mode==='--preflight'){
  ok({environment:'sandbox',mode:'preflight',networkCalls:0,writes:0,
   merchantClientConfigured:valid(c.id),
   merchantSecretConfigured:valid(c.secret),
   supabaseServerSecretConfigured:valid(c.service),
   previousTestExists:Boolean(load()),
   mayGrantBenefits:false})
  return
 }
 if(mode==='--validate-remote'){
  if(load())throw Error('f16_existing_test_state_no_duplicate')
  ok(await validateRemote(c))
  return
 }
 if(mode==='--inspect'){
  requireConfig(c);const state=load()
  ok(await inspect(c,state))
  return
 }
 if(mode==='--cancel-only'){
  requireConfig(c);const state=load()
  if(!state?.subscriptionId)throw Error('f16_missing_existing_subscription')
  const done=await cancel(c,state)
  ok(info(done?'cancelled':'cancel_unverified',
   done?'sandbox_cancellation_verified':'manual_check_required'))
  return
 }
 if(mode!=='--run')throw Error('f16_unsupported_mode')
 ok(await performF16SandboxE2E(c))
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{await main()}
 catch(e){
  const code=e instanceof Error&&e.message.startsWith('f16_')?e.message:'f16_unexpected_error'
  console.error(JSON.stringify(info('BLOCKED',code)))
  process.exitCode=2
 }
}
