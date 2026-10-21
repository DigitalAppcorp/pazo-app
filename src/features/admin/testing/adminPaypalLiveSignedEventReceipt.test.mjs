import test from 'node:test'
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {createPazoLiveSignedEventReceipt} from '../../../../supabase/functions/pazo-paypal-live-webhook/liveSignedEventReceipt.mjs'
const subscriptionId='I-SYNTHETIC1234'
const webhookId='WH-SYNTHETIC1234'
const event={id:'WH-EVENT-SYNTHETIC',event_type:'PAYMENT.SALE.COMPLETED',
 create_time:'2026-10-21T06:00:00Z',resource:{id:'SALE-SYNTHETIC',
 billing_agreement_id:subscriptionId,create_time:'2026-10-21T05:59:59.1Z',
 payer:{email_address:'PRIVATE_PAYER'},amount:{total:'2.99',currency:'USD'}}}
const scope={confirmed:true,sourceEnvironment:'live',ownerIntentVerified:true,
 planVerified:true,subscriptionId}
const bytes=value=>new TextEncoder().encode(JSON.stringify(value))
const receipt=(extra={})=>createPazoLiveSignedEventReceipt({signatureVerified:true,
 rawBody:bytes(event),webhookId,scope,...extra})
test('receipt keeps exact signed-byte digest and bounded references only',async()=>{
 const body=new TextEncoder().encode('  '+JSON.stringify(event,null,2)+'\n')
 const value=await receipt({rawBody:body})
 assert.equal(value.signedBodySha256,createHash('sha256').update(body).digest('hex'))
 assert.equal(value.proofSource,'paypal_live_postback_success')
 assert.equal(value.providerEventAt,'2026-10-21T06:00:00.000Z')
 assert.equal(value.subjectAt,'2026-10-21T05:59:59.100Z')
 assert.equal(value.subjectId,event.resource.id);assert.equal(value.subscriptionId,subscriptionId)
 for(const forbidden of ['PRIVATE_PAYER','payer','amount','rawBody','clientSecret','2.99'])
  assert.ok(!JSON.stringify(value).includes(forbidden))
 assert.equal(value.activationAt,null);assert.equal(value.nextBillingAt,null)
})
test('no receipt can be constructed before successful signature and owner proof',async()=>{
 for(const extra of [{signatureVerified:false},{signatureVerified:1},
  {scope:{...scope,confirmed:false}},{scope:{...scope,ownerIntentVerified:false}},
  {scope:{...scope,planVerified:false}},{scope:{...scope,sourceEnvironment:'sandbox'}},
  {scope:{...scope,subscriptionId:'I-OTHER1234'}},{webhookId:'bad'}])
  await assert.rejects(receipt(extra),/live_signed_receipt_unavailable/)
})
test('event references are re-read from signed bytes rather than a caller object',async()=>{
 const different={...event,resource:{...event.resource,billing_agreement_id:'I-OTHER1234'}}
 await assert.rejects(receipt({rawBody:bytes(different)}),/live_signed_receipt_unavailable/)
 assert.notEqual((await receipt({rawBody:bytes({...event,id:'WH-OTHER-EVENT'})})).signedBodySha256,
  (await receipt()).signedBodySha256)
})
test('malformed payload, unknown event and impossible dates fail closed',async()=>{
 for(const rawBody of [new Uint8Array(),new Uint8Array(65537),bytes([]),bytes(null),
  new TextEncoder().encode('{broken'),bytes({...event,event_type:'UNKNOWN.EVENT'}),
  bytes({...event,create_time:'2026-02-30T00:00:00Z'}),
  bytes({...event,resource:{...event.resource,create_time:'tomorrow'}})])
  await assert.rejects(receipt({rawBody}),/live_signed_receipt_unavailable/)
})
test('activation contract dates come from the signed activation snapshot without calendar arithmetic',async()=>{
 const activation={id:'WH-ACTIVATION-TEST',event_type:'BILLING.SUBSCRIPTION.ACTIVATED',
  create_time:'2026-10-21T06:00:00Z',resource:{id:subscriptionId,
   create_time:'2026-10-21T05:55:00Z',status_update_time:'2026-10-21T05:59:58Z',
   billing_info:{next_billing_time:'2026-11-21T06:00:00Z'}}}
 const value=await receipt({rawBody:bytes(activation)})
 assert.equal(value.activationAt,'2026-10-21T05:59:58.000Z')
 assert.equal(value.nextBillingAt,'2026-11-21T06:00:00.000Z')
 assert.equal(value.subjectId,subscriptionId)
 delete activation.resource.billing_info
 assert.equal((await receipt({rawBody:bytes(activation)})).nextBillingAt,null)
})
