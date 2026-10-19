import test from 'node:test'
import assert from 'node:assert/strict'
import {createPazoLiveCutoverCoordinator} from '../../../../supabase/functions/pazo-admin-paypal-validate/liveCutoverCoordinator.mjs'
const actor='12345678-1234-4234-8234-123456789abc'
const proofId='23456789-1234-4234-8234-123456789abc'
const now=Date.parse('2026-10-19T22:00:00Z')
const request=()=>new Request('https://pazo.example.com/admin',{method:'POST'})
const proof={origin:'trusted_server',actorId:actor,sourceEnvironment:'live',
 merchantVerified:true,planVerified:true,webhookDeliveryVerified:true,
 browserAndPwaReturnVerified:true,cancelAndRefundVerified:true,
 ledgerAndEntitlementsVerified:true,rollbackVerified:true,
 ownerApprovedLaunch:true,proofId,evidenceSha256:'a'.repeat(64),
 checkedAt:'2026-10-19T21:59:00Z',merchantGeneration:2,expectedRevision:5}
function mock(override={}){
 let writes=0
 let runtime={active_environment:'sandbox',live_checkout_enabled:false,
  checkout_source:'legacy_sandbox_checkout',revision:5,active_generation:null,
  new_checkout_enabled:false}
 const deps={releaseApproved:true,emergencyPauseApproved:true,
  now:()=>now,resolveAuthenticatedAdmin:async()=>actor,
  readRuntime:async()=>runtime,readFreshServerProof:async()=>proof,
  compareAndSwapLive:async()=>{
   writes++
   runtime={...runtime,active_environment:'live',live_checkout_enabled:true,
    checkout_source:'live_gateway_v1',revision:6,active_generation:2,
    new_checkout_enabled:true}
   return 'switched'
  },
  pauseNewCheckout:async()=>{writes++;runtime={...runtime,new_checkout_enabled:false,revision:runtime.revision+1};return 'stopped'},
  ...override}
 return {deps,writes:()=>writes}
}
test('cutover and emergency stop are both OFF by default',async()=>{
 const f=mock()
 const gate=createPazoLiveCutoverCoordinator({
  ...f.deps,releaseApproved:false,emergencyPauseApproved:false})
 const a=await gate.activate({request:request(),confirmation:'ACTIVAR LIVE PAZO',expectedRevision:5})
 const p=await gate.pause({request:request(),confirmation:'DETENER NUEVAS COMPRAS'})
 assert.equal(a.liveActivated,false)
 assert.equal(p.newCheckoutEnabled,false)
 assert.equal(f.writes(),0)
})
test('fresh trusted server-only evidence and exact revision are required for switch',async()=>{
 const f=mock()
 const gate=createPazoLiveCutoverCoordinator(f.deps)
 const a=await gate.activate({request:request(),confirmation:'ACTIVAR LIVE PAZO',expectedRevision:5})
 assert.equal(a.ok,true)
 assert.equal(a.code,'live_new_checkout_route_enabled')
 assert.equal(a.mayCharge,false)
 assert.equal(f.writes(),1)
 const again=await gate.activate({request:request(),confirmation:'ACTIVAR LIVE PAZO',expectedRevision:5})
 assert.equal(again.ok,false)
 assert.equal(f.writes(),1)
})
test('stale, forged, other operator and incomplete provider evidence cannot switch',async()=>{
 const bad=[
  {checkedAt:'2026-10-19T21:40:00Z'},
  {checkedAt:'2026-10-19T22:01:00Z'},
  {origin:'browser'},
  {actorId:'33333333-3333-4333-8333-333333333333'},
  {merchantVerified:false},
  {webhookDeliveryVerified:false},
  {browserAndPwaReturnVerified:false},
  {ownerApprovedLaunch:false},
  {rollbackVerified:false},
  {ledgerAndEntitlementsVerified:false},
  {merchantGeneration:0},
  {expectedRevision:4},
  {evidenceSha256:'UNTRUSTED'},
 ]
 for(const change of bad){
  const f=mock({readFreshServerProof:async()=>({...proof,...change})})
  const r=await createPazoLiveCutoverCoordinator(f.deps)
   .activate({request:request(),confirmation:'ACTIVAR LIVE PAZO',expectedRevision:5})
  assert.equal(r.ok,false)
  assert.equal(f.writes(),0)
 }
})
test('no implicit deployment/domain/keys change triggers a switch',async()=>{
 const f=mock()
 for(const confirmation of ['',undefined,'live','ACTIVAR LIVE','ACTIVAR LIVE PAZO ']){
  const r=await createPazoLiveCutoverCoordinator(f.deps)
   .activate({request:request(),confirmation,expectedRevision:5})
  assert.equal(r.ok,false)
 }
 assert.equal(f.writes(),0)
})
test('missing admin, stale revision, SQL CAS refusal or postflight failure stays closed',async()=>{
 for(const override of [
  {resolveAuthenticatedAdmin:async()=>null},
  {readRuntime:async()=>({...mock().deps.readRuntime,revision:9})},
  {compareAndSwapLive:async()=>false},
  {compareAndSwapLive:async()=>{throw Error('PRIVATE_DB')}}
 ]){
  const f=mock(override)
  const r=await createPazoLiveCutoverCoordinator(f.deps)
   .activate({request:request(),confirmation:'ACTIVAR LIVE PAZO',expectedRevision:5})
  assert.equal(r.ok,false)
  assert.ok(!JSON.stringify(r).includes('PRIVATE_DB'))
 }
})
test('emergency stop does not route customers to Sandbox, and is separate from releasing new Live sales',async()=>{
 const f=mock()
 const gate=createPazoLiveCutoverCoordinator(f.deps)
 await gate.activate({request:request(),confirmation:'ACTIVAR LIVE PAZO',expectedRevision:5})
 const p=await gate.pause({request:request(),confirmation:'DETENER NUEVAS COMPRAS'})
 assert.equal(p.ok,true)
 assert.equal(p.newCheckoutEnabled,false)
 assert.equal(p.mayCharge,false)
 assert.equal(f.writes(),2)
})
