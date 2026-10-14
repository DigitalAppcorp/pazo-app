// PAZO F16: ONE approved change to the EXISTING PayPal Sandbox webhook.
// Local machine ONLY. PowerShell prompts privately for credentials and confirmation.
// Never prints a provider body, URL, token, credential, payload or payer information.
import {inspectCredentialFormat} from '../src/features/supporter/testing/paypalSandboxCredentialDiagnostics.mjs'
import {PAZO_SANDBOX_PLAN_ID} from '../src/features/supporter/testing/paypalSandboxPlanContract.mjs'
import {PAZO_SANDBOX_WEBHOOK_ID} from '../src/features/supporter/testing/paypalSandboxWebhookDestinationContract.mjs'
import {
 buildApprovedF16WebhookPatch,sameWebhookSnapshot,verifiedF16WebhookConfiguration,
} from '../src/features/supporter/testing/paypalSandboxWebhookPatchContract.mjs'

const HOST='https://api-m.sandbox.paypal.com'
const planPath='/v1/billing/plans/'+PAZO_SANDBOX_PLAN_ID
const webhookPath='/v1/notifications/webhooks/'+PAZO_SANDBOX_WEBHOOK_ID
const announce=(status,detail)=>console.log(JSON.stringify({
 environment:'sandbox',webhookIdMatches:true,status,detail,
 readOnly:false,changesLive:false,checkoutEnabled:false,entitlementsEnabled:false,
},null,2))
const errorMessage=e=>e instanceof Error&&/^[a-z_]{3,50}$/.test(e.message)?
 e.message:'provider_or_network_error'
async function request(path,options){
 const response=await fetch(HOST+path,{
  ...options,redirect:'error',signal:AbortSignal.timeout(12000),
 })
 if(!response?.ok)throw Error('paypal_request_failed')
 return response.json()
}
async function run(){
 if(process.env.PAZO_F16_WEBHOOK_PATCH_ACK!=='APLICAR') {
  console.error('BLOCKED: explicit_local_confirmation_required')
  process.exitCode=1
  return
 }
 const id=process.env.PAYPAL_SANDBOX_CLIENT_ID
 const secret=process.env.PAYPAL_SANDBOX_CLIENT_SECRET
 const format=inspectCredentialFormat(id,secret)
 if(!format.ok){
  console.error('BLOCKED: sandbox_credentials_invalid_format')
  process.exitCode=1
  return
 }
 let stage='oauth'
 let wrote=false
 try{
  const token=await request('/v1/oauth2/token',{
   method:'POST',
   headers:{Authorization:'Basic '+Buffer.from(id+':'+secret,'utf8').toString('base64'),
    Accept:'application/json','Content-Type':'application/x-www-form-urlencoded'},
   body:'grant_type=client_credentials',
  })
  if(token?.token_type?.toLowerCase()!=='bearer'||
     typeof token.access_token!=='string'||!token.access_token)
   throw Error('oauth_invalid')
  const headers={Authorization:'Bearer '+token.access_token,Accept:'application/json'}
  stage='resource_preflight'
  const plan=await request(planPath,{method:'GET',headers})
  const initial=await request(webhookPath,{method:'GET',headers})
  const approval=buildApprovedF16WebhookPatch(plan,initial)
  if(approval.status==='already_configured') {
   announce('already_configured','no_change_needed')
   return
  }
  stage='drift_recheck'
  const latest=await request(webhookPath,{method:'GET',headers})
  if(!sameWebhookSnapshot(initial,latest) ||
     buildApprovedF16WebhookPatch(plan,latest).status!=='patch_required')
    throw Error('webhook_changed_during_preflight')
  stage='patch'
  wrote=true // Unknown outcome on any network failure after sending: NEVER auto-retry.
  const patched=await request(webhookPath,{
   method:'PATCH',
   headers:{...headers,'Content-Type':'application/json'},
   body:JSON.stringify(approval.patch),
  })
  if(!verifiedF16WebhookConfiguration(patched))
   throw Error('patch_response_needs_review')
  stage='postflight'
  const final=await request(webhookPath,{method:'GET',headers})
  if(!verifiedF16WebhookConfiguration(final))
   throw Error('postflight_needs_review')
  announce('updated_and_verified','same_webhook_nine_events_f16_destination')
 }catch(error){
  // Do not blindly retry: the PATCH may have reached PayPal even if it timed out.
  const outcome=wrote?'mutation_outcome_uncertain_manual_review':'no_mutation_attempted'
  console.error(JSON.stringify({
   environment:'sandbox',status:'blocked',stage,reason:errorMessage(error),
   outcome,doNotRetryWithoutReadOnlyVerification:true,
  }))
  process.exitCode=wrote?3:2
 }
}
await run()
