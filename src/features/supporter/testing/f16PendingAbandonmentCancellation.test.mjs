import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createPazoSandboxCancellationProvider}
 from '../../../../supabase/functions/f16-paypal-webhook/p06SandboxCancellationProvider.mjs'

const INTENT='intent-77777777-7777-4777-8777-777777777777'
const SUB='I-SANDBOX-PENDING555'
const PLAN='P-14V25407JP6850922NLHMDKI'
const HOST='https://api-m.sandbox.paypal.com'
const sql=readFileSync(new URL('../../../../supabase/migrations/20261019042653_f16_sandbox_v2_pending_abandonment_preflight.sql',import.meta.url),'utf8')
const edge=readFileSync(new URL('../../../../supabase/functions/f16-paypal-supporter-v2-qa/index.ts',import.meta.url),'utf8')
const ui=readFileSync(new URL('../components/SandboxV2AccountPanel.tsx',import.meta.url),'utf8')

function providerTest({start='APPROVAL_PENDING',after='CANCELLED',foreign=false,missing=false}={}){
 let status=start,posts=0
 const url=HOST+'/v1/billing/subscriptions/'+SUB
 const mock=async(path,opts)=>{
  assert.ok(path.startsWith(HOST+'/'))
  assert.equal(opts.redirect,'error')
  if(path.endsWith('/oauth2/token'))
   return {ok:true,json:async()=>({token_type:'Bearer',access_token:'MOCK_SBOX_OAUTH_TOKEN'})}
  if(path===url){
   if(missing)return {ok:false,status:404}
   return {ok:true,json:async()=>({
    id:SUB,plan_id:PLAN,custom_id:foreign?'intent-foreign':INTENT,status})}
  }
  if(path===url+'/cancel'){
   assert.equal(opts.method,'POST')
   assert.equal(opts.headers['PayPal-Request-Id'],
    'pc'+INTENT.slice(7))
   assert.deepEqual(Object.keys(JSON.parse(opts.body)),['reason'])
   posts++;status=after
   return {ok:true,status:204}
  }
  throw Error('Unexpected PayPal endpoint')
 }
 const provider=createPazoSandboxCancellationProvider({
  clientId:'MOCK_CLIENT_ID_123',clientSecret:'MOCK_CLIENT_SECRET_123',
  fetchImpl:mock})
 return {provider,posts:()=>posts}
}
test('explicit unapproved checkout cancellation requires PayPal GET pending, POST, GET cancelled',async()=>{
 const h=providerTest()
 assert.deepEqual(await h.provider.cancelPending({intentId:INTENT,subscriptionId:SUB}),
   {status:'CANCELLED'})
 assert.equal(h.posts(),1)
})
test('no pending-cancel POST for approved, active, expired, cancelled, 404 or owner mismatch',async()=>{
 for(const caseState of ['ACTIVE','APPROVED','SUSPENDED','CANCELLED','EXPIRED']){
  const h=providerTest({start:caseState})
  await assert.rejects(h.provider.cancelPending({intentId:INTENT,subscriptionId:SUB}),
   /pazo_cancel_pending_status_unverified/)
  assert.equal(h.posts(),0)
 }
 for(const options of [{missing:true},{foreign:true}]){
  const h=providerTest(options)
  await assert.rejects(h.provider.cancelPending({intentId:INTENT,subscriptionId:SUB}))
  assert.equal(h.posts(),0)
 }
})
test('PayPal 204 without confirmed terminal GET never reports cancellation',async()=>{
 const h=providerTest({after:'APPROVAL_PENDING'})
 await assert.rejects(h.provider.cancelPending({intentId:INTENT,subscriptionId:SUB}),
  /pazo_cancel_confirmation_pending/)
 assert.equal(h.posts(),1)
})
test('backend is owner-locked, preflight-locked, explicit and has zero retry grants or payment writes',()=>{
 assert.match(edge,/data.action==='abandon_pending'/)
 assert.match(edge,/data.confirmAbandon!==true/)
 assert.match(edge,/runtime.canAbandonPending\(qaOwner,data.intentId\)/)
 assert.match(edge,/runtime.v2AccountStore.readForOwner/)
 assert.match(edge,/runtime.cancellation.cancelPending/)
 assert.match(edge,/pending_cancellation_confirmation_missing/)
 const section=edge.slice(edge.indexOf("if(data.action==='abandon_pending')"),
  edge.indexOf('// Existing V2 subscription management must work'))
 assert.ok(!section.includes('retryCheckout.begin'))
 assert.ok(!section.includes('retryConsentStore.beginForOwner'))
 assert.ok(!section.includes('grant_id'))
 assert.match(section,/retryEligible:false/)
 for(const str of ['paypal_payment_entries','f16_sandbox_qa_paid_periods',
  'paypal_verified_activation_bindings','f16_sandbox_qa_v2_retry_attempts',
  "i.state='bound'",'provider_create_claimed_at IS NOT NULL',
  'service_role','authenticated','anon','SECURITY DEFINER'])
  assert.ok(sql.includes(str),'missing safe SQL preflight clause '+str)
 assert.ok(!sql.includes('INSERT INTO supporter_private.f16_sandbox_qa_v2_retry_grants'))
 assert.match(ui,/Cancelar solicitud pendiente/)
 assert.match(ui,/confirmAbandon:true/)
 assert.match(ui,/pending_approval_cancelled/)
})

test('PayPal cancel request ID is deterministic, less than 39 chars and tied to bound intent',()=>{
 const h=providerTest()
 const result=h.provider.cancelPending({intentId:INTENT,subscriptionId:SUB})
 return result.then(x=>assert.equal(x.status,'CANCELLED'))
})
