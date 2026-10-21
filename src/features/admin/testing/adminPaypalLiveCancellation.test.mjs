import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createPazoLiveOwnerCancellation}
 from '../../../../supabase/functions/pazo-paypal-live-account/liveOwnerCancellation.mjs'
import {createPazoLiveOwnerAccountRead}
 from '../../../../supabase/functions/pazo-paypal-live-account/liveAccountRead.mjs'
import {createPaypalLiveSubscriptionProvider}
 from '../../../../supabase/functions/pazo-paypal-live-checkout/liveSubscriptionProvider.mjs'

const owner='12345678-1234-4234-8234-123456789abc'
const intent='intent-23456789-1234-4234-8234-123456789abc'
const original=()=>({intentId:intent,subscriptionId:'I-ORIGINAL1234',
 planId:'P-ABCDEFGHIJKLMN',merchantGeneration:7,cancelState:null})
const remote=(status='ACTIVE')=>({id:original().subscriptionId,
 plan_id:original().planId,custom_id:intent,status})
function fixture({start='ACTIVE',after='CANCELLED',cancelState=null,
 claim=true,finish=true,postThrows=false}={}){
 const history=[]
 let posted=false
 const perform=createPazoLiveOwnerCancellation({
  readProviderStatus:async()=>{history.push('get');return remote(posted?after:start)},
  claimCancel:async()=>{history.push('claim');return claim},
  postCancel:async()=>{history.push('post');posted=true;
   if(postThrows)throw Error('timeout after provider side effect')},
  finishCancel:async({outcome})=>{history.push('finish_'+outcome);return finish}
 })
 return {perform,history,original:{...original(),cancelState}}
}
test('explicit owner cancellation: single POST after durable claim, independent verified GET, record confirmed',async()=>{
 const f=fixture()
 const result=await f.perform({ownerId:owner,original:f.original})
 assert.equal(result.confirmed,true)
 assert.equal(result.code,'future_renewals_cancelled')
 assert.deepEqual(f.history,['get','claim','post','get','finish_confirmed'])
})
test('timeout after POST cannot cause duplicate; verified provider GET can still finalize',async()=>{
 const f=fixture({postThrows:true})
 assert.equal((await f.perform({ownerId:owner,original:f.original})).confirmed,true)
 assert.equal(f.history.filter(x=>x==='post').length,1)
 assert.equal(f.history.at(-1),'finish_confirmed')
})
test('provider still ACTIVE after uncertain POST forces review, never success or repeated POST',async()=>{
 const f=fixture({after:'ACTIVE'})
 const result=await f.perform({ownerId:owner,original:f.original})
 assert.equal(result.confirmed,false)
 assert.equal(result.code,'live_cancel_requires_reconciliation')
 assert.deepEqual(f.history,['get','claim','post','get','finish_review_required'])
 const retry=fixture({cancelState:'review_required',start:'ACTIVE'})
 assert.equal((await retry.perform({ownerId:owner,original:retry.original})).confirmed,false)
 assert.deepEqual(retry.history,['get'])
})
test('owner repeat with claimed cancellation and externally CANCELLED only confirms after original GET',async()=>{
 const f=fixture({cancelState:'claimed',start:'CANCELLED'})
 const result=await f.perform({ownerId:owner,original:f.original})
 assert.equal(result.confirmed,true)
 assert.deepEqual(f.history,['get','finish_confirmed'])
 const external=fixture({start:'CANCELLED'})
 assert.equal((await external.perform({ownerId:owner,original:external.original})).confirmed,true)
 assert.deepEqual(external.history,['get'])
})
test('duplicate claim, wrong remote binding, incomplete completion and non-cancellable states fail closed',async()=>{
 for(const f of [fixture({claim:false}),fixture({start:'APPROVAL_PENDING'}),
  fixture({finish:false}),fixture({after:'SUSPENDED'})]){
  const result=await f.perform({ownerId:owner,original:f.original})
  assert.equal(result.confirmed,false)
 }
 const history=[]
 const f=createPazoLiveOwnerCancellation({
  readProviderStatus:async()=>{history.push('get');return {
   ...remote('CANCELLED'),custom_id:'intent-WRONG'}},
  claimCancel:async()=>{history.push('claim');return true},
  finishCancel:async()=>{history.push('finish');return true},
  postCancel:async()=>{history.push('post')}
 })
 assert.equal((await f({ownerId:owner,original:original()})).confirmed,false)
 assert.deepEqual(history,['get'])
})
test('PayPal original merchant POST /cancel accepts only 204, never auto-retries or treats 204 as verification',async()=>{
 const urls=[]
 const provider=createPaypalLiveSubscriptionProvider({
  clientId:'EXAMPLE_LIVE_CLIENT_1234',clientSecret:'EXAMPLE_LIVE_SECRET_1234',
  planId:original().planId,origin:'https://pazo-app-t83r.vercel.app',
  fetchImpl:async(url,options)=>{
   urls.push({url,options})
   if(url.endsWith('/v1/oauth2/token'))return new Response(JSON.stringify({
    token_type:'Bearer',access_token:'EXAMPLE_ACCESS_TOKEN_1234'}),
    {status:200,headers:{'content-type':'application/json'}})
   if(url.endsWith('/cancel')){
    assert.equal(options.method,'POST')
    assert.equal(JSON.parse(options.body).reason,
     'Customer requested cancellation of future renewals')
    return new Response(null,{status:204})
   }
   throw Error('unexpected network')
  }
 })
 const result=await provider.cancelSubscription(original().subscriptionId)
 assert.equal(result.postAccepted,true)
 assert.equal(urls.filter(x=>x.url.endsWith('/cancel')).length,1)
 assert.equal(urls.length,2)
})
test('Postgres finish function enforces service role and immutable owner binding, no period credits',()=>{
 const sql=readFileSync(new URL('../../../../supabase/migrations/20261021192951_pazo_f16_live_cancel_finish.sql',import.meta.url),'utf8')
 assert.match(sql,/pazo_f16_live_service_cancel_finish/)
 assert.match(sql,/current_setting\('request\.jwt\.claims'/)
 assert.match(sql,/IS DISTINCT FROM 'service_role'/)
 assert.match(sql,/i\.owner_id=p_owner/)
 assert.match(sql,/i\.merchant_generation=p_generation/)
 assert.match(sql,/c\.state IN \('claimed','review_required'\)/)
 assert.match(sql,/REVOKE ALL ON FUNCTION/)
 assert.match(sql,/TO service_role/)
 assert.doesNotMatch(sql,/INSERT INTO supporter_private\.pazo_paypal_live_paid_periods|UPDATE .*live_paid_periods/)
})
test('Edge requires original Vault merchant + JWT and UI requires manual two-stage confirmation',()=>{
 const edge=readFileSync(new URL('../../../../supabase/functions/pazo-paypal-live-account/index.ts',import.meta.url),'utf8')
 const ui=readFileSync(new URL('../../supporter/components/SupporterAccountManagement.tsx',import.meta.url),'utf8')
 assert.match(edge,/createPazoLiveGoTrueOwnerResolver/)
 assert.match(edge,/createPazoLiveVaultGenerationSecretReader/)
 assert.match(edge,/pazo_f16_live_service_cancel_claim/)
 assert.match(edge,/pazo_f16_live_service_cancel_finish/)
 assert.match(edge,/\.cancelSubscription\(subscriptionId\)/)
 assert.match(ui,/confirmCancellation:true/)
 assert.match(ui,/setCancelConfirm\(account\.intentId\)/)
 assert.match(ui,/\['ACTIVE','SUSPENDED'\]/)
 assert.match(ui,/cancelInReview/)
 assert.match(ui,/cancelReview===account\.intentId/)
 assert.doesNotMatch(edge,/createSubscription\(\)/)
})
test('owner cancellation handler forbids absent confirmation, pending intent and cross-merchant caller data',async()=>{
 const base='https://mrybvqdebbgcayuvgkkr.supabase.co/functions/v1/pazo-paypal-live-account'
 const req=(body)=>new Request(base,{method:'POST',headers:{
  origin:'https://pazo-app-t83r.vercel.app','content-type':'application/json',
  authorization:'Bearer AAA.BBB.CCC'},body:JSON.stringify(body)})
 const readPrivateOwner=async()=>({
  source:'private_original_live_owner_checkouts',currentIntentId:intent,
  accounts:[{...original(),state:'pending',createdAt:'2026-10-21T12:00:00Z',
   closedAt:null,providerStatus:null,providerCreateClaimedAt:null}]
 })
 let sideEffects=0
 const h=createPazoLiveOwnerAccountRead({released:true,
  resolveAuthenticatedOwner:async()=>owner,readPrivateOwner,
  readProviderStatus:async()=>{sideEffects++},claimCancel:async()=>{sideEffects++},
  finishCancel:async()=>{sideEffects++},postCancel:async()=>{sideEffects++}})
 assert.equal((await h(req({action:'cancel',intentId:intent}))).status,400)
 assert.equal((await h(req({action:'cancel',intentId:intent,confirmCancellation:false}))).status,400)
 assert.equal((await h(req({action:'cancel',intentId:intent,
  confirmCancellation:true,subscriptionId:'I-FAKE'}))).status,400)
 assert.equal((await h(req({action:'cancel',intentId:intent,
  confirmCancellation:true}))).status,409)
 assert.equal(sideEffects,0)
})
