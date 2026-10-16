import test from 'node:test'
import assert from 'node:assert/strict'
import {selectP06AccountOrigin,createP06QaAccountOwnerResolver} from '../../../../supabase/functions/f16-paypal-supporter-account/p06QaAccountOrigin.mjs'
import {resolvePazoAccountOriginGate} from '../../../../supabase/functions/f16-paypal-supporter-account/accountOriginGateP18.mjs'
import {createVerifiedAuthOwnerResolver} from '../../../../supabase/functions/f16-paypal-webhook/verifiedAuthOwner.mjs'

const globalOrigin='https://existing.example.test'
const qaOrigin='https://qa.example.test'
const qaOwner='10000000-0000-4000-8000-000000000001'
const otherOwner='10000000-0000-4000-8000-000000000002'
const env={PAZO_F16_APP_ORIGIN:globalOrigin,PAZO_F16_P06_QA_APP_ORIGIN:qaOrigin,
 PAZO_F16_P06_QA_OWNER_ID:qaOwner,PAZO_F16_P06_QA_ENABLE:'true',PAZO_F16_PAYPAL_ENV:'sandbox'}
const request=(origin,method='OPTIONS')=>new Request('https://service.example.test',{
 method,headers:{origin,'access-control-request-method':'POST',
 'access-control-request-headers':'authorization,apikey,content-type'}})
const selected=(origin,e=env)=>selectP06AccountOrigin({request:request(origin),getEnv:k=>e[k]})
const resolve=(owner,e=env,qaOnly=true)=>createP06QaAccountOwnerResolver({
 resolveOwner:async()=>owner,qaOnly,getEnv:k=>e[k]})({})

test('Existing global origin and preflight remain unchanged',()=>{
 const x=selected(globalOrigin)
 assert.deepEqual(x,{configuredOrigin:globalOrigin,qaOnly:false})
 assert.equal(resolvePazoAccountOriginGate(request(globalOrigin),x.configuredOrigin).response.status,204)
})
test('Exact QA origin preflight works before activation without authorizing a user',()=>{
 const x=selected(qaOrigin,{...env,PAZO_F16_P06_QA_ENABLE:undefined})
 assert.deepEqual(x,{configuredOrigin:qaOrigin,qaOnly:true})
 const r=resolvePazoAccountOriginGate(request(qaOrigin),x.configuredOrigin).response
 assert.equal(r.status,204)
 assert.equal(r.headers.get('access-control-allow-origin'),qaOrigin)
})
test('QA POST requires authenticated owner',async()=>assert.equal(await resolve(null),null))
test('QA POST denies another verified owner',async()=>assert.equal(await resolve(otherOwner),null))
test('QA POST denies missing or false enable',async()=>{
 for(const value of [undefined,'false','TRUE'])
  assert.equal(await resolve(qaOwner,{...env,PAZO_F16_P06_QA_ENABLE:value}),null)
})
test('QA POST denies Live and missing or malformed allowlist',async()=>{
 assert.equal(await resolve(qaOwner,{...env,PAZO_F16_PAYPAL_ENV:'live'}),null)
 for(const value of [undefined,'*',qaOwner+','+otherOwner])
  assert.equal(await resolve(qaOwner,{...env,PAZO_F16_P06_QA_OWNER_ID:value}),null)
})
test('QA POST allows only the exact verified owner in enabled Sandbox',async()=>{
 assert.equal(await resolve(qaOwner),qaOwner)
})
test('Global endpoint keeps existing verified-owner behavior when QA is disabled',async()=>{
 assert.equal(await resolve(otherOwner,{...env,PAZO_F16_P06_QA_ENABLE:undefined},false),otherOwner)
})
test('Same QA and global origin preserves existing global route',()=>{
 assert.deepEqual(selected(globalOrigin,{...env,PAZO_F16_P06_QA_APP_ORIGIN:globalOrigin}),
  {configuredOrigin:globalOrigin,qaOnly:false})
})
test('QA resolver uses verified Auth result, not a posted owner',async()=>{
 let calls=0
 const verified=createVerifiedAuthOwnerResolver({authClient:{auth:{getUser:async()=>{
  calls++;return {data:{user:{id:otherOwner,is_anonymous:false}},error:null}
 }}}})
 const restricted=createP06QaAccountOwnerResolver({resolveOwner:verified,qaOnly:true,getEnv:k=>env[k]})
 const r=new Request('https://service.example.test',{method:'POST',
  headers:{authorization:'Bearer '+ 'a'.repeat(30)},body:JSON.stringify({ownerId:qaOwner})})
 assert.equal(await restricted(r),null)
 assert.equal(calls,1)
})
