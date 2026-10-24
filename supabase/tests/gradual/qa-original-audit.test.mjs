import test from 'node:test'
import assert from 'node:assert/strict'
import {createPaypalLiveMerchantEvidenceReader} from '../../functions/pazo-paypal-live-webhook/liveMerchantEvidence.mjs'
import {createPazoLivePrivateWorkerHttp} from '../../functions/pazo-paypal-live-worker/privateWorkerHttp.mjs'
const sub='I-QAORIGINAL',intent='intent-00000000-0000-4000-8000-000000000001',plan='P-ABCDEFGHIJKL1234'
const args={subscriptionId:sub,intentId:intent,expectedGeneration:1,createdAt:'2026-10-23T18:00:00.000Z',now:'2026-10-23T23:00:00.000Z'}
const approvedPlan={id:plan,status:'ACTIVE',billing_cycles:[{tenure_type:'REGULAR',sequence:1,total_cycles:0,frequency:{interval_unit:'MONTH',interval_count:1},pricing_scheme:{fixed_price:{currency_code:'USD',value:'2.99'}}}],payment_preferences:{auto_bill_outstanding:false}}
function reader({transactions=[],totalItems=transactions.length,totalPages=1,links=[],override={},calls=[]}={}){
 const fetchImpl=async(url,options)=>{
  calls.push({url,method:options.method})
  let value=url.endsWith('/token')?{token_type:'Bearer',access_token:'synthetic_private_token'}:
   url.includes('/transactions?')?{transactions,total_items:totalItems,total_pages:totalPages,links}:
   url.includes('/plans/')?approvedPlan:{id:sub,plan_id:plan,custom_id:intent,status:'APPROVAL_PENDING',status_update_time:'2026-10-23T18:00:00Z',create_time:'2026-10-23T18:00:00Z',subscriber:{email_address:'must-not-leak@example.invalid'},...override}
  return new Response(JSON.stringify(value),{headers:{'content-type':'application/json'}})
 }
 return createPaypalLiveMerchantEvidenceReader({merchantGeneration:1,planId:plan,clientId:'synthetic_client_id',clientSecret:'synthetic_client_secret',fetchImpl})
}
test('original audit verifies complete zero transactions, original plan and emits no identifiers/PII',async()=>{
 const calls=[],r=await reader({calls}).readOriginalQaAudit(args)
 assert.equal(r.transactionsComplete,true);assert.equal(r.transactionCount,0);assert.equal(r.statusUpdatedAt,'2026-10-23T18:00:00.000Z')
 for(const value of [sub,intent,plan,'must-not-leak','synthetic_private_token','synthetic_client_secret'])assert.equal(JSON.stringify(r).includes(value),false)
 assert.deepEqual(calls.map(x=>x.method),['POST','GET','GET','GET'])
 assert.equal(calls.filter(x=>x.method==='POST')[0].url,'https://api-m.paypal.com/v1/oauth2/token')
})
test('any completed payment remains visible and is never represented as no-charge QA',async()=>{
 const r=await reader({transactions:[{id:'SALE-REAL',status:'COMPLETED'}],override:{status:'ACTIVE',billing_info:{last_payment:{},next_billing_time:'2026-11-23T18:00:00Z'}}}).readOriginalQaAudit(args)
 assert.equal(r.completedPayments,1);assert.equal(r.status,'ACTIVE');assert.equal(r.lastPaymentPresent,true);assert.equal(r.mayCancel,false)
})
test('partial, duplicate, redirected pagination, binding mismatch and stale ranges fail closed',async()=>{
 for(const config of [{totalItems:1},{transactions:[{id:'SALE-ONE'},{id:'SALE-ONE'}]},{links:[{rel:'next',method:'GET',href:'https://evil.invalid/'}]},{override:{plan_id:'P-OTHER1234567890'}}])
  await assert.rejects(()=>reader(config).readOriginalQaAudit(args))
 await assert.rejects(()=>reader().readOriginalQaAudit({...args,createdAt:'2026-01-01T00:00:00.000Z'}))
})
test('missing remote status update time remains unknown, never invented from create time',async()=>{
 const r=await reader({override:{status_update_time:undefined}}).readOriginalQaAudit(args)
 assert.equal(r.statusUpdatedAt,null)
})
test('private audit requires capability and never invokes financial workers or maintenance',async()=>{
 let admitted=0,audited=0,completed
 const handler=createPazoLivePrivateWorkerHttp({released:true,admit:async()=>{admitted++;return {authenticated:true,enabled:true,busy:false,leaseToken:'00000000-0000-4000-8000-000000000001',expectedBuild:'pazo_live_worker_v2',processingAllowed:true,event:null}},
 complete:async x=>{completed=x;return true},workers:{sale:()=>assert.fail(),refund:()=>assert.fail(),lifecycle:()=>assert.fail()},auditOriginalQa:async()=>{audited++;return {source:'original_qa_provider_audit_v1',mayCreate:false}}})
 const req=(auth)=>new Request('https://edge.invalid/functions/v1/pazo-paypal-live-worker',{method:'POST',headers:{'content-type':'application/json',...(auth?{authorization:'Bearer '+'a'.repeat(64)}:{})},body:'{"action":"qa_audit"}'})
 assert.equal((await handler(req(false))).status,403);assert.equal(admitted,0)
 const result=await(await handler(req(true))).json();assert.equal(result.audit.mayCreate,false);assert.equal(audited,1);assert.equal(completed.maintenanceAllowed,false)
})

test('audit failures expose only closed stages, never arbitrary exception/provider data',async()=>{
 const {createOriginalQaAudit}=await import('../../functions/pazo-paypal-live-worker/qaOriginalAudit.mjs')
 const r=await createOriginalQaAudit({rpc:async()=>{throw Error('secret-and-payer@example.invalid')}})()
 assert.equal(r.complete,false);assert.equal(r.code,'qa_scope_read_unavailable');assert.equal(JSON.stringify(r).includes('secret-and-payer'),false)
})

test('read failure preserves only HTTP category/status and never PayPal error bodies',async()=>{
 const r=createPaypalLiveMerchantEvidenceReader({merchantGeneration:1,planId:plan,clientId:'synthetic_client_id',clientSecret:'synthetic_client_secret',fetchImpl:async url=>url.includes('/plans/')?Response.json(approvedPlan):url.endsWith('/token')?new Response(JSON.stringify({token_type:'Bearer',access_token:'synthetic_private_token'}),{headers:{'content-type':'application/json'}}):new Response('{"payer":"never expose","id":"private-provider-id"}',{status:404,headers:{'content-type':'application/json'}})})
 await assert.rejects(()=>r.readOriginalQaAudit(args),e=>e.qaStage==='subscription_get'&&e.providerHttpStatus===404&&e.providerFailure==='http'&&!e.message.includes('private-provider'))
})

test('independent signed event can be corroborated even when current subscription GET is 404',async()=>{
 const {createOriginalQaAudit}=await import('../../functions/pazo-paypal-live-worker/qaOriginalAudit.mjs')
 const scope={source:'original_prebeta_qa_scope_v1',sourceEnvironment:'live',ownerId:'owner',subscriptionId:sub,intentId:intent,planId:plan,merchantGeneration:1,event:{eventId:'WH-ORIGINAL',type:'BILLING.SUBSCRIPTION.CREATED',subjectId:sub,providerEventAt:'2026-10-23T18:00:00.000Z',subjectAt:'2026-10-23T18:00:00.000Z'}}
 const r=await createOriginalQaAudit({rpc:async()=>scope,historical:{findBoundSubscription:async()=>({...scope,consentVerified:true}),readerForGeneration:async()=>({readOriginalQaAudit:async()=>{throw Object.assign(Error('PRIVATE'),{qaStage:'subscription_get',providerHttpStatus:404,providerFailure:'http',originalPlanVerified:true})}}),eventReaderForGeneration:async()=>async()=>({verifiedProviderRead:true,subscriptionId:sub,subjectId:sub,providerEventAt:'2026-10-23T18:00:00Z',subjectAt:'2026-10-23T18:00:00Z'})}})()
 assert.equal(r.complete,false);assert.equal(r.providerHttpStatus,404);assert.equal(r.signedEventMatches,true);assert.equal(r.originalPlanVerified,true);assert.equal(JSON.stringify(r).includes('PRIVATE'),false)
})

test('processing OFF cannot run the original QA reconciliation',async()=>{
 const handler=createPazoLivePrivateWorkerHttp({released:true,admit:async()=>({authenticated:true,enabled:true,busy:false,leaseToken:'00000000-0000-4000-8000-000000000001',expectedBuild:'pazo_live_worker_v2',processingAllowed:false,event:null}),complete:async p=>{assert.equal(p.maintenanceAllowed,false);return true},workers:{sale:()=>assert.fail(),refund:()=>assert.fail(),lifecycle:()=>assert.fail()},reconcileOriginalQa:()=>assert.fail()})
 const r=await handler(new Request('https://edge.invalid/functions/v1/pazo-paypal-live-worker',{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+'a'.repeat(64)},body:'{"action":"qa_reconcile"}'}))
 assert.equal((await r.json()).code,'worker_qa_processing_off')
})

test('an unresolved original provider read reports review rather than a healthy reconciliation',async()=>{
 let completion
 const handler=createPazoLivePrivateWorkerHttp({released:true,admit:async()=>({authenticated:true,enabled:true,busy:false,leaseToken:'00000000-0000-4000-8000-000000000001',expectedBuild:'pazo_live_worker_v2',processingAllowed:true,event:null}),complete:async p=>{completion=p;return true},workers:{sale:()=>assert.fail(),refund:()=>assert.fail(),lifecycle:()=>assert.fail()},reconcileOriginalQa:async()=>({complete:false,providerHttpStatus:404,reconciliationCode:'qa_provider_review_required'})})
 const r=await handler(new Request('https://edge.invalid/functions/v1/pazo-paypal-live-worker',{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+'a'.repeat(64)},body:'{"action":"qa_reconcile"}'}))
 assert.equal((await r.json()).outcome,'review');assert.equal(completion.outcome,'review');assert.equal(completion.maintenanceAllowed,false)
})
