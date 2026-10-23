import test from 'node:test'
import assert from 'node:assert/strict'
import {createPazoLiveOwnerRecovery} from '../../../../supabase/functions/pazo-paypal-live-account/liveOwnerRecovery.mjs'
import {createPaypalLiveSubscriptionProvider} from '../../../../supabase/functions/pazo-paypal-live-checkout/liveSubscriptionProvider.mjs'
import {createPazoLiveOwnerAccountRead} from '../../../../supabase/functions/pazo-paypal-live-account/liveAccountRead.mjs'
import {getPazoLiveOffer} from '../../../../supabase/functions/pazo-paypal-live-checkout/liveOfferRegistry.mjs'
const owner='12345678-1234-4234-8234-123456789abc'
const intent='intent-23456789-1234-4234-8234-123456789abc'
const key='33456789-1234-4234-8234-123456789abc'
const lease='43456789-1234-4234-8234-123456789abc'
const sub='I-ORIGINAL1234'
const plan='P-ABCDEFGHIJKLMN'
const origin='https://pazo-app-t83r.vercel.app'
const approved='https://www.paypal.com/webapps/billing/subscriptions?ba_token=EXAMPLE'
const at=Date.parse('2026-10-21T20:00:00Z')
const row=()=>({intentId:intent,requestKey:key,merchantGeneration:1,planId:plan,
 state:'pending',subscriptionId:null,closedAt:null,createdAt:'2026-10-21T19:00:00Z',
 providerCreateClaimedAt:'2026-10-21T19:00:01Z',providerOrigin:origin,
 providerRequestVersion:'pazo_subscription_create_v1'})
function fixture(overrides={}){
 const calls=[]
 const remote={id:sub,plan_id:plan,custom_id:intent,status:'APPROVAL_PENDING',approvalUrl:approved}
 const deps={now:()=>at,
  readRecoveryReadiness:async()=>{calls.push('health');return true},
  claimRecovery:async arg=>{assert.equal(arg.ownerId,owner);calls.push('claim');return {
   source:'private_original_live_create_recovery',leaseToken:lease,intentId:intent,
   requestKey:key,merchantGeneration:1,planId:plan,providerOrigin:origin,
   providerRequestVersion:row().providerRequestVersion,originalClaimedAt:row().providerCreateClaimedAt}},
  getOriginalProvider:async args=>{assert.equal(args.merchantGeneration,1);calls.push('vault');return {
   recoverOriginalCreate:async args=>{assert.deepEqual(args,{intentId:intent,requestKey:key});calls.push('replay');return {subscriptionId:sub}},
   readCheckout:async s=>{assert.equal(s,sub);calls.push('get');return remote}}},
  finishRecovery:async args=>{assert.equal(args.leaseToken,lease);assert.equal(args.subscriptionId,sub);calls.push('finish');return true},
  abandonUnclaimed:async()=>{calls.push('abandon');return true},
  retireTerminal:async()=>{calls.push('close');return true},...overrides}
 return {calls,deps,remote,run:createPazoLiveOwnerRecovery(deps)}
}
test('uncertain original CREATE: health, durable lease, same request replay, independent GET, fenced binding',async()=>{
 const f=fixture()
 assert.deepEqual(await f.run({ownerId:owner,original:row(),action:'resume'}),{
  ok:true,code:'live_original_approval_ready',approvalUrl:approved})
 assert.deepEqual(f.calls,['health','claim','vault','replay','get','finish'])
})
test('bound approval resumes through GET only, even while new checkout is stopped',async()=>{
 const f=fixture({readRecoveryReadiness:async()=>{throw Error('stopped')}})
 const out=await f.run({ownerId:owner,original:{...row(),state:'bound',subscriptionId:sub},action:'resume'})
 assert.equal(out.approvalUrl,approved)
 assert.deepEqual(f.calls,['vault','get'])
})
test('stale/future consent, wrong request version, unsafe origin or unclaimed intent never reaches provider',async()=>{
 for(const patch of [
  {createdAt:'2026-10-18T10:00:00Z'},
  {createdAt:'2026-10-21T20:01:00Z'},
  {providerCreateClaimedAt:'2026-10-21T20:01:00Z'},
  {providerRequestVersion:'different'},
  {providerOrigin:'https://example.invalid/redirect'},
  {providerCreateClaimedAt:null},{requestKey:'invalid'},
  {closedAt:'2026-10-21T19:30:00Z'},{merchantGeneration:0}]){
  const f=fixture()
  assert.equal((await f.run({ownerId:owner,original:{...row(),...patch},action:'resume'})).ok,false)
  assert.deepEqual(f.calls,[])
 }
})
test('unhealthy worker and contested lease stop recovery before credentials or POST',async()=>{
 for(const extra of [{readRecoveryReadiness:async()=>false},{claimRecovery:async()=>null},
  {claimRecovery:async()=>({source:'private_original_live_create_recovery',leaseToken:lease,
   requestKey:'different'})}]){
  const f=fixture(extra)
  assert.equal((await f.run({ownerId:owner,original:row(),action:'resume'})).ok,false)
  assert.ok(!f.calls.includes('vault'));assert.ok(!f.calls.includes('replay'))
 }
})
test('provider timeout does not auto-retry or release slot',async()=>{
 let posts=0
 const f=fixture({getOriginalProvider:async()=>({recoverOriginalCreate:async()=>{posts++;throw Error('timeout')}})})
 assert.equal((await f.run({ownerId:owner,original:row(),action:'resume'})).ok,false)
 assert.equal(posts,1)
 assert.ok(!f.calls.includes('finish'));assert.ok(!f.calls.includes('close'))
})
test('forged merchant, intent, ID, status or approval URL never produces a resumable checkout',async()=>{
 for(const patch of [{id:'I-FOREIGN'},{plan_id:'P-FOREIGN'},{custom_id:'intent-FOREIGN'},
  {status:'PAID'},{approvalUrl:'https://www.paypal.com.evil.invalid/redirect'},
  {approvalUrl:approved+'&redirect=evil'}]){
  const f=fixture();Object.assign(f.remote,patch)
  assert.equal((await f.run({ownerId:owner,original:row(),action:'resume'})).ok,false)
 }
})
test('lost/expired binding commit fails closed, ACTIVE does not grant financial coverage',async()=>{
 const failed=fixture({finishRecovery:async()=>false})
 assert.equal((await failed.run({ownerId:owner,original:row(),action:'resume'})).ok,false)
 const f=fixture();f.remote.status='ACTIVE'
 const out=await f.run({ownerId:owner,original:row(),action:'resume'})
 assert.deepEqual(out,{ok:true,code:'live_original_subscription_verified',providerStatus:'ACTIVE'})
 assert.ok(!('paidThrough' in out));assert.ok(!('entitlement' in out))
})
test('only unclaimed abandonment may close without PayPal; a claimed timeout can never be discarded',async()=>{
 const f=fixture()
 assert.equal((await f.run({ownerId:owner,original:row(),action:'abandon'})).ok,false)
 assert.deepEqual(f.calls,[])
 assert.equal((await f.run({ownerId:owner,original:{...row(),providerCreateClaimedAt:null},action:'abandon'})).code,'live_checkout_slot_released')
 assert.deepEqual(f.calls,['abandon'])
})
test('terminal retirement requires original GET CANCELLED/EXPIRED and positive private reconciliation',async()=>{
 for(const status of ['ACTIVE','APPROVAL_PENDING','SUSPENDED','CANCELLED','EXPIRED']){
  const f=fixture();f.remote.status=status
  const result=await f.run({ownerId:owner,original:{...row(),state:'bound',subscriptionId:sub},action:'reconcile'})
  assert.equal(result.ok,['CANCELLED','EXPIRED'].includes(status))
  assert.equal(f.calls.includes('close'),['CANCELLED','EXPIRED'].includes(status))
 }
 const f=fixture({retireTerminal:async()=>false});f.remote.status='CANCELLED'
 assert.equal((await f.run({ownerId:owner,original:{...row(),state:'bound',subscriptionId:sub},action:'reconcile'})).code,'live_coverage_or_events_pending')
})
test('Sandbox-parity Live Continue automatically releases terminal original only after reconciliation',async()=>{
 for(const status of ['CANCELLED','EXPIRED']){
  const f=fixture();f.remote.status=status
  const out=await f.run({ownerId:owner,original:{...row(),state:'bound',subscriptionId:sub},action:'resume'})
  assert.deepEqual(out,{ok:true,code:'live_checkout_slot_released'})
  assert.deepEqual(f.calls,['vault','get','close'])
 }
 const unsafe=fixture({retireTerminal:async()=>false})
 unsafe.remote.status='CANCELLED'
 const notReady=await unsafe.run({ownerId:owner,original:{...row(),state:'bound',subscriptionId:sub},action:'resume'})
 assert.deepEqual(notReady,{ok:false,code:'live_coverage_or_events_pending'})
})
test('PayPal original recovery POST uses byte-identical payload and idempotency key; GET strips payer data',async()=>{
 const posts=[]
 const provider=createPaypalLiveSubscriptionProvider({clientId:'SYNTHETIC_CLIENT_123456',clientSecret:'SYNTHETIC_SECRET_123456',
  planId:plan,origin,fetchImpl:async(url,options)=>{
   if(url.endsWith('/token'))return Response.json({token_type:'Bearer',access_token:'SYNTHETIC_ACCESS_1234'})
   if(options.method==='POST'){posts.push(options);return Response.json({id:sub,status:'APPROVAL_PENDING',links:[{rel:'approve',href:approved}]},{status:201})}
   return Response.json({id:sub,plan_id:plan,custom_id:intent,status:'APPROVAL_PENDING',subscriber:{email_address:'PRIVATE'},links:[{rel:'approve',href:approved}]})
  }})
 await provider.createSubscription({intentId:intent,requestKey:key})
 await provider.recoverOriginalCreate({intentId:intent,requestKey:key})
 assert.equal(posts.length,2);assert.equal(posts[0].body,posts[1].body)
 assert.equal(posts[0].headers['PayPal-Request-Id'],posts[1].headers['PayPal-Request-Id'])
 assert.equal((await provider.readCheckout(sub)).approvalUrl,approved)
 assert.ok(!JSON.stringify(await provider.readCheckout(sub)).includes('PRIVATE'))
})
const req=body=>new Request('https://mrybvqdebbgcayuvgkkr.supabase.co/functions/v1/pazo-paypal-live-account',{
 method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify(body)})
const slots=()=>({source:'private_original_live_owner_checkouts',currentIntentId:intent,
 accounts:[{...row(),providerStatus:null}]})
test('acknowledgement downloads exact private original ES/EN text without financial or provider identifiers',async()=>{
 for(const locale of ['es','en']){
  const offer=getPazoLiveOffer(locale)
  const h=createPazoLiveOwnerAccountRead({released:true,resolveAuthenticatedOwner:async()=>owner,
   readPrivateOwner:async()=>slots(),readAcceptance:async()=>({...offer,termsVersion:offer.version,
    source:'original_live_offer_acceptance',intentId:intent,affirmativeConsent:true,
    acceptedAt:'2026-10-21T19:00:00Z'})})
  const response=await h(req({action:'acknowledgement',intentId:intent}))
  assert.equal(response.status,200);assert.match(response.headers.get('content-type'),/^text\/plain/)
  const text=await response.text();assert.ok(text.includes(offer.exactCopy));assert.ok(text.includes(offer.termsDigest))
  for(const privateValue of [owner,intent,key,sub,plan])assert.ok(!text.includes(privateValue))
 }
})
test('download rejects forged terms and foreign-owner intent before exposing text',async()=>{
 let reads=0
 const h=createPazoLiveOwnerAccountRead({released:true,resolveAuthenticatedOwner:async()=>owner,
  readPrivateOwner:async()=>slots(),readAcceptance:async()=>{reads++;return {source:'forged'}}})
 assert.equal((await h(req({action:'acknowledgement',intentId:intent}))).status,503)
 assert.equal((await h(req({action:'acknowledgement',intentId:'intent-53456789-1234-4234-8234-123456789abc'}))).status,409)
 assert.equal(reads,1)
})

test('later owner status GET resolves an uncertain cancellation without repeating POST',async()=>{
 const calls=[]
 const bound={...row(),state:'bound',subscriptionId:sub,providerStatus:null,cancelState:'review_required'}
 const h=createPazoLiveOwnerAccountRead({released:true,resolveAuthenticatedOwner:async()=>owner,
  readPrivateOwner:async()=>({source:'private_original_live_owner_checkouts',currentIntentId:intent,accounts:[bound]}),
  readProviderStatus:async()=>{calls.push('get');return {id:sub,plan_id:plan,custom_id:intent,status:'CANCELLED'}},
  finishCancel:async args=>{assert.equal(args.ownerId,owner);assert.equal(args.outcome,'confirmed');calls.push('finish');return true},
  postCancel:async()=>{throw Error('a second POST is forbidden')}
 })
 const r=await h(req({action:'status',intentId:intent}))
 assert.equal(r.status,200);assert.equal((await r.json()).cancelled,true)
 assert.deepEqual(calls,['get','finish'])
})
test('closed owner acceptance remains downloadable after the checkout slot has been released',async()=>{
 const offer=getPazoLiveOffer('es')
 const h=createPazoLiveOwnerAccountRead({released:true,resolveAuthenticatedOwner:async()=>owner,
  readPrivateOwner:async()=>({source:'private_original_live_owner_checkouts',currentIntentId:null,
   accounts:[{...row(),closedAt:'2026-10-21T20:00:00Z',providerStatus:null}]}),
  readAcceptance:async()=>({...offer,termsVersion:offer.version,
   source:'original_live_offer_acceptance',intentId:intent,affirmativeConsent:true,
   acceptedAt:row().createdAt})})
 const list=await h(req({action:'list'}));const body=await list.json()
 assert.deepEqual(body.accounts,[])
 assert.deepEqual(body.acceptances,[{intentId:intent,acceptedAt:row().createdAt}])
 const file=await h(req({action:'acknowledgement',intentId:intent}))
 assert.equal(file.status,200);assert.ok((await file.text()).includes(offer.exactCopy))
})
