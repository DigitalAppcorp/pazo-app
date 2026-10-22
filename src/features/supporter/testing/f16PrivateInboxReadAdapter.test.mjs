import test from 'node:test'
import assert from 'node:assert/strict'
import {createF16PrivateInboxReadAdapter,createF16ServerInboxGate} from '../../../../supabase/functions/f16-paypal-webhook/privateInboxReadAdapter.mjs'
const BASE='https://mrybvqdebbgcayuvgkkr.supabase.co'
const KEY='SYNTHETIC-ONLY-KEY-NEVER-REAL-123456'
const ID='WH-LAB-F16-SERVER-ONLY'
const row={provider_event_id:ID,event_type:'PAYMENT.SALE.COMPLETED',
 processing_state:'pending',retention_hold:true}
function setup(payload=row,status=200){
 const calls=[]
 const fetchImpl=async(url,options)=>{
  calls.push({url,options})
  return {ok:status===200,json:async()=>payload}
 }
 const config={projectUrl:BASE,serviceRoleKey:KEY,fetchImpl}
 return {calls,config,reader:createF16PrivateInboxReadAdapter(config)}
}
test('server reads only minimal RPC fields, never private table direct',async()=>{
 const x=setup(),v=await x.reader.loadVerifiedInbox(ID)
 assert.deepEqual(v,row)
 assert.equal(Object.isFrozen(v),true)
 assert.equal(x.calls.length,1)
 assert.equal(x.calls[0].url,BASE+'/rest/v1/rpc/f16_paypal_read_verified_inbox')
 assert.equal(x.calls[0].options.method,'POST')
 assert.equal(x.calls[0].options.redirect,'error')
 assert.equal(x.calls[0].options.headers.apikey,KEY)
 assert.deepEqual(JSON.parse(x.calls[0].options.body),{p_provider_event_id:ID})
})
test('mismatched hosts, missing service credentials are blocked',()=>{
 for(const url of ['https://untrusted.example',BASE+'?secret=1',null,'http://'+new URL(BASE).host]){
  assert.throws(()=>createF16PrivateInboxReadAdapter({
   projectUrl:url,serviceRoleKey:KEY}),/not_configured/)
 }
 for(const key of [null,'abc','white spaces in key']){
  assert.throws(()=>createF16PrivateInboxReadAdapter({
   projectUrl:BASE,serviceRoleKey:key}),/not_configured/)
 }
})
test('bad IDs are rejected without a request',async()=>{
 const x=setup()
 for(const bad of [null,'','../private','https://evil.com','?admin=1','A'.repeat(129)]){
  await assert.rejects(x.reader.loadVerifiedInbox(bad),/event_invalid/)
 }
 assert.equal(x.calls.length,0)
})
test('verified server gate depends on RPC row, never client reference alone',async()=>{
 const x=setup()
 const out=await createF16ServerInboxGate(x.config).inspect({
  provider:'paypal',eventId:ID,eventType:row.event_type})
 assert.deepEqual(out,{
  ready:true,entitlement:false,
  handling:'sale_requires_private_owner_and_provider_reconciliation'})
 assert.equal(x.calls.length,1)
})
test('missing, mismatched, PII extras, bad type or status fail closed',async()=>{
 for(const payload of [null,{...row,provider_event_id:'WH-OTHER'},
  {...row,retention_hold:'true'},{...row,event_type:'PAYMENT.SALE.COMPLETED',payer_email:'secret@example.com'},
  {...row,processing_state:'unknown'},[row],false]){
  const x=setup(payload)
  const outcome=await createF16ServerInboxGate(x.config).inspect({
   provider:'paypal',eventId:ID,eventType:row.event_type})
  assert.equal(outcome.ready,false)
  assert.equal(outcome.entitlement,false)
  assert.equal(JSON.stringify(outcome).includes('secret@example.com'),false)
 }
})
test('processed rows, released hold and HTTP errors cannot release ledger',async()=>{
 for(const [payload,status] of [
  [{...row,processing_state:'processed'},200],
  [{...row,processing_state:'processing'},200],
  [{...row,retention_hold:false},200],
  [row,401],[row,503]
 ]){
  const x=setup(payload,status)
  const out=await createF16ServerInboxGate(x.config).inspect({
   provider:'paypal',eventId:ID,eventType:row.event_type})
  assert.equal(out.ready,false)
 }
})
test('network errors never disclose secrets or response payloads',async()=>{
 const config={projectUrl:BASE,serviceRoleKey:KEY,fetchImpl:async()=>{
  throw Error('secret buyer@example.com '+KEY)}}
 const x=createF16PrivateInboxReadAdapter(config)
 await assert.rejects(x.loadVerifiedInbox(ID),e=>{
  assert.equal(e.message,'private_inbox_read_unavailable')
  return true
 })
})
