// PAZO F16 — local-only, one existing BOUND Sandbox subscription.
// --preflight is READ ONLY. --approve-and-cancel needs explicit separate PO GO.
// No new user, intent, subscription, plan, charge API, capture, ledger, grants,
// cron, Edge deployment or PayPal Live. No approval URL/token in JSON or Git.
import {existsSync,readFileSync,writeFileSync} from 'node:fs'
import {homedir} from 'node:os'
import {join} from 'node:path'
import {pathToFileURL} from 'node:url'
import {createInterface} from 'node:readline/promises'
import {stdin as input,stdout as output} from 'node:process'
import {createClient} from '@supabase/supabase-js'
import {assessPazoSandboxPlan} from '../src/features/supporter/testing/paypalSandboxPlanContract.mjs'
import {assessF16ExistingBuyerSandboxGate} from '../supabase/functions/f16-paypal-webhook/f16ExistingBuyerSandboxGate.mjs'
const HOST='https://api-m.sandbox.paypal.com'
const URL='https://mrybvqdebbgcayuvgkkr.supabase.co'
const PLAN='P-14V25407JP6850922NLHMDKI'
const STATE=join(homedir(),process.platform==='win32'?'AppData\\Local\\PAZO-F16-E2E':'.pazo-f16-e2e','sandbox-state.json')
const RECOVERY_CLAIM=STATE+'.recover-claimed'
const BUYER_CLAIM=STATE+'.buyer-claimed'
const ASCII=/^[\x21-\x7e]{8,4096}$/
const SUB=/^I-[A-Za-z0-9_-]{3,70}$/
const authOptions={auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}}
const out=(phase,reason,extra={})=>Object.freeze({
 environment:'sandbox',step:'existing_bound_buyer_sandbox',
 phase,reason,createdAuthUsers:0,createdIntents:0,createdPayPalSubscriptions:0,
 mayGrantBenefits:false,cycleVerified:false,paidThrough:null,...extra,
})
const emit=x=>console.log(JSON.stringify(x,null,2))
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms))
function config(env){
 const c={id:env.PAYPAL_SANDBOX_CLIENT_ID,secret:env.PAYPAL_SANDBOX_CLIENT_SECRET,
  service:env.PAZO_F16_SUPABASE_SECRET_KEY}
 if(!ASCII.test(c.id||'')||!ASCII.test(c.secret||'')||!ASCII.test(c.service||'')||
  c.id.includes(':'))throw Error('f16_missing_sandbox_private_config')
 return c
}
function load(){
 if(!existsSync(STATE))throw Error('f16_saved_existing_bound_state_missing')
 const state=JSON.parse(readFileSync(STATE,'utf8'))
 if(state?.environment!=='sandbox'||state?.project!==URL||state?.plan!==PLAN||
  state?.recoveryPhase!=='bound_verified'||!SUB.test(state?.subscriptionId||'')||
  !state?.intentId||!state?.authOwnerId)
  throw Error('f16_saved_existing_bound_state_invalid')
 return state
}
function save(state){
 // Local marker contains only pre-existing references and safe lifecycle flags.
 writeFileSync(STATE,JSON.stringify(state,null,2),{encoding:'utf8',mode:0o600})
}
async function merchant(c,method,path,body){
 const oauth=await fetch(HOST+'/v1/oauth2/token',{
  method:'POST',redirect:'error',signal:AbortSignal.timeout(15000),
  headers:{Authorization:'Basic '+btoa(c.id+':'+c.secret),
   Accept:'application/json','Content-Type':'application/x-www-form-urlencoded'},
  body:'grant_type=client_credentials',
 })
 if(!oauth.ok)throw Error('f16_sandbox_oauth_unavailable')
 const auth=await oauth.json()
 if(auth?.token_type!=='Bearer'||typeof auth.access_token!=='string'||
  auth.access_token.length<8)throw Error('f16_sandbox_token_invalid')
 const headers={Authorization:'Bearer '+auth.access_token,Accept:'application/json'}
 if(body!==undefined)headers['Content-Type']='application/json'
 const response=await fetch(HOST+path,{
  method,redirect:'error',signal:AbortSignal.timeout(18000),headers,
  ...(body===undefined?{}:{body:JSON.stringify(body)}),
 })
 if(!response.ok)throw Error('f16_sandbox_merchant_request_failed')
 if(response.status===204)return {}
 const result=await response.json()
 if(!result||typeof result!=='object'||Array.isArray(result))
  throw Error('f16_sandbox_merchant_response_invalid')
 return result
}
function match(state,intent,sub){
 return intent?.id===state.intentId&&
  intent?.owner_id===state.authOwnerId&&
  intent?.plan_id===PLAN&&
  intent?.state==='bound'&&
  intent?.external_subscription_id===state.subscriptionId&&
  sub?.id===state.subscriptionId&&sub?.custom_id===state.intentId&&
  sub?.plan_id===PLAN
}
async function providerSnapshot(c,state){
 const admin=createClient(URL,c.service,authOptions)
 const i=await admin.rpc('f16_paypal_read_private_intent',{p_intent_id:state.intentId})
 if(i.error||!i.data)throw Error('f16_private_bound_read_unavailable')
 const [sub,plan]=await Promise.all([
  merchant(c,'GET','/v1/billing/subscriptions/'+encodeURIComponent(state.subscriptionId)),
  merchant(c,'GET','/v1/billing/plans/'+encodeURIComponent(PLAN)),
 ])
 if(!match(state,i.data,sub))
  throw Error('f16_existing_bound_merchant_or_owner_mismatch')
 const check=assessPazoSandboxPlan(plan)
 if(!check.ok||check.warnings.length||
  plan.quantity_supported===true||
  sub.plan_overridden!==false||sub.quantity!=='1')
  throw Error('f16_existing_bound_plan_terms_changed')
 return {intent:i.data,sub,plan}
}
async function cancellation(c,state){
 let latest
 try{
  const {sub}=await providerSnapshot(c,state)
  latest=sub
  if(sub.status==='CANCELLED'){
   save({...state,phase:'buyer_cancelled'})
   return out('cancelled','existing_sandbox_subscription_already_cancelled',
    {cancellationConfirmed:true})
  }
  if(!['ACTIVE','SUSPENDED'].includes(sub.status))
   return out('not_cancellable','paypal_status_does_not_allow_cancel',
    {subscriptionStatus:['APPROVAL_PENDING','APPROVED','EXPIRED'].includes(sub.status)?
     sub.status:'UNKNOWN',cancellationConfirmed:false})
  // Exactly ONE supported POST against the original subscription (no retries).
  await merchant(c,'POST','/v1/billing/subscriptions/'+encodeURIComponent(state.subscriptionId)+
   '/cancel',{reason:'PAZO approved one-test Sandbox E2E cleanup'})
  for(let i=0;i<3;i++){
   const after=await merchant(c,'GET',
    '/v1/billing/subscriptions/'+encodeURIComponent(state.subscriptionId))
   if(!match(state,{
    id:state.intentId,owner_id:state.authOwnerId,plan_id:PLAN,
    state:'bound',external_subscription_id:state.subscriptionId,
   },after))throw Error('f16_cancelled_subscription_mismatch')
   if(after.status==='CANCELLED'){
    save({...state,phase:'buyer_cancelled'})
    return out('cancelled','same_sandbox_subscription_cancellation_verified',
     {cancellationConfirmed:true})
   }
   if(i<2)await wait(1200)
  }
  return out('cancel_unverified','manual_status_read_required',
   {cancellationConfirmed:false})
 }catch{
  return out('cancel_unverified','manual_status_read_required',
   {cancellationConfirmed:false,merchantWasActive:latest?.status==='ACTIVE'})
 }
}
export async function buyerPreflight(env=process.env){
 if(existsSync(BUYER_CLAIM))throw Error('f16_existing_buyer_test_already_claimed')
 if(!existsSync(RECOVERY_CLAIM))throw Error('f16_original_binding_recovery_proof_missing')
 const c=config(env),state=load()
 const {intent,sub,plan}=await providerSnapshot(c,state)
 const decision=assessF16ExistingBuyerSandboxGate({
  state,privateIntent:intent,subscription:sub,plan,
 })
 return out(decision.readyForBuyer?'read_only_ready':'read_only_blocked',
  decision.reason,{
   boundOwnerVerified:decision.merchantSubscriptionBound,
   originalSubscriptionApprovalPending:decision.subscriptionStatus==='APPROVAL_PENDING',
   originalPlanValidated:decision.plan299MonthlyConsistent,
   approvalLinkAvailable:decision.approvalLinkAvailable,
   networkWrites:0,
  })
}
export async function runBuyerOnce(env=process.env){
 if(env.PAZO_F16_BUYER_SANDBOX_GO!=='ONE_EXISTING_BOUND_APPROVAL_AND_CANCEL')
  throw Error('f16_explicit_buyer_approval_and_cancel_go_required')
 if(existsSync(BUYER_CLAIM))throw Error('f16_existing_buyer_test_already_claimed')
 if(!existsSync(RECOVERY_CLAIM))throw Error('f16_original_binding_recovery_proof_missing')
 const c=config(env),state=load()
 const {intent,sub,plan}=await providerSnapshot(c,state)
 const decision=assessF16ExistingBuyerSandboxGate({
  state,privateIntent:intent,subscription:sub,plan,
 })
 if(decision.readyForBuyer!==true)
  throw Error('f16_existing_bound_buyer_preflight_blocked')
 const link=sub.links.filter(x=>x?.rel==='approve')
 if(link.length!==1)throw Error('f16_sandbox_buyer_link_missing')
 // One-shot claim MUST happen before displaying URL or allowing buyer action.
 try{
  writeFileSync(BUYER_CLAIM,'existing_bound_sandbox_buyer_approval_once\n',{
   flag:'wx',encoding:'utf8',mode:0o600,
  })
 }catch{throw Error('f16_existing_buyer_claim_already_reserved')}
 save({...state,phase:'buyer_approval_prompted'})
 emit(out('awaiting_buyer','approve_once_with_personal_sandbox_only'))
 console.log('PRIVATE SANDBOX BUYER LINK, OPEN LOCALLY; NEVER PASTE INTO CHAT:')
 console.log(link[0].href)
 const rl=createInterface({input,output})
 try{
  await rl.question('Approve ONCE using PERSONAL PayPal Sandbox, then press Enter. If declined, press Enter without approving: ')
 }finally{rl.close()}
 let status='UNKNOWN'
 try{
  for(let i=0;i<5;i++){
   const after=await merchant(c,'GET',
    '/v1/billing/subscriptions/'+encodeURIComponent(state.subscriptionId))
   if(!match(state,intent,after))
    throw Error('f16_after_buyer_reference_mismatch')
   status=after.status
   if(['ACTIVE','CANCELLED','SUSPENDED'].includes(status))break
   if(i<4)await wait(1800)
  }
  if(status==='ACTIVE'){
   save({...state,phase:'buyer_approved_active'})
   emit(out('active','buyer_activation_seen_not_payment_cycle_proof',
    {subscriptionActive:true}))
  }else emit(out('buyer_state_unconfirmed',
   'no_verified_active_subscription_or_payment',
   {subscriptionStatus:['APPROVAL_PENDING','APPROVED','CANCELLED','EXPIRED'].includes(status)?
    status:'UNKNOWN'}))
 }catch{
  emit(out('buyer_state_unconfirmed','merchant_read_failed_after_buyer',
   {requiresCancellationRecovery:true}))
 }
 // Independent safety-first cleanup after buyer action, including cases
 // where ACTIVE was observed but later exception occurred. Never auto-grant.
 emit(await cancellation(c,load()))
 return out('test_end','no_ledger_or_entitlements_credited')
}
export async function cancelBuyerExistingOnly(env=process.env){
 if(env.PAZO_F16_BUYER_CLEANUP_GO!=='ONE_EXISTING_ACTIVE_CANCEL_ONLY')
  throw Error('f16_explicit_existing_buyer_cancel_go_required')
 if(!existsSync(BUYER_CLAIM))
  throw Error('f16_no_original_buyer_approval_attempt_to_cleanup')
 const c=config(env),state=load()
 return cancellation(c,state)
}
async function main(){
 const mode=process.argv[2]??'--preflight'
 if(mode==='--preflight'){emit(await buyerPreflight());return}
 if(mode==='--approve-and-cancel'){emit(await runBuyerOnce());return}
 if(mode==='--cancel-only'){emit(await cancelBuyerExistingOnly());return}
 throw Error('f16_unsupported_buyer_test_mode')
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{await main()}
 catch(e){
  const reason=e instanceof Error&&e.message.startsWith('f16_')?
   e.message:'f16_existing_buyer_unexpected_error'
  console.error(JSON.stringify(out('BLOCKED',reason)))
  process.exitCode=2
 }
}
