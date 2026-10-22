import test from 'node:test'
import assert from 'node:assert/strict'
import {createPaypalLiveWebhookEventEvidence}
 from '../../../../supabase/functions/pazo-paypal-live-webhook/liveWebhookEventEvidence.mjs'
const gen=7
const clientId='TEST_LIVE_CLIENT_ID_123456789'
const clientSecret='TEST_LIVE_CLIENT_SECRET_123456789'
const eventId='WH-EVT-123456789'
const eventType='PAYMENT.SALE.COMPLETED'
const evt={id:eventId,event_type:eventType,
 create_time:'2026-10-20T20:32:10.000Z',
 resource:{id:'SALE-12345678',billing_agreement_id:'I-ABC123456789',
  payer:{email_address:'private@example.invalid'}}}
const json=d=>new Response(JSON.stringify(d),{status:200,
 headers:{'content-type':'application/json'}})
function mock(body=evt){
 const calls=[]
 const lookup=createPaypalLiveWebhookEventEvidence({merchantGeneration:gen,
  clientId,clientSecret,fetchImpl:async(url,opts)=>{
   calls.push({url,opts})
   if(url.endsWith('/v1/oauth2/token'))return json({
    token_type:'Bearer',access_token:'TOKEN_ONLY_IN_MOCK_12345678'})
   return json(body)
  }})
 return {lookup,calls}
}
test('reads original Live provider event by immutable merchant and returns only references',async()=>{
 const {lookup,calls}=mock()
 const r=await lookup({eventId,eventType,expectedGeneration:gen})
 assert.deepEqual(calls.map(c=>c.opts.method),['POST','GET'])
 assert.ok(calls.every(c=>c.url.startsWith('https://api-m.paypal.com/')))
 assert.equal(calls[1].url,'https://api-m.paypal.com/v1/notifications/webhooks-events/'+eventId)
 assert.equal(r.verifiedProviderRead,true)
 assert.equal(r.subjectId,'SALE-12345678')
 assert.equal(r.subscriptionId,'I-ABC123456789')
 assert.equal(r.paymentSettled,false)
 assert.equal(r.mayGrantBenefits,false)
 assert.equal(r.mayRecordPayment,false)
 assert.ok(!JSON.stringify(r).includes('private@example.invalid'))
 assert.ok(!JSON.stringify(r).includes(clientSecret))
})
test('any forged event ID, type, generation or provider payload fails closed',async()=>{
 for(const data of [{...evt,id:'forged'},{...evt,event_type:'PAYMENT.SALE.REFUNDED'},
  {...evt,create_time:'tomorrow'}, {...evt,resource:null}]){
  const {lookup}=mock(data)
  await assert.rejects(lookup({eventId,eventType,expectedGeneration:gen}),
   /live_original_webhook_event_unavailable/)
 }
 const {lookup,calls}=mock()
 await assert.rejects(lookup({eventId,eventType,expectedGeneration:gen+1}),/unavailable/)
 await assert.rejects(lookup({eventId:'bad/id',eventType,expectedGeneration:gen}),/unavailable/)
 assert.equal(calls.length,0)
})
test('transport failure does not return provider response or secrets',async()=>{
 const lookup=createPaypalLiveWebhookEventEvidence({merchantGeneration:gen,
  clientId,clientSecret,fetchImpl:async()=>{throw Error('SECRET_KEY_123')}})
 await assert.rejects(lookup({eventId,eventType,expectedGeneration:gen}),
  e=>e.message==='live_original_webhook_event_unavailable')
})
