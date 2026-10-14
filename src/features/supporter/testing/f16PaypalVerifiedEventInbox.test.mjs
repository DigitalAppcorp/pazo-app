import test from 'node:test'
import assert from 'node:assert/strict'
import {createPaypalVerifiedEventInbox} from '../../../../supabase/functions/f16-paypal-webhook/paypalInboxAdapter.mjs'
const URL='https://mrybvqdebbgcayuvgkkr.supabase.co'
const KEY='sandbox-test-service-role-key-private-keep-hidden'
function fixture({result=true,ok=true}={}){
 const calls=[]
 const fetchImpl=async(uri,options)=>{calls.push({uri,options});return {ok,json:async()=>result}}
 const inbox=createPaypalVerifiedEventInbox({projectUrl:URL,serviceRoleKey:KEY,fetchImpl})
 return {inbox,calls}
}
const item={provider:'paypal',eventId:'WH-SANDBOX-123',eventType:'PAYMENT.SALE.COMPLETED'}
test('inbox posts minimal verified event to ONLY the configured Supabase RPC',async()=>{
 const x=fixture()
 assert.equal(await x.inbox.insertIfAbsent(item),true)
 assert.equal(x.calls.length,1)
 const c=x.calls[0]
 assert.equal(c.uri,URL+'/rest/v1/rpc/f16_paypal_record_verified_event')
 assert.equal(c.options.method,'POST')
 assert.equal(c.options.redirect,'error')
 assert.equal(c.options.headers.apikey,KEY)
 assert.equal(c.options.headers.Authorization,'Bearer '+KEY)
 assert.deepEqual(JSON.parse(c.options.body),{
   p_provider_event_id:'WH-SANDBOX-123',p_event_type:'PAYMENT.SALE.COMPLETED',
 })
 assert.equal(c.options.body.includes(KEY),false)
})
test('RPC duplicate false is valid and does not credit entitlement',async()=>{
 const x=fixture({result:false})
 assert.equal(await x.inbox.insertIfAbsent(item),false)
})
test('invalid RPC result or unavailable DB must fail closed',async()=>{
 for(const variant of [{result:null},{result:{inserted:true}},{ok:false}]) {
   const x=fixture(variant)
   await assert.rejects(x.inbox.insertIfAbsent(item))
 }
})
test('host cannot be substituted to leak privileged key to attacker',()=>{
 for(const projectUrl of [
  'https://attacker.example','http://mrybvqdebbgcayuvgkkr.supabase.co',
  'https://mrybvqdebbgcayuvgkkr.supabase.co.evil.example',
  URL+'/',URL+'/rest/v1/rpc/wrong',
 ]){
   assert.throws(()=>createPaypalVerifiedEventInbox({projectUrl,serviceRoleKey:KEY}),/not_configured/)
 }
})
test('service role key is mandatory and no arbitrary event payload is stored',async()=>{
 assert.throws(()=>createPaypalVerifiedEventInbox({projectUrl:URL,serviceRoleKey:''}),/not_configured/)
 const x=fixture()
 for(const bad of [
  {...item,provider:'stripe'},{...item,eventId:'unsafe/id'},
  {...item,eventType:'malicious webhook'},{...item,eventId:''},
 ]){
   await assert.rejects(x.inbox.insertIfAbsent(bad),/invalid_verified_event_reference/)
 }
 assert.equal(x.calls.length,0)
 // Extra fields from PayPal are deliberately not transmitted.
 await x.inbox.insertIfAbsent({...item,payer_email:'private@example.com',access_token:'secret'})
 assert.equal(x.calls.length,1)
 assert.equal(x.calls[0].options.body.includes('private@example.com'),false)
 assert.equal(x.calls[0].options.body.includes('secret'),false)
})
