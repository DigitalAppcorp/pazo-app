import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createOriginalQaAudit} from '../../functions/pazo-paypal-live-worker/qaOriginalAudit.mjs'
import {createPazoF18AdminOriginalAuditHandler}
 from '../../functions/pazo-admin-paypal-original-audit/handler.mjs'

const data={source:'original_admin_postcampaign_scope_v1',
 sourceEnvironment:'live',ownerId:'owner_private',
 intentId:'intent_private',planId:'plan_private',subscriptionId:'I-PRIVATE',
 merchantGeneration:3,createdAt:'2026-10-25T03:02:38.000Z',
 event:{eventId:'WH-PRIVATE',type:'BILLING.SUBSCRIPTION.CREATED',
  subjectId:'I-PRIVATE',providerEventAt:'2026-10-25T03:02:38.000Z',
  subjectAt:'2026-10-25T03:02:38.000Z'}}
const binding={ownerId:data.ownerId,intentId:data.intentId,planId:data.planId,
 merchantGeneration:3,consentVerified:true}

function runner({scope=data,legacy=false,eventFailure=false,providerFailure=false}={}){
 const calls=[]
 const rpc=async (name,payload)=>{
  calls.push(['rpc',name,payload])
  return {...scope,source:legacy?'original_prebeta_qa_scope_v1':scope.source}
 }
 const historical={
  findBoundSubscription:async()=>binding,
  readerForGeneration:async()=>({readOriginalQaAudit:async()=>{
   if(providerFailure)throw Object.assign(Error('PROVIDER_PRIVATE_DETAILS'),{
    qaStage:'subscription_get',providerHttpStatus:404,providerErrorName:'RESOURCE_NOT_FOUND',
    providerDebugId:'87654321fedcba99'})
   return {source:'original_qa_provider_audit_v1',status:'APPROVAL_PENDING',
    transactionsComplete:true,transactionCount:0,completedPayments:0}
  }}),
  eventReaderForGeneration:async()=>async()=>{
   if(eventFailure)throw Error('EVENT_PRIVATE_DETAILS')
   return {verifiedProviderRead:true,subscriptionId:data.subscriptionId,
    subjectId:data.event.subjectId,providerEventAt:data.event.providerEventAt,
    subjectAt:data.event.subjectAt}
  }
 }
 const run=createOriginalQaAudit({rpc,historical,
  ...(legacy?{}:{scopeVariant:'admin_postcampaign'})})
 return {run,calls}
}

test('post-campaign admin read chooses the new scoped service RPC and independently verifies the signed event',async()=>{
 const {run,calls}=runner()
 const result=await run()
 assert.deepEqual(calls,[['rpc','adminOriginalScope',{}]])
 assert.equal(result.complete,true)
 assert.equal(result.eventReadStage,'verified')
 assert.equal(result.transactionsComplete,true)
})
test('pre-campaign worker behavior is unchanged with original QA scope',async()=>{
 const {run,calls}=runner({legacy:true})
 const result=await run()
 assert.deepEqual(calls,[['rpc','qaOriginalScope',{}]])
 assert.equal(result.complete,true)
 assert.equal(result.eventReadStage,'verified')
})
test('subscription HTTP 404 and webhook GET failure are distinct, with no false settled-payment claim',async()=>{
 const result=await runner({providerFailure:true,eventFailure:true}).run()
 assert.equal(result.code,'qa_provider_read_subscription_get_unavailable')
 assert.equal(result.providerHttpStatus,404)
 assert.equal(result.providerErrorName,'RESOURCE_NOT_FOUND')
 assert.equal(result.eventReadStage,'provider_unavailable')
 assert.equal(result.eventReadable,false)
 assert.equal(result.signedEventMatches,null)
 assert.equal(result.complete,false)
 assert.equal(result.mayGrantBenefits,false)
})
test('invalid scope variant is not silently accepted',()=>{
 assert.throws(()=>createOriginalQaAudit({scopeVariant:'legacy_other'}))
})
test('admin output strips provider debug IDs and sensitive evidence, showing only scoped outcome',async()=>{
 const reader=runner({providerFailure:true,eventFailure:true})
 const handler=createPazoF18AdminOriginalAuditHandler({released:true,
  authenticateAdmin:async()=>({id:'12345678-1234-4234-8234-123456789abc',isAdmin:true,freshSession:true}),
  readOriginalAudit:reader.run
 })
 const request=new Request('https://mrybvqdebbgcayuvgkkr.supabase.co/functions/v1/pazo-admin-paypal-original-audit',{
  method:'POST',
  headers:{origin:'https://pazo-app.vercel.app','content-type':'application/json'},
  body:JSON.stringify({action:'read_original',confirmation:'CONSULTAR EVIDENCIA ORIGINAL'})
 })
 const response=await handler(request)
 assert.equal(response.status,200)
 const raw=await response.text()
 const result=JSON.parse(raw).audit
 assert.equal(result.auditCode,'qa_provider_read_subscription_get_unavailable')
 assert.equal(result.eventReadStage,'provider_unavailable')
 assert.equal(result.providerHttpStatus,404)
 for(const secret of ['87654321fedcba99','EVENT_PRIVATE_DETAILS','PROVIDER_PRIVATE_DETAILS',
  'WH-PRIVATE','I-PRIVATE','owner_private'])assert.equal(raw.includes(secret),false)
})
test('SQL scope is service-only, uniquely pinned, read-only and does not weaken old pre-campaign gate',()=>{
 const sql=readFileSync('supabase/migrations/20261026043000_pazo_f18_admin_original_evidence_postcampaign_scope.sql','utf8')
 assert.match(sql,/CREATE FUNCTION public\.pazo_f18_live_service_original_evidence_scope\(\)/)
 assert.match(sql,/LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO ''/)
 assert.match(sql,/PERFORM supporter_private\.gradual_require_service\(\)/)
 assert.match(sql,/cohort_count<>1/)
 assert.match(sql,/receipt_count<>1/)
 assert.match(sql,/r\.merchant_generation=x\.merchant_generation/)
 assert.match(sql,/q\.processing_state='held'/)
 assert.match(sql,/p\.checkouts_enabled IS FALSE/)
 assert.match(sql,/p\.invitations_enabled IS FALSE/)
 assert.match(sql,/REVOKE ALL ON FUNCTION public\.pazo_f18_live_service_original_evidence_scope\(\)/)
 assert.match(sql,/GRANT EXECUTE ON FUNCTION public\.pazo_f18_live_service_original_evidence_scope\(\)\s+TO service_role/)
 assert.doesNotMatch(sql, /UPDATE\s+supporter_private\.pazo_paypal_live_event_inbox/i)
 assert.doesNotMatch(sql,/CREATE OR REPLACE FUNCTION public\.pazo_f16_live_service_qa_original_scope\(\)/)
 const index=readFileSync('supabase/functions/pazo-admin-paypal-original-audit/index.ts','utf8')
 assert.match(index,/scopeVariant:'admin_postcampaign'/)
 const adapters=readFileSync('supabase/functions/pazo-paypal-live-checkout/liveSqlServiceAdapters.mjs','utf8')
 assert.match(adapters,/adminOriginalScope:'pazo_f18_live_service_original_evidence_scope'/)
})
