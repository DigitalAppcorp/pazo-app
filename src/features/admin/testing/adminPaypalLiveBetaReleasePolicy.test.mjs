import test from 'node:test'
import assert from 'node:assert/strict'
import {assessLiveBetaCutover,assessLivePaymentCutover} from '../../../../supabase/functions/pazo-admin-paypal-validate/liveBetaReleasePolicy.mjs'
const old={active_environment:'sandbox',live_checkout_enabled:false,checkout_source:'legacy_sandbox_checkout'}
const now='2026-10-19T00:00:00.000Z'
const config={environment:'live',currency:'USD',interval_unit:'MONTH',price_minor:299,
 client_id_stored:true,client_secret_stored:true,validation_status:'valid',
 validated_at:'2026-10-20T00:00:00.000Z',updated_at:now,
 plan_id:'P-1234567890ABCDE',webhook_id:'A1234567890',return_origin:'https://pazo.example.com'}
const yes={applicationPublicHttpsVerified:true,merchantBusinessVerified:true,liveAppOwnershipVerified:true,
 livePlanProviderVerified:true,webhookSignatureAndDeliveryVerified:true,browserReturnVerified:true,
 installedPwaReturnVerified:true,renewalAndCancellationVerified:true,refundAndReversalVerified:true,
 ledgerReconciliationVerified:true,rollbackVerified:true,ownerApprovedLiveActivation:true}
const check=(over={})=>assessLivePaymentCutover({runtime:old,config,proofs:yes,...over})
test('even complete synthetic requirements do not authorize a Live payment or mutate Sandbox',()=>{
 const result=check()
 assert.equal(result.readiness,'preflight_ready')
 assert.equal(result.activationAuthorized,false)
 assert.equal(result.checkoutEnabled,false)
 assert.deepEqual(result.sourcesToPreserve,['legacy_sandbox_checkout'])
})
test('the undecided beta domain may remain blank but LIVE is blocked until public HTTPS',()=>{
 const result=check({config:{...config,return_origin:''}})
 assert.equal(result.readiness,'blocked')
 assert.ok(result.reasons.includes('application_public_origin_missing'))
})
test('localhost, absent proofs, mismatched plan and unapproved release all fail closed',()=>{
 const inputs=[
 {config:{...config,return_origin:'http://localhost:5173'}},
 {config:{...config,return_origin:'https://localhost'}},
 {config:{...config,return_origin:'https://pazo.example.com/paypal/return'}},
 {config:{...config,environment:'sandbox'}},
 {config:{...config,price_minor:499}},
 {config:{...config,validation_status:'not_verified'}},
 {runtime:{...old,live_checkout_enabled:true}},
 {proofs:{...yes,ownerApprovedLiveActivation:false}},
 {proofs:{...yes,webhookSignatureAndDeliveryVerified:false}},
 {proofs:{...yes,installedPwaReturnVerified:false}},
 {proofs:{...yes,ledgerReconciliationVerified:false}},
 ]
 for(const row of inputs){
  const result=check(row)
  assert.equal(result.readiness,'blocked')
  assert.equal(result.checkoutEnabled,false)
  assert.equal(result.activationAuthorized,false)
  assert.ok(result.reasons.length>0)
  assert.ok(result.reasons.every(x=>/^[a-z_]+$/.test(x)))
 }
})
test('the contract never contains or echoes secrets and is not linked to any billing API',()=>{
 const result=check({config:{...config,client_secret:'HIDDEN'}})
 assert.ok(!JSON.stringify(result).includes('HIDDEN'))
 assert.ok(!JSON.stringify(result).includes('1234567890ABCDE'))
})

test('beta publication date is never a prerequisite for valid Live readiness',()=>{
 const before=check({proofs:{...yes,betaLaunched:false}})
 const after=check({proofs:{...yes,betaLaunched:true}})
 assert.equal(before.readiness,'preflight_ready')
 assert.equal(after.readiness,'preflight_ready')
 assert.deepEqual(before.reasons,after.reasons)
 assert.deepEqual(assessLiveBetaCutover({runtime:old,config,proofs:yes}),check())
 assert.equal(check({proofs:{...yes,ownerApprovedLiveActivation:false}}).readiness,'blocked')
 assert.equal(check({proofs:{...yes,applicationPublicHttpsVerified:false}}).readiness,'blocked')
})
