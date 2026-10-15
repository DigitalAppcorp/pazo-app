// F16 read-only local Sandbox correlation. Never display event/transaction identifiers.
import {readFileSync} from 'node:fs'
import {homedir} from 'node:os'
import {join} from 'node:path'
import {createPaypalSandboxSubscriptionReader} from '../supabase/functions/f16-paypal-webhook/paypalSandboxTransactions.mjs'
import {compareF16SandboxSaleEvidence} from '../supabase/functions/f16-paypal-webhook/f16SandboxSaleWebhookComparator.mjs'
const out=(phase,reason)=>({phase,reason,environment:'sandbox',networkPaymentWrites:0,dbWrites:0,mayGrantBenefits:false,mayRecordPayment:false,cycleVerified:false,paidThrough:null})
const state=JSON.parse(readFileSync(join(homedir(),'AppData','Local','PAZO-F16-E2E','sandbox-state.json'),'utf8'))
async function main(){
 if(state.environment!=='sandbox'||state.recoveryPhase!=='bound_verified'||state.phase!=='buyer_cancelled')throw Error('original_sandbox_state_invalid')
 const cid=process.env.PAYPAL_SANDBOX_CLIENT_ID,secret=process.env.PAYPAL_SANDBOX_CLIENT_SECRET
 const eventId=process.env.PAZO_F16_SIGNED_WEBHOOK_EVENT_ID
 if(!cid||!secret)throw Error('private_credentials_missing')
 // Event ID is copied locally from a READ ONLY SQL query of the signed inbox.
 // Do not put this identifier in Git, chat, shell history or application logs.
 if(!/^[A-Za-z0-9._-]{3,128}$/.test(eventId||''))throw Error('local_signed_event_reference_required')
 const reader=createPaypalSandboxSubscriptionReader({clientId:cid,clientSecret:secret})
 const data=await reader.read({subscriptionId:state.subscriptionId,startTime:'2026-10-13T00:00:00Z',endTime:'2026-10-16T00:00:00Z'})
 if(data.subscription.custom_id!==state.intentId||data.subscription.plan_id!==state.plan)throw Error('subscription_binding_mismatch')
 const tx=data.transactions.filter(t=>t.status==='COMPLETED'&&t.amount_with_breakdown?.gross_amount?.value==='2.99'&&t.amount_with_breakdown?.gross_amount?.currency_code==='USD')
 if(tx.length!==1)throw Error('expected_single_sale_not_verified')
 const host='https://api-m.sandbox.paypal.com'
 const auth=await fetch(host+'/v1/oauth2/token',{method:'POST',redirect:'error',headers:{Authorization:'Basic '+btoa(cid+':'+secret),'Content-Type':'application/x-www-form-urlencoded'},body:'grant_type=client_credentials'})
 if(!auth.ok)throw Error('sandbox_oauth_failed')
 const bearer=(await auth.json()).access_token
 if(!bearer)throw Error('sandbox_oauth_invalid')
 const response=await fetch(host+'/v1/notifications/webhooks-events/'+encodeURIComponent(eventId),{redirect:'error',headers:{Authorization:'Bearer '+bearer,Accept:'application/json'}})
 if(!response.ok)throw Error('sandbox_event_fetch_unavailable')
 const event=await response.json()
 const decision=compareF16SandboxSaleEvidence({subscription:data.subscription,transaction:tx[0],event,inboxEventId:eventId})
 console.log(JSON.stringify({...out(decision.phase,decision.reason),paginationMetadataComplete:data.paginationMetadataComplete,inboxReferenceSource:'operator_local_sql_not_api_attested',signedInboxProcessingNotChanged:true},null,2))
}
try{await main()}catch(e){console.log(JSON.stringify(out('BLOCKED',e?.message?.startsWith('private_')?e.message:'read_only_correlation_unavailable'),null,2));process.exitCode=2}
