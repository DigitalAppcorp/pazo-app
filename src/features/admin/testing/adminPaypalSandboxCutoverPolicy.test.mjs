import test from 'node:test'
import assert from 'node:assert/strict'
import {assessSandboxGatewayCandidate,SANDBOX_GATEWAY_PLAN} from '../../../../supabase/functions/pazo-admin-paypal-validate/sandboxCutoverPolicy.mjs'
import {readFileSync} from 'node:fs'

const future=new Date(Date.now()+30000).toISOString()
const past=new Date(Date.now()-30000).toISOString()
const runtime={active_environment:'sandbox',live_checkout_enabled:false,checkout_source:'legacy_sandbox_checkout'}
const candidate={environment:'sandbox',currency:'USD',interval_unit:'MONTH',price_minor:299,
 plan_id:SANDBOX_GATEWAY_PLAN,client_id_stored:true,client_secret_stored:true,
 validation_status:'valid',validated_at:future,updated_at:past,
 return_origin:'https://pazo.example.com',webhook_id:'123456789ab'}
const proofs={oauthVerified:true,merchantIdentityMatchedLegacy:true,planReadVerified:true,
 webhookDeliveryVerified:true,callbackInstalledAndUninstalledVerified:true,
 cancellationReadVerified:true,historicSubscriptionsStillServiced:true,rollbackVerified:true}
const assess=(overrides={})=>assessSandboxGatewayCandidate({runtime,candidate,proofs,...overrides})
test('synthetic complete proof means only candidate-ready, not permission to switch',()=>{
 const result=assess()
 assert.equal(result.ready,true)
 assert.equal(result.switchPermitted,false)
 assert.equal(result.checkoutSourceRemains,'legacy_sandbox_checkout')
 assert.equal(result.liveEnabled,false)
 assert.deepEqual(result.reasons,[])
})
test('missing or inconsistent input fails closed with reason codes and no identifiers',()=>{
 for(const input of [{},{runtime:null,candidate,proofs},
  {runtime:{...runtime,live_checkout_enabled:true}},
  {runtime:{...runtime,checkout_source:'vault'}},
  {candidate:{...candidate,price_minor:499}},
  {candidate:{...candidate,plan_id:'P-OTHERPLAN123456789'}},
  {candidate:{...candidate,environment:'live'}},
  {candidate:{...candidate,client_secret_stored:false}},
  {candidate:{...candidate,return_origin:'https://preview.example.com/paypal/return'}},
  {candidate:{...candidate,return_origin:'http://localhost:5173'}},
  {candidate:{...candidate,webhook_id:''}},
  {candidate:{...candidate,validation_status:'invalid'}},
  {candidate:{...candidate,updated_at:future,validated_at:past}},
  {proofs:{...proofs,merchantIdentityMatchedLegacy:false}},
  {proofs:{...proofs,historicSubscriptionsStillServiced:'true'}},
  {proofs:{...proofs,rollbackVerified:undefined}}]){
   const result=assessSandboxGatewayCandidate(Object.keys(input).length===0?input:{runtime,candidate,proofs,...input})
   assert.equal(result.ready,false)
   assert.equal(result.switchPermitted,false)
   assert.equal(result.liveEnabled,false)
   assert.ok(result.reasons.length>0)
   assert.ok(result.reasons.every(v=>/^[a-z_]+$/.test(v)))
 }
})
test('candidate proof does not mutate the existing payment engine or merchant secrets',()=>{
 const result=assess({candidate:{...candidate,client_secret:'DO_NOT_COPY_OR_LOG'}})
 assert.equal(result.ready,true)
 assert.ok(!JSON.stringify(result).includes('DO_NOT_COPY_OR_LOG'))
 const source=readFileSync(new URL('../../../../supabase/functions/pazo-admin-paypal-validate/sandboxCutoverPolicy.mjs',import.meta.url),'utf8')
 assert.ok(!source.includes('vault.update_secret'))
 assert.ok(!source.includes('/v1/billing/subscriptions'))
 assert.ok(!source.includes('UPDATE admin_private.paypal_gateway_runtime'))
})
