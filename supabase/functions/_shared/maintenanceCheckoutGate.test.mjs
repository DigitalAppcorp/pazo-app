import test from 'node:test'
import assert from 'node:assert/strict'
import {maintenanceAllowsNewCheckout,requiresMaintenanceCheckoutAdmission} from './maintenanceCheckoutGate.mjs'
const projectUrl='https://mrybvqdebbgcayuvgkkr.supabase.co',serviceKey='SYNTHETIC_ONLY_NOT_A_REAL_KEY'
test('maintenance blocks all Sandbox CREATE/retry entrances without suppressing cancellation or evidence',()=>{
 for(const action of ['begin','retry_begin','recover_retry','resume_approval'])assert.equal(requiresMaintenanceCheckoutAdmission(action),true)
 for(const action of ['cancel','abandon_pending','status','list','verify_payment','audit_created_webhook'])assert.equal(requiresMaintenanceCheckoutAdmission(action),false)
})
test('maintenance admission is server-only and follows no redirect or uncertain response',async()=>{
 let calls=0
 assert.equal(await maintenanceAllowsNewCheckout({projectUrl:'https://unexpected.invalid',serviceKey,fetchImpl:()=>{calls++}}),false)
 assert.equal(calls,0)
 for(const response of [new Response('false'),new Response('{}'),new Response('true',{status:503})])assert.equal(await maintenanceAllowsNewCheckout({projectUrl,serviceKey,fetchImpl:async()=>response}),false)
 assert.equal(await maintenanceAllowsNewCheckout({projectUrl,serviceKey,fetchImpl:async()=>{throw Error('synthetic outage')}}),false)
 assert.equal(await maintenanceAllowsNewCheckout({projectUrl,serviceKey,fetchImpl:async(url,options)=>{
  assert.ok(url.endsWith('/rpc/pazo_f17_service_new_checkout_allowed'));assert.equal(options.redirect,'error');assert.equal(options.body,'{}');return new Response('true')
 }}),true)
})
