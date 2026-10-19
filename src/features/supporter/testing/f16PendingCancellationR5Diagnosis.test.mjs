import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createPazoSandboxCancellationProvider} from '../../../../supabase/functions/f16-paypal-webhook/p06SandboxCancellationProvider.mjs'

const INTENT='intent-77777777-7777-4777-8777-777777777777'
const SUB='I-SANDBOX-PENDING555'
const PLAN='P-14V25407JP6850922NLHMDKI'
const HOST='https://api-m.sandbox.paypal.com'
const args={intentId:INTENT,subscriptionId:SUB}
function setup({pre='APPROVAL_PENDING', after=['CANCELLED'],preHttp=200,postHttp=204,afterHttp=200}={}){
 let reads=0,postCount=0,waits=[],calls=[]
 const mock=async(url,opts)=>{
  calls.push([url,opts.method])
  if(url===HOST+'/v1/oauth2/token')
   return {ok:true,status:200,json:async()=>({token_type:'Bearer',access_token:'MOCK_TEST_TOKEN_1234'})}
  if(url===HOST+'/v1/billing/subscriptions/'+SUB){
   reads++
   const isBefore=reads===1
   const status=isBefore?preHttp:afterHttp
   if(status!==200)return {ok:false,status}
   return {ok:true,status:200,json:async()=>({id:SUB,plan_id:PLAN,custom_id:INTENT,
    status:isBefore?pre:after[Math.min(reads-2,after.length-1)]})}
  }
  if(url===HOST+'/v1/billing/subscriptions/'+SUB+'/cancel'){
   postCount++
   return {ok:postHttp===204,status:postHttp}
  }
  throw Error('unrecognized PayPal endpoint')
 }
 const provider=createPazoSandboxCancellationProvider({
  clientId:'TEST_SANDBOX_CLIENT_ID',clientSecret:'TEST_SANDBOX_CLIENT_SECRET',
  fetchImpl:mock,waitImpl:async ms=>{waits.push(ms)}
 })
 return {provider,reads:()=>reads,posts:()=>postCount,waits,calls}
}
test('404 on cancellation preflight is distinguished, without POST',async()=>{
 const h=setup({preHttp:404})
 await assert.rejects(h.provider.cancelPending(args),/pazo_cancel_before_http_404/)
 assert.equal(h.posts(),0)
})
test('422 rejection from PayPal cancel endpoint is distinguished and never reported as cancelled',async()=>{
 const h=setup({postHttp:422})
 await assert.rejects(h.provider.cancelPending(args),/pazo_cancel_post_http_422/)
 assert.equal(h.posts(),1)
 assert.equal(h.reads(),1)
})
test('404 from PayPal cancel endpoint is distinguished, not proof of no subscription',async()=>{
 const h=setup({postHttp:404})
 await assert.rejects(h.provider.cancelPending(args),/pazo_cancel_post_http_404/)
 assert.equal(h.posts(),1)
})
test('204 without terminal confirmation retries GET only, not cancellation POST',async()=>{
 const h=setup({after:['APPROVAL_PENDING','APPROVAL_PENDING','CANCELLED']})
 assert.deepEqual(await h.provider.cancelPending(args),{status:'CANCELLED'})
 assert.equal(h.posts(),1)
 assert.equal(h.reads(),4)
 assert.deepEqual(h.waits,[350,750])
})
test('204 + still pending never reports cancelled and never sends more than one POST',async()=>{
 const h=setup({after:['APPROVAL_PENDING']})
 await assert.rejects(h.provider.cancelPending(args),/pazo_cancel_confirmation_pending/)
 assert.equal(h.posts(),1)
 assert.equal(h.reads(),4)
})
test('after-POST 404 never asserts cancel, no second POST',async()=>{
 const h=setup({afterHttp:404})
 await assert.rejects(h.provider.cancelPending(args),/pazo_cancel_after_http_404/)
 assert.equal(h.posts(),1)
})
test('provider status change or foreign plan blocks, no second POST',async()=>{
 for(const start of ['ACTIVE','APPROVED','CANCELLED','SUSPENDED','EXPIRED']){
  const h=setup({pre:start})
  await assert.rejects(h.provider.cancelPending(args),/pazo_cancel_pending_status_unverified/)
  assert.equal(h.posts(),0)
 }
})
test('Edge and account page expose only fixed safe cancellation result codes',()=>{
 const edge=readFileSync(new URL('../../../../supabase/functions/f16-paypal-supporter-v2-qa/index.ts',import.meta.url),'utf8')
 const ui=readFileSync(new URL('../components/SandboxV2AccountPanel.tsx',import.meta.url),'utf8')
 const page=readFileSync(new URL('../components/SupporterAccountManagement.tsx',import.meta.url),'utf8')
 assert.ok(edge.includes("if(stage==='paypal_cancel_pending')"))
 for(const item of [
  'recovery_cancel_pre_not_found','recovery_cancel_post_rejected',
  'recovery_cancel_post_not_found','recovery_cancel_after_not_found',
  'recovery_cancel_status_pending','recovery_cancel_oauth']){
   assert.ok(edge.includes(item),'edge: '+item)
   assert.ok(ui.includes(item),'client: '+item)
 }
 assert.ok(ui.includes("'R5-03'"))
 assert.ok(ui.includes("'R5-07'"))
 assert.ok(page.includes('Referencia de diagnóstico: '))
 assert.ok(!edge.includes('console.log(error)'))
 assert.ok(!edge.includes('JSON.stringify(error)'))
})
