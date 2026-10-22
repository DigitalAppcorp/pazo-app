import test from 'node:test'
import assert from 'node:assert/strict'
import { verifyPayPalCertificateBoundSignature } from './paypalCertificateBoundVerifier.mjs'
const url='https://api.sandbox.paypal.com/v1/notifications/certs/CERT-test'
const request={environment:'sandbox',webhookId:'WH-TEST',rawBody:new TextEncoder().encode('{}'),
 headers:{'paypal-cert-url':url,'paypal-auth-algo':'SHA256withRSA','paypal-transmission-id':'tx','paypal-transmission-time':'2026-10-13T00:00:00Z','paypal-transmission-sig':'AAAA'}}
test('rejects without network adapter and never fetches unacceptable host',async()=>{
  assert.equal(await verifyPayPalCertificateBoundSignature(request),false)
  let calls=0
  assert.equal(await verifyPayPalCertificateBoundSignature({...request,headers:{...request.headers,'paypal-cert-url':'https://127.0.0.1/'},fetchCertificate:async()=>{calls++;return {}}}),false)
  assert.equal(calls,0)
})
test('requests explicit redirect denial with environment and byte limit',async()=>{
  let opts
  await verifyPayPalCertificateBoundSignature({...request,fetchCertificate:async(u,o)=>{opts=o;assert.equal(u,url);return {status:404,redirected:false,certificatePem:''}}})
  assert.deepEqual(opts,{redirect:'error',method:'GET',environment:'sandbox',maxBytes:16384})
})
test('rejects HTTP redirect, failure, oversized PEM and unverified certificate',async()=>{
  for(const obj of [{status:302,redirected:true,certificatePem:'A'},{status:200,redirected:true,certificatePem:'A'},{status:200,redirected:false,certificatePem:'X'.repeat(17000)},{status:200,redirected:false,certificatePem:'invalid'}])
    assert.equal(await verifyPayPalCertificateBoundSignature({...request,fetchCertificate:async()=>obj}),false)
})
test('rejects HTTPS adapter failures without assuming a valid signature',async()=>{
  assert.equal(await verifyPayPalCertificateBoundSignature({...request,fetchCertificate:async()=>{throw Error('offline')}}),false)
})
test('rejects live certificate endpoint under sandbox configuration',async()=>{
  let calls=0
  assert.equal(await verifyPayPalCertificateBoundSignature({...request,headers:{...request.headers,'paypal-cert-url':'https://api-m.paypal.com/v1/notifications/certs/CERT-live'},fetchCertificate:async()=>{calls++;return {}}}),false)
  assert.equal(calls,0)
})
