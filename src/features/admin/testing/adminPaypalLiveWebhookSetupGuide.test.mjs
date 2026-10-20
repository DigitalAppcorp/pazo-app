import test from 'node:test'
import assert from 'node:assert/strict'
import {preparePazoLiveWebhookSetup}
 from '../../../../supabase/functions/pazo-admin-paypal-validate/liveWebhookSetupGuide.mjs'
import {liveWebhookUrlForGeneration,REQUIRED_EVENTS}
 from '../../../../supabase/functions/pazo-admin-paypal-validate/liveProviderReadOnly.mjs'

const staged={
 environment:'live',
 merchantGeneration:7,serverGenerationVerified:true,
 planId:'P-ABCDEFGHIJKLMNOP',planVerified:true,
 liveCheckoutEnabled:false,killSwitch:true
}
test('the original verified merchant generation creates one exact PayPal Live callback',()=>{
 const result=preparePazoLiveWebhookSetup(staged)
 assert.equal(result.ready,true)
 assert.equal(result.webhookUrl,liveWebhookUrlForGeneration(7))
 assert.equal(result.webhookUrl,
  'https://mrybvqdebbgcayuvgkkr.supabase.co/functions/v1/pazo-paypal-live-webhook?generation=7')
 assert.deepEqual(result.eventTypes,REQUIRED_EVENTS)
 assert.equal(result.eventTypes.length,10)
 assert.equal(result.mayCharge,false)
 assert.equal(result.mayActivateLive,false)
 assert.equal(result.planId,staged.planId)
})
test('a user-created PayPal app and plan never authorize guessing the generation',()=>{
 for(const change of [
  {serverGenerationVerified:false},
  {merchantGeneration:undefined},
  {merchantGeneration:0},
  {merchantGeneration:10000},
  {merchantGeneration:7.5},
  {planVerified:false},
  {planId:'P-malformed'},
  {environment:'sandbox'},
  {liveCheckoutEnabled:true},
  {killSwitch:false}
 ]){
  const result=preparePazoLiveWebhookSetup({...staged,...change})
  assert.equal(result.ready,false)
  assert.equal(result.webhookUrl,null)
  assert.deepEqual(result.eventTypes,[])
  assert.equal(result.mayActivateLive,false)
 }
})
test('merchant rotation changes the callback without altering event contract',()=>{
 const first=preparePazoLiveWebhookSetup({...staged,merchantGeneration:7})
 const second=preparePazoLiveWebhookSetup({...staged,merchantGeneration:8})
 assert.notEqual(first.webhookUrl,second.webhookUrl)
 assert.deepEqual(first.eventTypes,second.eventTypes)
 assert.ok(first.eventTypes.includes('PAYMENT.SALE.COMPLETED'))
 assert.ok(first.eventTypes.includes('PAYMENT.SALE.REFUNDED'))
 assert.ok(first.eventTypes.includes('PAYMENT.SALE.REVERSED'))
 assert.ok(first.eventTypes.includes('BILLING.SUBSCRIPTION.CANCELLED'))
})
