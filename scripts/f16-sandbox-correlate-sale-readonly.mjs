// F16 — one existing cancelled Sandbox subscription, READ ONLY diagnostic.
// Never display webhook ID, sale ID, account data, OAuth tokens or raw API errors.
import {readFileSync} from 'node:fs'
import {homedir} from 'node:os'
import {join} from 'node:path'
import {createPaypalSandboxSubscriptionReader} from '../supabase/functions/f16-paypal-webhook/paypalSandboxTransactions.mjs'
import {compareF16SandboxSaleEvidence} from '../supabase/functions/f16-paypal-webhook/f16SandboxSaleWebhookComparator.mjs'
const HOST='https://api-m.sandbox.paypal.com'
const window={startTime:'2026-10-13T00:00:00Z',endTime:'2026-10-16T00:00:00Z'}
const out=(phase,reason,stage,extra={})=>({
 phase,reason,stage,environment:'sandbox',networkPaymentWrites:0,dbWrites:0,
 mayGrantBenefits:false,mayRecordPayment:false,cycleVerified:false,
 paidThrough:null,...extra,
})
async function main(){
 let stage='local_state',reason='local_state_unavailable'
 try{
  const state=JSON.parse(readFileSync(join(homedir(),'AppData','Local',
   'PAZO-F16-E2E','sandbox-state.json'),'utf8'))
  reason='original_sandbox_state_invalid'
  if(state.environment!=='sandbox'||state.recoveryPhase!=='bound_verified'||
    state.phase!=='buyer_cancelled'||!/^I-[A-Za-z0-9_-]{3,70}$/.test(state.subscriptionId||''))
    throw Error('blocked')
  stage='local_configuration';reason='private_credentials_missing'
  const cid=process.env.PAYPAL_SANDBOX_CLIENT_ID
  const secret=process.env.PAYPAL_SANDBOX_CLIENT_SECRET
  if(!cid||!secret)throw Error('blocked')
  reason='local_signed_event_reference_required'
  const eventId=process.env.PAZO_F16_SIGNED_WEBHOOK_EVENT_ID
  if(!/^[A-Za-z0-9._-]{3,128}$/.test(eventId||''))throw Error('blocked')
  stage='merchant_transaction_read';reason='merchant_transaction_read_unavailable'
  const reader=createPaypalSandboxSubscriptionReader({clientId:cid,clientSecret:secret})
  const data=await reader.read({subscriptionId:state.subscriptionId,...window})
  stage='merchant_sale_validation';reason='subscription_binding_mismatch'
  if(data.subscription.custom_id!==state.intentId||data.subscription.plan_id!==state.plan)
    throw Error('blocked')
  reason='single_completed_sale_not_verified'
  const tx=data.transactions.filter(t=>t.status==='COMPLETED'&&
    t.amount_with_breakdown?.gross_amount?.value==='2.99'&&
    t.amount_with_breakdown?.gross_amount?.currency_code==='USD')
  if(tx.length!==1)throw Error('blocked')
  stage='paypal_oauth';reason='sandbox_oauth_request_failed'
  const auth=await fetch(HOST+'/v1/oauth2/token',{
   method:'POST',redirect:'error',signal:AbortSignal.timeout(15000),
   headers:{Authorization:'Basic '+btoa(cid+':'+secret),
    'Content-Type':'application/x-www-form-urlencoded',Accept:'application/json'},
   body:'grant_type=client_credentials',
  })
  if(!auth.ok){reason='sandbox_oauth_http_'+auth.status;throw Error('blocked')}
  reason='sandbox_oauth_invalid'
  const token=await auth.json()
  if(token?.token_type?.toLowerCase()!=='bearer'||
    typeof token.access_token!=='string'||token.access_token.length<8)
    throw Error('blocked')
  stage='paypal_event_get';reason='sandbox_event_request_failed'
  const response=await fetch(HOST+'/v1/notifications/webhooks-events/'+
   encodeURIComponent(eventId),{
    method:'GET',redirect:'error',signal:AbortSignal.timeout(15000),
    headers:{Authorization:'Bearer '+token.access_token,Accept:'application/json'},
   })
  if(!response.ok){reason='sandbox_event_http_'+response.status;throw Error('blocked')}
  stage='paypal_event_decode';reason='sandbox_event_response_invalid'
  const event=await response.json()
  if(!event||typeof event!=='object'||Array.isArray(event))throw Error('blocked')
  stage='evidence_comparison'
  const decision=compareF16SandboxSaleEvidence({
   subscription:data.subscription,transaction:tx[0],event,inboxEventId:eventId,
  })
  console.log(JSON.stringify({...out(decision.phase,decision.reason,stage), 
   paginationMetadataComplete:data.paginationMetadataComplete,
   inboxReferenceSource:'operator_local_sql_not_api_attested',
   signedInboxProcessingNotChanged:true},null,2))
  if(decision.phase!=='MATCH')process.exitCode=1
 }catch{
  console.log(JSON.stringify(out('BLOCKED',reason,stage),null,2))
  process.exitCode=2
 }
}
await main()
