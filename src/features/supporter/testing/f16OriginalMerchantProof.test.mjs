import test from 'node:test'
import assert from 'node:assert/strict'
import {createF16PaypalSandboxOriginalReader} from '../../../../supabase/functions/f16-paypal-webhook/paypalSandboxOriginalProof.mjs'
import {createF16AuthOwnerExistenceGuard} from '../../../../supabase/functions/f16-paypal-webhook/privateAuthOwnerGuard.mjs'
const HOST='https://api-m.sandbox.paypal.com',ID='SALE-PAZO123',SUB='I-PAZO-OWNER123'
const REFUND='REFUND-PAZO123',EVENT='WH-PAZO-REFUND123'
function setup(change={}){
 const urls=[]
 const fetchImpl=async(url,opts)=>{
  urls.push({url,opts})
  if(url===HOST+'/v1/oauth2/token')return {ok:change.oauthOk!==false,
   json:async()=>({token_type:change.badToken?'notBearer':'Bearer',access_token:'secret-token'})}
  let data
  if(url===HOST+'/v1/payments/sale/'+ID)
    data={id:ID,state:'completed',billing_agreement_id:SUB,
     amount:{currency:'USD',total:'2.99'},create_time:'2026-10-13T19:00:00Z',
     payer:{email:'secret@example.com'},...change.sale}
  else if(url===HOST+'/v1/payments/refund/'+REFUND)
    data={id:REFUND,state:'completed',sale_id:ID,amount:{currency:'USD',total:'2.99'},
      update_time:'2026-10-14T11:16:00Z',payer:{email:'secret@example.com'},...change.refund}
  else if(url===HOST+'/v1/notifications/webhooks-events/'+EVENT)
    data={id:EVENT,event_type:'PAYMENT.SALE.REFUNDED',
      resource:{id:REFUND,payer_email:'secret@example.com'},...change.event}
  else throw Error('unexpected third-party host/path')
  return {ok:change.apiOk!==false,json:async()=>data}
 }
 return {reader:createF16PaypalSandboxOriginalReader({
  clientId:'sandbox-client-id',clientSecret:'sandbox-client-secret',fetchImpl}),urls}
}
test('sale and refund originals are re-read from fixed Sandbox merchant OAuth endpoints',async()=>{
 const x=setup()
 assert.deepEqual(await x.reader.readSale(ID),{
  id:ID,subscriptionId:SUB,state:'completed',grossMinorUnits:299,
  currency:'USD',completedAt:'2026-10-13T19:00:00Z',verifiedByMerchantApi:true})
 assert.deepEqual(await x.reader.readVerifiedRefundEvent(EVENT),{
  eventId:EVENT,eventType:'PAYMENT.SALE.REFUNDED',refundId:REFUND})
 assert.deepEqual(await x.reader.readRefund(REFUND),{
  id:REFUND,originalSaleId:ID,refundMinorUnits:299,currency:'USD',
  state:'completed',verifiedAt:'2026-10-14T11:16:00Z',verifiedByMerchantApi:true})
 assert.deepEqual(x.urls.filter(x=>x.opts.method==='GET').map(x=>x.url),[
  HOST+'/v1/payments/sale/'+ID,
  HOST+'/v1/notifications/webhooks-events/'+EVENT,
  HOST+'/v1/payments/refund/'+REFUND])
 assert.equal(x.urls.every(x=>x.opts.redirect==='error'),true)
 assert.equal(x.urls.every(x=>!x.url.includes('api-m.paypal.com')),true)
 assert.equal(JSON.stringify(await x.reader.readRefund(REFUND)).includes('secret@example.com'),false)
})
test('invalid IDs never issue HTTP, no SSRF URL or param injection',async()=>{
 const x=setup()
 for(const s of ['', '../private', 'https://evil.example', 'SALE?owner=bad']){
  await assert.rejects(x.reader.readSale(s),/reference_invalid/)
  await assert.rejects(x.reader.readRefund(s),/reference_invalid/)
  await assert.rejects(x.reader.readVerifiedRefundEvent(s),/reference_invalid/)
 }
 assert.equal(x.urls.length,0)
})
test('provider mismatch, missing agreement, amount and invalid dates are rejected',async()=>{
 for(const sale of [{id:'ANOTHER'},{billing_agreement_id:null},
  {amount:{currency:'USD',total:'2.9'}},
  {amount:{currency:'EUR',total:'2.99'}},
  {create_time:'2026-02-30T19:00:00Z'}]){
  await assert.rejects(setup({sale}).reader.readSale(ID),/original_sale_not_proven/)
 }
 for(const refund of [{id:'ANOTHER'},{sale_id:null},{amount:{currency:'USD',total:'NaN'}},
  {update_time:'not-date'}]){
  await assert.rejects(setup({refund}).reader.readRefund(REFUND),/refund_original_link_unproven/)
 }
 for(const event of [{id:'DIFFERENT'}, {resource:{}},
  {event_type:'PAYMENT.SALE.REVERSED'}]){
  await assert.rejects(setup({event}).reader.readVerifiedRefundEvent(EVENT),/refund_event_unverified/)
 }
})
test('OAuth, provider denial and malformed responses cannot become source proof',async()=>{
 for(const mod of [{oauthOk:false},{badToken:true},{apiOk:false}]){
  await assert.rejects(setup(mod).reader.readSale(ID))
 }
 assert.throws(()=>createF16PaypalSandboxOriginalReader(),/not_configured/)
})
test('Auth owner guard queries admin identity, never local JWT/browser fields',async()=>{
 const owner='63e812b0-a7e5-49f6-b2dd-c11d2c72af57'
 const calls=[]
 const guard=createF16AuthOwnerExistenceGuard({authClient:{auth:{admin:{
  getUserById:async id=>{calls.push(id);return {data:{user:{id:owner,is_anonymous:false}},error:null}}
 }}}})
 assert.equal(await guard(owner),true)
 assert.deepEqual(calls,[owner])
 assert.equal(await guard('https://evil.example'),false)
 assert.deepEqual(calls,[owner])
 for(const user of [null,{id:owner,is_anonymous:true},{id:'not-owner'}, {id:owner,deleted_at:'2026-10-14T00:00:00Z'}]){
  const deny=createF16AuthOwnerExistenceGuard({authClient:{auth:{admin:{
   getUserById:async()=>({data:{user}})
  }}}})
  assert.equal(await deny(owner),false)
 }
 const unavailable=createF16AuthOwnerExistenceGuard({authClient:{auth:{admin:{
  getUserById:async()=>{throw Error('private outage')}
 }}}})
 assert.equal(await unavailable(owner),false)
 assert.throws(()=>createF16AuthOwnerExistenceGuard({}),/admin_auth_client_required/)
})
