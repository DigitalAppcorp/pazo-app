import test from 'node:test'
import assert from 'node:assert/strict'
import {createP28OperatorMerchantRead} from '../../../../supabase/functions/f16-paypal-webhook/p28OperatorMerchantReadGate.mjs'
const key='a'.repeat(48)
const request=(authorization,body='{"eventId":"WH-P28-001","claimToken":"22222222-2222-4222-8222-222222222222"}')=>
 new Request('https://example.invalid/functions/v1/f16-paypal-operator-read',{
  method:'POST',headers:{authorization,'content-type':'application/json'},body
 })
test('P28 denies unauthenticated and malformed credentials before any DB/PayPal access even enabled',async()=>{
 let calls=0
 const h=createP28OperatorMerchantRead({enabled:true,operatorKey:key,
  readLeasedEvent:async()=>{calls++;throw Error('should not reach DB')},
  resolvePrivateBinding:async()=>{calls++;throw Error('should not reach binding')},
  merchantReader:{getMerchantEvent:async()=>{calls++;throw Error('should not reach PayPal')},
   getMerchantSubscription:async()=>{calls++;throw Error('should not reach PayPal')}}
 })
 for(const auth of ['', 'Bearer wrong', 'Basic '+key, 'Bearer '+key+'extra']){
  const response=await h(request(auth))
  assert.equal(response.status,401)
  assert.equal((await response.json()).mayRecordPayment,false)
 }
 assert.equal(calls,0)
})
test('missing operator secret fails closed even when enabled',async()=>{
 const h=createP28OperatorMerchantRead({enabled:true,operatorKey:undefined})
 assert.equal((await h(request('Bearer '+key))).status,401)
})
