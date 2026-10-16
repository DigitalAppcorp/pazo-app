import test from 'node:test'
import assert from 'node:assert/strict'
import {createP39ActivationInboxAdapter as create} from '../../../../supabase/functions/f16-paypal-webhook/p39ActivationInboxAdapter.mjs'
const args={eventId:'WH-P39-ACT-HTTP',subscriptionId:'I-P39-SUB',origin:'postback_verified_sandbox_activation'}
const config={enabled:true,projectUrl:'https://mrybvqdebbgcayuvgkkr.supabase.co',serviceRoleKey:'SYNTHETIC-LAB-CREDENTIAL-DO-NOT-USE'}
test('default disabled never makes an HTTP call',async()=>{
 let calls=0
 const adapter=create({...config,enabled:false,fetchImpl:async()=>{calls++;return {ok:true,json:async()=>true}}})
 assert.equal(await adapter.bindVerifiedActivation(args),false);assert.equal(calls,0)
})
test('only exact authorized binding parameters are forwarded',async()=>{
 let calls=0
 const adapter=create({...config,fetchImpl:async(url,init)=>{
  calls++;assert.equal(url,config.projectUrl+'/rest/v1/rpc/f16_p39_register_signed_activation')
  assert.equal(init.method,'POST')
  assert.deepEqual(JSON.parse(init.body),{p_event_id:args.eventId,p_subscription_id:args.subscriptionId,p_server_origin:args.origin})
  return {ok:true,json:async()=>true}
 }})
 assert.equal(await adapter.bindVerifiedActivation(args),true);assert.equal(calls,1)
 assert.equal(await adapter.bindVerifiedActivation({...args,origin:'claimed_by_client'}),false)
 assert.equal(await adapter.bindVerifiedActivation({...args,subscriptionId:'UNKNOWN'}),false)
 assert.equal(calls,1)
})
test('provider/DB failures, 5xx and malformed RPC output require retry',async()=>{
 for(const fetchImpl of [async()=>({ok:false}),async()=>({ok:true,json:async()=>({success:true})}),async()=>{throw Error('lab failure')}]){
  const adapter=create({...config,fetchImpl})
  assert.equal(await adapter.bindVerifiedActivation(args),false)
 }
})
