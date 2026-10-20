import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createPazoLiveRecordedSaleReader}
 from '../../../../supabase/functions/pazo-paypal-live-webhook/liveHostedRecordedSale.mjs'
const url='https://mrybvqdebbgcayuvgkkr.supabase.co'
const key='TEST_SERVICE_ROLE_NOT_REAL_KEY_1234567890'
const ownerId='12345678-1234-4234-8234-123456789abc'
const intentId='intent-23456789-1234-4234-8234-123456789abc'
const subscriptionId='I-SUBSCRIPTION123456'
const merchantGeneration=7,saleId='SALE-123456789'
const input={ownerId,intentId,subscriptionId,merchantGeneration,saleId}
const proof={recorded:true,sourceEnvironment:'live',ownerId,intentId,
 subscriptionId,merchantGeneration,saleId,amountMinor:299,currency:'USD'}
function mocked(json){
 const requests=[]
 const fetchImpl=async (uri,opts)=>{
  requests.push({uri,opts})
  return new Response(JSON.stringify(json),{status:200,
   headers:{'content-type':'application/json'}})
 }
 return {requests,reader:createPazoLiveRecordedSaleReader({
  projectUrl:url,serviceRoleKey:key,fetchImpl
 })}
}
test('private service-only reader returns matched recorded Live sale for same owner intent',async()=>{
 const {requests,reader}=mocked(proof)
 assert.deepEqual(await reader(input),proof)
 assert.equal(requests.length,1)
 assert.equal(requests[0].uri,url+'/rest/v1/rpc/pazo_f16_live_service_recorded_sale_read')
 assert.equal(requests[0].opts.method,'POST')
 assert.equal(requests[0].opts.headers.Authorization,'Bearer '+key)
 assert.deepEqual(JSON.parse(requests[0].opts.body),{
  p_owner:ownerId,p_intent:intentId,p_subscription:subscriptionId,
  p_generation:merchantGeneration,p_sale_id:saleId
 })
})
test('unknown sale is indistinguishable from another owner missing it',async()=>{
 const {reader}=mocked(null)
 assert.equal(await reader(input),null)
})
test('cross-merchant, owner, amount, not paid or extraneous private data all fail closed',async()=>{
 for(const forged of [
  {...proof,ownerId:'33333333-3333-4333-8333-333333333333'},
  {...proof,merchantGeneration:8},{...proof,amountMinor:300},
  {...proof,recorded:false},{...proof,sourceEnvironment:'sandbox'},
  {...proof,payerEmail:'private@sample.example'}
 ]){
  const {reader}=mocked(forged)
  await assert.rejects(reader(input),/live_original_sale_read_unavailable/)
 }
})
test('invalid input is rejected before contacting service role backend',async()=>{
 const {requests,reader}=mocked(proof)
 await assert.rejects(reader({...input,saleId:'bad/slash'}),/unavailable/)
 await assert.rejects(reader({...input,merchantGeneration:0}),/unavailable/)
 await assert.rejects(reader({...input,ownerId:'attacker'}),/unavailable/)
 assert.equal(requests.length,0)
})
test('server errors are sanitized; no secret or PII in error output',async()=>{
 const reader=createPazoLiveRecordedSaleReader({
  projectUrl:url,serviceRoleKey:key,
  fetchImpl:async()=>{throw Error('SECRET_CANNOT_LEAK')}
 })
 await assert.rejects(reader(input),e=>e.message==='live_original_sale_read_unavailable')
})
test('staged SQL only exposes service-only function after exact owner and event joins',()=>{
 const sql=readFileSync(new URL('../../../../supabase/drafts/f16_live_service_recorded_sale_reader_REVIEW_REQUIRED.sql',import.meta.url),'utf8')
 assert.match(sql,/SECURITY DEFINER SET search_path=''/)
 assert.match(sql,/current_setting\('request.jwt.claim.role',true\)/)
 assert.ok(sql.includes("IS DISTINCT FROM 'service_role'"))
 assert.ok(sql.includes('i.owner_id=p_owner AND i.intent_id=p_intent'))
 assert.ok(sql.includes('p.sale_id=p_sale_id AND p.amount_minor=299'))
 assert.ok(sql.includes("e.event_type='PAYMENT.SALE.COMPLETED'"))
 assert.ok(sql.includes('FROM PUBLIC,anon,authenticated,service_role'))
 assert.ok(sql.includes('TO service_role;'))
 assert.equal(sql.includes('UPDATE supporter_private'),false)
 assert.equal(sql.includes('INSERT INTO supporter_private'),false)
})
