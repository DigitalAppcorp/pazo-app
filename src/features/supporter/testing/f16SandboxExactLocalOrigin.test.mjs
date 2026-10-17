import test from 'node:test'
import assert from 'node:assert/strict'
import {createPazoSandboxSupporterAccountHandler} from '../../../../supabase/functions/f16-paypal-webhook/p14SandboxSupporterAccountHandler.mjs'
import {createPazoSandboxCancellationHandler} from '../../../../supabase/functions/f16-paypal-webhook/p06SandboxCancellationHandler.mjs'
import {readFileSync} from 'node:fs'

const account=()=>({
 resolveAuthenticatedOwner:async()=>null,
 privateIntentStore:{load:async()=>null},
 consentStore:{readAcknowledgementForOwner:async()=>null},
 admit:async()=>true,
 provider:{read:async()=>({status:'CANCELLED'}),cancel:async()=>({status:'CANCELLED'})},
 trustedOrigins:['http://localhost:5173'],
})

test('default subscriber handlers cannot accept insecure HTTP origin',()=>{
 assert.throws(()=>createPazoSandboxSupporterAccountHandler(account()),/not_configured/)
 assert.throws(()=>createPazoSandboxCancellationHandler(account()),/not_configured/)
})
test('isolated QA subscriber handler allows only explicit loopback opt-in',async()=>{
 const h=createPazoSandboxSupporterAccountHandler({...account(),allowLoopbackQa:true})
 const r=await h(new Request('http://localhost:5173/',{
  method:'POST',headers:{origin:'http://localhost:5173','content-type':'application/json'},
  body:JSON.stringify({action:'status',intentId:'intent-44444444-4444-4444-8444-444444444444'})
 }))
 assert.equal(r.status,401)
 assert.equal(r.headers.get('access-control-allow-origin'),'http://localhost:5173')
})
test('QA opt-in still rejects arbitrary insecure sites or localhost alternate port',()=>{
 for(const origin of ['http://localhost:5174','http://evil.test','http://127.0.0.1:5174']){
  assert.throws(()=>createPazoSandboxSupporterAccountHandler({
   ...account(),allowLoopbackQa:true,trustedOrigins:[origin]}),/not_configured/)
  assert.throws(()=>createPazoSandboxCancellationHandler({
   ...account(),allowLoopbackQa:true,trustedOrigins:[origin]}),/not_configured/)
 }
})
test('dedicated Edge opts into exact localhost; legacy checkout is still static OFF',()=>{
 const dedicated=readFileSync(new URL('../../../../supabase/functions/f16-paypal-supporter-v2-qa/index.ts',import.meta.url),'utf8')
 const legacy=readFileSync(new URL('../../../../supabase/functions/f16-paypal-supporter/index.ts',import.meta.url),'utf8')
 assert.match(dedicated,/allowLoopbackQa:QA_LOCAL_ORIGINS\.has\(origin\)/)
 assert.match(dedicated,/QA_BROWSER_ORIGINS=new Set\(\[QA_ORIGIN,\.\.\.QA_LOCAL_ORIGINS\]\)/)
 assert.match(legacy,/const QA_CHECKOUT_RELEASE_APPROVED = false/)
 assert.doesNotMatch(legacy,/allowLoopbackQa:true/)
})
