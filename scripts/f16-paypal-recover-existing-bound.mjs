// PAZO F16. ONE-SHOT local recovery of the ALREADY CREATED Sandbox subscription.
// --preflight: remotely READ ONLY. --bind-existing: ONE narrowly scoped Auth
// credential rotation on a verified disposable QA account + ONE existing intent
// binding; REQUIRES explicit PO approval BEFORE invocation.
// NEVER creates another Auth user, intent, PayPal subscription/payment.
// NEVER prints identifiers, Auth email, credentials, token or approval URL.
// No Live/worker/entitlements/paidThrough/cancel/approve actions.
import {randomBytes} from 'node:crypto'
import {existsSync,readFileSync,writeFileSync} from 'node:fs'
import {homedir} from 'node:os'
import {join} from 'node:path'
import {pathToFileURL} from 'node:url'
import {createClient} from '@supabase/supabase-js'
import {assessF16ExistingSandboxRecoveryGate} from '../supabase/functions/f16-paypal-webhook/f16ExistingSandboxRecoveryGate.mjs'
import {createF16BoundSandboxIntentCoordinator} from '../supabase/functions/f16-paypal-webhook/f16BoundSandboxIntentCoordinator.mjs'
import {createVerifiedAuthOwnerResolver} from '../supabase/functions/f16-paypal-webhook/verifiedAuthOwner.mjs'

const URL='https://mrybvqdebbgcayuvgkkr.supabase.co'
const HOST='https://api-m.sandbox.paypal.com'
const PLAN='P-14V25407JP6850922NLHMDKI'
const FILE=join(homedir(),process.platform==='win32'?'AppData\\Local\\PAZO-F16-E2E':'.pazo-f16-e2e','sandbox-state.json')
const SECRET=/^[\x21-\x7e]{8,4096}$/
const options={auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}}
const result=(phase,reason)=>Object.freeze({
 environment:'sandbox',step:'existing_binding_recovery',
 phase,reason,
 createdAuthUsers:0,createdIntents:0,createdPayPalSubscriptions:0,
 approvedPayPalSubscriptions:0,cancelledSubscriptions:0,
 mayGrantBenefits:false,paidThrough:null,financialHistoryComplete:false,
})
const log=x=>console.log(JSON.stringify(x,null,2))
function readSaved(){
 if(!existsSync(FILE))throw Error('f16_original_sandbox_state_missing')
 const v=JSON.parse(readFileSync(FILE,'utf8'))
 if(v?.environment!=='sandbox'||v?.project!==URL||v?.plan!==PLAN)
  throw Error('f16_original_sandbox_state_not_valid')
 return v
}
function updateSaved(state){
 // The original file is never deleted or reset, even on failure.
 writeFileSync(FILE,JSON.stringify(state,null,2),{encoding:'utf8',mode:0o600})
}
function secrets(env){
 const v={merchantId:env.PAYPAL_SANDBOX_CLIENT_ID,
  merchantSecret:env.PAYPAL_SANDBOX_CLIENT_SECRET,
  supabase:env.PAZO_F16_SUPABASE_SECRET_KEY}
 if(!SECRET.test(v.merchantId||'')||
  !SECRET.test(v.merchantSecret||'')||
  !SECRET.test(v.supabase||'')||
  v.merchantId.includes(':'))throw Error('f16_local_private_keys_missing')
 return v
}
async function merchant(c,path){
 const a=await fetch(HOST+'/v1/oauth2/token',{
  method:'POST',redirect:'error',signal:AbortSignal.timeout(14000),
  headers:{Authorization:'Basic '+btoa(c.merchantId+':'+c.merchantSecret),
   Accept:'application/json','Content-Type':'application/x-www-form-urlencoded'},
  body:'grant_type=client_credentials',
 })
 if(!a.ok)throw Error('f16_sandbox_read_auth_unavailable')
 const token=await a.json()
 if(token?.token_type!=='Bearer'||typeof token?.access_token!=='string')
  throw Error('f16_sandbox_read_auth_unusable')
 const r=await fetch(HOST+path,{
  method:'GET',redirect:'error',signal:AbortSignal.timeout(14000),
  headers:{Authorization:'Bearer '+token.access_token,Accept:'application/json'},
 })
 if(!r.ok)throw Error('f16_sandbox_read_unavailable')
 const v=await r.json()
 if(!v||typeof v!=='object'||Array.isArray(v))
  throw Error('f16_sandbox_read_invalid')
 return v
}
async function inspect(c,state){
 const admin=createClient(URL,c.supabase,options)
 const a=await admin.auth.admin.getUserById(state.authOwnerId)
 if(a.error||!a.data?.user)
  throw Error('f16_disposable_auth_read_unavailable')
 const i=await admin.rpc('f16_paypal_read_private_intent',{
  p_intent_id:state.intentId,
 })
 if(i.error||!i.data)throw Error('f16_private_intent_read_unavailable')
 const sub=await merchant(c,
  '/v1/billing/subscriptions/'+encodeURIComponent(state.subscriptionId))
 const plan=await merchant(c,'/v1/billing/plans/'+encodeURIComponent(PLAN))
 const gate=assessF16ExistingSandboxRecoveryGate({
  savedState:state,authUser:a.data.user,
  privateIntent:i.data,subscription:sub,plan,
 })
 return {gate,admin}
}
export async function preflightExistingRecovery(env=process.env){
 const c=secrets(env),state=readSaved()
 const {gate}=await inspect(c,state)
 return Object.freeze({
  ...result(gate.safeToBind?'read_only_ready':'read_only_blocked',gate.reason),
  disposableAuthVerified:gate.safeToReauthenticate,
  pendingMerchantAndIntentCorrelated:gate.safeToBind,
  networkWrites:0,
 })
}
export async function bindExistingRecovery(env=process.env){
 const c=secrets(env),state=readSaved()
 const {gate,admin}=await inspect(c,state)
 if(gate.safeToReauthenticate!==true||gate.safeToBind!==true)
  throw Error('f16_existing_binding_preflight_blocked')
 // The marker is written BEFORE any hosted write. Uncertain success NEVER
 // permits a second automatic password reset or provider action.
 updateSaved({...state,recoveryPhase:'auth_recovery_requested'})
 const original=await admin.auth.admin.getUserById(state.authOwnerId)
 if(original.error||!original.data?.user)
  throw Error('f16_disposable_auth_recheck_failed')
 // Scope is rechecked against exact stored user before updating password.
 const recheck=assessF16ExistingSandboxRecoveryGate({
  savedState:state,authUser:original.data.user,
  privateIntent:(await admin.rpc('f16_paypal_read_private_intent',{
   p_intent_id:state.intentId,
  })).data,
  subscription:await merchant(c,
   '/v1/billing/subscriptions/'+encodeURIComponent(state.subscriptionId)),
  plan:await merchant(c,'/v1/billing/plans/'+encodeURIComponent(PLAN)),
 })
 if(!recheck.safeToBind)
  throw Error('f16_scope_changed_before_credential_write')
 const password='Q9!'+randomBytes(32).toString('base64url')
 const upd=await admin.auth.admin.updateUserById(state.authOwnerId,{password})
 if(upd.error||upd.data?.user?.id!==state.authOwnerId)
  throw Error('f16_disposable_auth_reset_not_verified')
 // Credentials are ephemeral and never written to FILE or printed.
 const login=createClient(URL,c.supabase,options)
 const signed=await login.auth.signInWithPassword({
  email:original.data.user.email,password,
 })
 if(signed.error||signed.data?.user?.id!==state.authOwnerId||
  !signed.data.session?.access_token)
  throw Error('f16_disposable_auth_login_failed')
 const jwt=signed.data.session.access_token
 const verified=await admin.auth.getUser(jwt)
 if(verified.error||verified.data?.user?.id!==state.authOwnerId)
  throw Error('f16_new_auth_session_not_verified')
 const requestContext={headers:new Headers({Authorization:'Bearer '+jwt})}
 const coordinator=createF16BoundSandboxIntentCoordinator({
  resolveOwnerFromVerifiedSession:createVerifiedAuthOwnerResolver({authClient:admin}),
  newIntentId:()=>{throw Error('f16_must_not_create_another_intent')},
  createPrivateIntent:()=>{throw Error('f16_must_not_create_another_intent')},
  loadPrivateIntent:async intentId=>{
   const r=await admin.rpc('f16_paypal_read_private_intent',{p_intent_id:intentId})
   if(r.error||!r.data)throw Error('f16_private_intent_no_longer_available')
   return {
    id:r.data.id,ownerId:r.data.owner_id,planId:r.data.plan_id,
    state:r.data.state,provider:'paypal',
    externalSubscriptionId:r.data.external_subscription_id,
   }
  },
  readPayPalSubscription:async subscriptionId=>{
   const existing=await readScopeForBinding(c,state,subscriptionId)
   return existing?{
    id:existing.id,plan_id:existing.plan_id,
    custom_id:existing.custom_id,status:existing.status,
   }:null
  },
  bindPrivateIntent:async({ownerId,intentId,subscriptionId,planId})=>{
   const r=await admin.rpc('f16_paypal_bind_private_intent',{
    p_owner_id:ownerId,p_intent_id:intentId,
    p_subscription_id:subscriptionId,p_plan_id:planId,
   })
   if(r.error)throw Error('f16_private_binding_rpc_failed')
   return r.data
  },
 })
 const bound=await coordinator.bind({
  requestContext,intentId:state.intentId,subscriptionId:state.subscriptionId,
 })
 if(!bound.bound||bound.bindingState!=='new_binding')
  throw Error('f16_private_binding_not_verified')
 const check=await admin.rpc('f16_paypal_read_private_intent',{
  p_intent_id:state.intentId,
 })
 if(check.error||check.data?.owner_id!==state.authOwnerId||
  check.data?.state!=='bound'||
  check.data?.external_subscription_id!==state.subscriptionId)
  throw Error('f16_private_binding_postread_mismatch')
 updateSaved({...state,phase:'bound_before_approval',
  recoveryPhase:'bound_verified'})
 return result('bound_verified','original_sandbox_intent_auth_bound_only_no_payment')
}
async function readScopeForBinding(c,state,subId){
 if(subId!==state.subscriptionId)return null
 const [sub,plan]=await Promise.all([
  merchant(c,'/v1/billing/subscriptions/'+encodeURIComponent(subId)),
  merchant(c,'/v1/billing/plans/'+encodeURIComponent(PLAN)),
 ])
 // Exactly same pure merchant term gate, with original Auth and private
 // owner verified separately by the coordinator before the only BOUND write.
 const snapshot=assessF16ExistingSandboxRecoveryGate({
  savedState:state,authUser:await readAuth(c,state),
  privateIntent:await readIntent(c,state),subscription:sub,plan,
 })
 return snapshot.safeToBind?sub:null
}
async function readAuth(c,state){
 const admin=createClient(URL,c.supabase,options)
 const {data,error}=await admin.auth.admin.getUserById(state.authOwnerId)
 if(error)throw Error('f16_auth_owner_recheck_unavailable')
 return data?.user
}
async function readIntent(c,state){
 const admin=createClient(URL,c.supabase,options)
 const {data,error}=await admin.rpc('f16_paypal_read_private_intent',{
  p_intent_id:state.intentId,
 })
 if(error)throw Error('f16_private_intent_recheck_unavailable')
 return data
}
async function main(){
 const action=process.argv[2]??'--preflight'
 if(action==='--preflight'){
  log(await preflightExistingRecovery())
  return
 }
 if(action==='--bind-existing'){
  // No buyer/payment creation happens in this mode, but a credential reset
  // and ONE private BOUND write do occur. Require double explicit local gate.
  if(process.env.PAZO_F16_RECOVERY_WRITE_GO!=='EXISTING_QA_AUTH_AND_INTENT_ONLY')
   throw Error('f16_explicit_existing_test_write_go_required')
  log(await bindExistingRecovery())
  return
 }
 throw Error('f16_unsupported_recovery_action')
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{await main()}
 catch(e){
  const why=e instanceof Error&&e.message.startsWith('f16_')?
   e.message:'f16_recovery_step_unavailable'
  console.error(JSON.stringify(result('BLOCKED',why)))
  process.exitCode=2
 }
}
