import test from 'node:test'
import assert from 'node:assert/strict'
import {createPaypalSandboxPostbackVerifier} from '../../../../supabase/functions/f16-paypal-webhook/paypalSandboxPostback.mjs'
import {createSafeF16WebhookHandler} from '../../../../supabase/functions/f16-paypal-webhook/core.mjs'

const ID='offline-test-client-id'
const SECRET='offline-test-client-secret'
const WEBHOOK='6N7889790V1467139'
const HEADER_VALUES={
  'paypal-auth-algo':'SHA256withRSA',
  'paypal-cert-url':'https://api.sandbox.paypal.com/v1/notifications/certs/CERT-360caa42-fca2a594-ab66f33d',
  'paypal-transmission-id':'transmission-1',
  'paypal-transmission-sig':'offline-base64-test-signature',
  'paypal-transmission-time':'2026-10-13T12:00:00Z',
}
const raw=' { "id" : "WH-1", "event_type":"PAYMENT.SALE.COMPLETED", "resource":{"payer":"private@example.com"} }\n'
function scenario({result='SUCCESS',oauthOk=true,verifyOk=true}={}) {
  const calls=[]
  const fakeFetch=async(url,options)=>{
    calls.push({url,options})
    if(url==='https://api-m.sandbox.paypal.com/v1/oauth2/token')
      return {ok:oauthOk,json:async()=>({token_type:'Bearer',access_token:'offline-token'})}
    if(url==='https://api-m.sandbox.paypal.com/v1/notifications/verify-webhook-signature')
      return {ok:verifyOk,json:async()=>({verification_status:result})}
    throw Error('unapproved_provider_url')
  }
  const verify=createPaypalSandboxPostbackVerifier({clientId:ID,clientSecret:SECRET,fetchImpl:fakeFetch})
  const args={
    headers:new Headers(HEADER_VALUES),
    rawBody:new TextEncoder().encode(raw),
    webhookId:WEBHOOK,environment:'sandbox',
  }
  return {verify,args,calls}
}
test('postback uses only Sandbox endpoints, verified header mapping, original raw JSON',async()=>{
  const x=scenario()
  assert.equal(await x.verify(x.args),true)
  assert.equal(x.calls.length,2)
  assert.equal(x.calls[0].url,'https://api-m.sandbox.paypal.com/v1/oauth2/token')
  assert.equal(x.calls[0].options.method,'POST')
  assert.equal(x.calls[0].options.headers.Authorization,'Basic '+btoa(ID+':'+SECRET))
  assert.equal(x.calls[1].url,'https://api-m.sandbox.paypal.com/v1/notifications/verify-webhook-signature')
  assert.equal(x.calls[1].options.headers.Authorization,'Bearer offline-token')
  const payload=x.calls[1].options.body
  assert.ok(payload.includes('"webhook_event":'+raw+'}'),'must preserve raw original JSON, including spacing')
  assert.equal(JSON.parse(payload).webhook_id,WEBHOOK)
  assert.equal(JSON.parse(payload).auth_algo,'SHA256withRSA')
  assert.equal(JSON.parse(payload).transmission_id,'transmission-1')
  assert.equal(JSON.parse(payload).cert_url,HEADER_VALUES['paypal-cert-url'])
  assert.equal(x.calls[0].options.redirect,undefined) // redirect guard is added by shared fetch wrapper
  assert.equal((x.calls[1].options.body||'').includes('offline-token'),false)
})
test('wrong environment fails before OAuth fetch',async()=>{
  const x=scenario()
  await assert.rejects(x.verify({...x.args,environment:'live'}),/sandbox_only/)
  await assert.rejects(x.verify({...x.args,environment:undefined}),/sandbox_only/)
  assert.equal(x.calls.length,0)
})
test('rejects adversarial cert URL, arbitrary host, HTTP, query and credentials',async()=>{
  const urls=[
    'http://api.sandbox.paypal.com/v1/notifications/certs/CERT-test123',
    'https://evil.example/v1/notifications/certs/CERT-test123',
    'https://api.sandbox.paypal.com.evil.example/v1/notifications/certs/CERT-test123',
    'https://api.sandbox.paypal.com/v1/notifications/certs/CERT-test123?x=private',
    'https://name:secret@api.sandbox.paypal.com/v1/notifications/certs/CERT-test123',
    'https://api.sandbox.paypal.com/redirect-to-localhost',
  ]
  for (const url of urls){
    const x=scenario()
    x.args.headers.set('paypal-cert-url',url)
    await assert.rejects(x.verify(x.args),/invalid_signature_certificate/)
    assert.equal(x.calls.length,0,'must fail before any network request')
  }
})
test('unapproved signature algorithms and malformed request data fail without network',async()=>{
  for(const algo of ['SHA1withRSA','NONE','rsa-sha1']){
    const x=scenario()
    x.args.headers.set('paypal-auth-algo',algo)
    await assert.rejects(x.verify(x.args),/invalid_signature_certificate/)
    assert.equal(x.calls.length,0)
  }
  const x=scenario()
  await assert.rejects(x.verify({...x.args,webhookId:'INVALID:WEBHOOK'}),/invalid_webhook_id/)
  await assert.rejects(x.verify({...x.args,rawBody:new Uint8Array(0)}),/invalid_webhook_body/)
  assert.equal(x.calls.length,0)
})
test('OAuth and provider failure never count as verified signature',async()=>{
  for(const variant of [{oauthOk:false},{verifyOk:false}]) {
    const x=scenario(variant)
    await assert.rejects(x.verify(x.args),/paypal_api_unavailable/)
  }
  const x=scenario({result:'FAILURE'})
  assert.equal(await x.verify(x.args),false)
})
test('provider response must explicitly say SUCCESS',async()=>{
  const x=scenario({result:'PENDING'})
  assert.equal(await x.verify(x.args),false)
})
test('adapter plugs into new safe listener and cannot create entitlement or founder effect',async()=>{
  const x=scenario()
  const accepted=[]
  const handler=createSafeF16WebhookHandler({
    environment:'sandbox',webhookId:WEBHOOK,planId:'P-14V25407JP6850922NLHMDKI',
    verifySignature:x.verify,
    inbox:{insertIfAbsent:async ({provider,eventId,eventType})=>{
      accepted.push({provider,eventId,eventType});return true
    }},
  })
  const request=new Request('https://localhost/webhook',{
    method:'POST',
    headers:{...HEADER_VALUES,'content-type':'application/json'},
    body:raw,
  })
  const response=await handler(request)
  assert.equal(response.status,202)
  assert.deepEqual(accepted,[{provider:'paypal',eventId:'WH-1',eventType:'PAYMENT.SALE.COMPLETED'}])
  assert.equal(JSON.stringify(accepted).includes('private@example.com'),false)
  assert.equal(x.calls.length,2)
})
test('incomplete credentials fail when building verifier',()=>{
  assert.throws(()=>createPaypalSandboxPostbackVerifier({clientId:'',clientSecret:SECRET}),/not_configured/)
  assert.throws(()=>createPaypalSandboxPostbackVerifier({clientId:ID,clientSecret:''}),/not_configured/)
  assert.throws(()=>createPaypalSandboxPostbackVerifier({clientId:'client:invalid',clientSecret:SECRET}),/not_configured/)
})
