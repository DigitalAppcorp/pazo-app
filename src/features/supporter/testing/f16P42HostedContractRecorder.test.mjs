import test from 'node:test'
import assert from 'node:assert/strict'
import {createHmac,webcrypto} from 'node:crypto'
import {createP42HostedContractRecorder as create} from '../../../../supabase/functions/f16-paypal-webhook/p42HostedContractRecorder.mjs'
const keyBytes=new TextEncoder().encode('TEST-SYNTHETIC-KEY-MATERIAL-FOR-P42-ONLY')
const config={
 enabled:true,projectUrl:'https://mrybvqdebbgcayuvgkkr.supabase.co',
 serviceRoleKey:'TEST_SERVER_CREDENTIAL_NOT_REAL_123456',
 keyId:'P42_V1',keyBytes,subtleImpl:webcrypto.subtle,
 keyNotBefore:'2026-10-16T00:00:00Z',keyNotAfter:'2026-10-17T00:00:00Z',
 makeNonce:()=> 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
 now:()=>new Date('2026-10-16T15:01:00Z')
}
const payload={eventId:'P42-HOSTED-CONTRACT-TEST',subscriptionId:'I-P42-CONTRACT',
 origin:'postback_verified_sandbox_activation'}
test('new hosted contract signer defaults OFF',async()=>{
 let calls=0
 const reader=create({...config,enabled:false,fetchImpl:async()=>{calls++}})
 assert.equal(await reader.bindVerifiedActivation(payload),false)
 assert.equal(calls,0)
})
test('hosted RPC signature is domain-separated by sandbox and excludes secrets',async()=>{
 let calls=0
 const reader=create({...config,fetchImpl:async(url,options)=>{
  calls++;assert.equal(url,config.projectUrl+'/rest/v1/rpc/f16_p42_register_authenticated_activation')
  assert.equal(options.method,'POST')
  const body=JSON.parse(options.body)
  const expected='p42|sandbox|'+config.keyId+'|'+payload.eventId+'|'+
     payload.subscriptionId+'|2026-10-16T15:01:00Z|aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
  assert.equal(body.p_mac_hex,createHmac('sha256',keyBytes).update(expected).digest('hex'))
  assert.equal(body.p_key_id,config.keyId)
  assert.equal(body.p_issued_at,'2026-10-16T15:01:00Z')
  assert.equal(body.p_event_id,payload.eventId)
  assert.equal(body.p_subscription_id,payload.subscriptionId)
  assert.equal(options.body.includes('TEST-SYNTHETIC-KEY-MATERIAL'),false)
  return {ok:true,json:async()=>true}
 }})
 assert.equal(await reader.bindVerifiedActivation(payload),true)
 assert.equal(calls,1)
})
test('no signing on wrong source, wrong key, short key or mismatched host',async()=>{
 let calls=0
 for(const patch of [{keyId:'LAB_V1'},{projectUrl:'https://api-m.paypal.com'},
  {keyBytes:new Uint8Array(8)},{makeNonce:()=> 'not-uuid'}]){
  const r=create({...config,...patch,fetchImpl:async()=>{calls++;return {ok:true,json:async()=>true}}})
  assert.equal(await r.bindVerifiedActivation(payload),false)
 }
 const r=create({...config,fetchImpl:async()=>{calls++;return {ok:true,json:async()=>true}}})
 assert.equal(await r.bindVerifiedActivation({...payload,origin:'client_claim'}),false)
 assert.equal(calls,0)
})
test('network rejection and invalid RPC output never claim success',async()=>{
 for(const fetchImpl of [async()=>({ok:false}),async()=>({ok:true,json:async()=>({ok:true})}),async()=>{throw Error('mock network down')}])
  assert.equal(await create({...config,fetchImpl}).bindVerifiedActivation(payload),false)
})

test('P42 signing is disabled without finite exact 24-hour UTC custody window',async()=>{
 let calls=0
 for(const change of [
  {keyNotBefore:undefined},
  {keyNotAfter:undefined},
  {keyNotBefore:'2026-10-16T01:00:00Z'},
  {keyNotAfter:'2026-10-17T00:00:01Z'},
  {keyNotAfter:'2026-10-16T23:59:59Z'},
  {keyNotAfter:'2026-10-17T00:00:00-07:00'},
  {keyNotBefore:'2026-02-30T00:00:00Z'},
  {keyNotAfter:'not-a-date'},
 ]){
  const signer=create({...config,...change,
   fetchImpl:async()=>{calls++;return {ok:true,json:async()=>true}}})
  assert.equal(await signer.bindVerifiedActivation(payload),false)
 }
 assert.equal(calls,0)
})
test('P42 rejects timestamps outside key window with zero RPC attempts',async()=>{
 let calls=0
 for(const time of [
  '2026-10-15T23:59:59Z',
  '2026-10-17T00:00:00Z',
  '2026-10-17T00:00:01Z',
 ]){
  const signer=create({...config,now:()=>new Date(time),
   fetchImpl:async()=>{calls++;return {ok:true,json:async()=>true}}})
  assert.equal(await signer.bindVerifiedActivation(payload),false,time)
 }
 assert.equal(calls,0)
})
test('P42 permits end-minus-one-second only as signed request with no paid rights',async()=>{
 let calls=0
 const signer=create({...config,now:()=>new Date('2026-10-16T23:59:59Z'),
  fetchImpl:async(url,args)=>{
   calls++;const body=JSON.parse(args.body)
   assert.equal(body.p_issued_at,'2026-10-16T23:59:59Z')
   return {ok:true,json:async()=>true}
  }})
 assert.equal(await signer.bindVerifiedActivation(payload),true)
 assert.equal(calls,1)
})
test('P42 refuses to submit HMAC if custody expires during asynchronous sign',async()=>{
 let tick=0,submitted=0
 const signer=create({...config,
  now:()=>new Date(++tick===1?'2026-10-16T23:59:59Z':'2026-10-17T00:00:00Z'),
  fetchImpl:async()=>{submitted++;return {ok:true,json:async()=>true}}})
 assert.equal(await signer.bindVerifiedActivation(payload),false)
 assert.equal(tick,2)
 assert.equal(submitted,0)
})
test('P42 refuses backwards server clock during signing without an RPC request',async()=>{
 let tick=0,submitted=0
 const signer=create({...config,
  now:()=>new Date(++tick===1?'2026-10-16T15:01:00Z':'2026-10-16T15:00:59Z'),
  fetchImpl:async()=>{submitted++;return {ok:true,json:async()=>true}}})
 assert.equal(await signer.bindVerifiedActivation(payload),false)
 assert.equal(submitted,0)
})
