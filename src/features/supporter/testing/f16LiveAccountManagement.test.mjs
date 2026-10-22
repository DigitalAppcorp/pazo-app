import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createPazoLiveAccountManager} from '../../../../supabase/functions/pazo-paypal-live-checkout/liveAccountManagement.mjs'
import {createPaypalLiveExistingSubscriptionProvider} from '../../../../supabase/functions/pazo-paypal-live-checkout/liveHistoricalProvider.mjs'
const owner='12345678-1234-4234-8234-123456789abc'
const intent='intent-12345678-1234-4234-8234-123456789abc'
const sub='I-LIVE-SUB1234'
const plan='P-ABCDEFGHIJKLMN'
const binding={ownerId:owner,intentId:intent,subscriptionId:sub,planId:plan,
 ownerVerified:true,merchantGenerationVerified:true,
 merchantGeneration:7,sourceEnvironment:'live',provider:'paypal'}
const request=()=>new Request('https://beta.pazo.example.com/account',{method:'POST'})
function fixture(override={}){
 const hits={reads:0,claims:0,cancels:0}
 let state='ACTIVE'
 const deps={managementReleased:true,resolveAuthenticatedOwner:async()=>owner,
  readBinding:async()=>binding,
  readMerchantSubscription:async()=>{hits.reads++;return {
   id:sub,plan_id:plan,custom_id:intent,status:state}},
  claimOwnerCancellation:async()=>{hits.claims++;return true},
  cancelMerchantSubscription:async()=>{hits.cancels++;state='CANCELLED';return true},
  ...override
 }
 return {deps,hits}
}
test('Account management and provider cancellation remain OFF by default',async()=>{
 const f=fixture()
 const manager=createPazoLiveAccountManager({...f.deps,managementReleased:false})
 const x=await manager.cancel({request:request(),confirmCancellation:true})
 assert.equal(x.state,'BLOCKED')
 assert.equal(f.hits.reads,0)
 const source=readFileSync(new URL('../../../../supabase/functions/pazo-paypal-live-checkout/index.ts',import.meta.url),'utf8')
 assert.match(source,/const CONTROLLED_CHECKOUT_RUNTIME=true/)
})
test('Existing owner can read status with no paid period inferred',async()=>{
 const f=fixture()
 const x=await createPazoLiveAccountManager(f.deps).status({request:request()})
 assert.equal(x.state,'ACCOUNT_VERIFIED')
 assert.equal(x.code,'ACTIVE')
 assert.equal(x.paymentVerified,false)
 assert.equal(x.paidThrough,null)
 assert.ok(!JSON.stringify(x).includes(sub))
 assert.equal(f.hits.reads,1)
})
test('Cancellation uses independently verified original merchant with durable claim',async()=>{
 const f=fixture()
 const x=await createPazoLiveAccountManager(f.deps)
  .cancel({request:request(),confirmCancellation:true})
 assert.equal(x.state,'CANCELLATION_CONFIRMED')
 assert.equal(x.mayGrantBenefits,false)
 assert.deepEqual(f.hits,{reads:2,claims:1,cancels:1})
})
test('Owner confirmation, cross-merchant, forged binding and failed claims block cancellation',async()=>{
 for(const mode of [
  {readBinding:async()=>({...binding,ownerId:'32345678-1234-4234-8234-123456789abc'})},
  {readBinding:async()=>({...binding,sourceEnvironment:'sandbox'})},
  {readBinding:async()=>({...binding,ownerVerified:false})},
  {readBinding:async()=>({...binding,merchantGenerationVerified:false})},
  {readBinding:async()=>({...binding,subscriptionId:'I-ATTACKER'})},
  {readMerchantSubscription:async()=>({
   id:sub,plan_id:plan,custom_id:'intent-attacker',status:'ACTIVE'})},
  {claimOwnerCancellation:async()=>false},
  {claimOwnerCancellation:async()=>{throw Error('PRIVATE_ERROR')}},
 ]){
  const f=fixture(mode)
  const x=await createPazoLiveAccountManager(f.deps)
   .cancel({request:request(),confirmCancellation:true})
  assert.equal(x.state,'BLOCKED')
  assert.equal(f.hits.cancels,0)
  assert.ok(!JSON.stringify(x).includes('PRIVATE_ERROR'))
 }
 const f=fixture()
 const unconfirmed=await createPazoLiveAccountManager(f.deps)
  .cancel({request:request(),confirmCancellation:false})
 assert.equal(unconfirmed.state,'BLOCKED')
 assert.equal(f.hits.reads,0)
})
test('Provider timeouts never automatically retry a cancellation mutation',async()=>{
 const f=fixture({cancelMerchantSubscription:async()=>{throw Error('TIMEOUT_SECRET')}})
 const x=await createPazoLiveAccountManager(f.deps)
  .cancel({request:request(),confirmCancellation:true})
 assert.equal(x.state,'BLOCKED')
 assert.equal(x.code,'provider_cancellation_requires_recovery')
 assert.equal(f.hits.claims,1)
 assert.equal(f.hits.cancels,0)
})
test('Read and cancel only with matching generation; never hits PayPal Sandbox',async()=>{
 const calls=[]
 let state='ACTIVE'
 const provider=createPaypalLiveExistingSubscriptionProvider({
  clientId:'CLIENTABCDEFG123',clientSecret:'SECRETABCDEFG123',
  planId:plan,merchantGeneration:7,
  fetchImpl:async(url,options)=>{
   calls.push({url,method:options.method})
   const payload=url.endsWith('/token')?
    {access_token:'TOKEN_EXAMPLE123',token_type:'Bearer'}:
    {id:sub,custom_id:intent,plan_id:plan,status:state}
   if(url.endsWith('/cancel')){state='CANCELLED';return {ok:true,status:204}}
   return {ok:true,status:200,json:async()=>payload}
  }
 })
 const remote=await provider.readMerchantSubscription({subscriptionId:sub,merchantGeneration:7})
 assert.equal(remote.id,sub)
 assert.equal(await provider.cancelMerchantSubscription({subscriptionId:sub,merchantGeneration:7}),true)
 assert.deepEqual(calls.map(x=>x.method),['POST','GET','POST','POST'])
 assert.ok(calls.every(x=>x.url.startsWith('https://api-m.paypal.com/')))
 const n=calls.length
 await assert.rejects(()=>provider.readMerchantSubscription({subscriptionId:sub,merchantGeneration:8}),
  /immutable_merchant_binding_unavailable/)
 await assert.rejects(()=>provider.cancelMerchantSubscription({subscriptionId:'I-OTHER',merchantGeneration:8}),
  /immutable_merchant_binding_unavailable/)
 assert.equal(calls.length,n)
})
test('Unconfirmed provider cancellation response remains pending without clearing benefits',async()=>{
 const f=fixture({cancelMerchantSubscription:async()=>true})
 const x=await createPazoLiveAccountManager(f.deps)
  .cancel({request:request(),confirmCancellation:true})
 assert.equal(x.state,'CANCELLATION_PENDING')
 assert.equal(x.mayGrantBenefits,false)
 assert.equal(x.paidThrough,null)
})
