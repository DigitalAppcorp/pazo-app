import test from 'node:test'
import assert from 'node:assert/strict'
import {isP06SandboxQaAuthorized} from '../../../../supabase/functions/f16-paypal-supporter/p06SandboxQaGate.mjs'
const owner='35cf30bf-df81-4bc2-ad44-cb06285dc4e1'
const other='7b105617-ceaa-4208-a29c-90ab9762d763'
const env=new Map([
 ['PAZO_F16_PAYPAL_ENV','sandbox'],
 ['PAZO_F16_P06_QA_ENABLE','true'],
 ['PAZO_F16_P06_QA_OWNER_ID',owner],
])
const authorized=(environment,verifiedOwnerId)=>isP06SandboxQaAuthorized({
 getEnv:k=>environment.get(k),verifiedOwnerId,
})
test('P06 default denies without flags even for verified owner',()=>{
 assert.equal(authorized(new Map(),owner),false)
 assert.equal(authorized(new Map([['PAZO_F16_PAYPAL_ENV','sandbox']]),owner),false)
})
test('P06 permits only exact server-verified test Auth owner in Sandbox',()=>{
 assert.equal(authorized(env,owner),true)
 assert.equal(authorized(env,other),false)
 assert.equal(authorized(env,null),false)
 assert.equal(authorized(env,'invalid'),false)
})
test('P06 fails closed for Live, disabled, malformed or missing QA ID',()=>{
 for(const key of ['PAZO_F16_PAYPAL_ENV','PAZO_F16_P06_QA_ENABLE','PAZO_F16_P06_QA_OWNER_ID']){
  const x=new Map(env)
  x.delete(key)
  assert.equal(authorized(x,owner),false,key)
 }
 const live=new Map(env)
 live.set('PAZO_F16_PAYPAL_ENV','live')
 assert.equal(authorized(live,owner),false)
 const off=new Map(env)
 off.set('PAZO_F16_P06_QA_ENABLE','false')
 assert.equal(authorized(off,owner),false)
 const wrong=new Map(env)
 wrong.set('PAZO_F16_P06_QA_OWNER_ID',other)
 assert.equal(authorized(wrong,owner),false)
 assert.equal(isP06SandboxQaAuthorized({getEnv:()=>{throw Error('env unavailable')},verifiedOwnerId:owner}),false)
})
