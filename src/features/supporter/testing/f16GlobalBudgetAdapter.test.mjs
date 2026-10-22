import test from 'node:test'
import assert from 'node:assert/strict'
import {createF16GlobalAdmission} from '../../../../supabase/functions/f16-paypal-webhook/globalAdmissionAdapter.mjs'

const base='https://mrybvqdebbgcayuvgkkr.supabase.co'
const key='TEST_ONLY_NOT_A_REAL_SERVICE_KEY_123456'
test('global budget uses only the fixed project private RPC with server-only credentials',async()=>{
 const calls=[]
 const gate=createF16GlobalAdmission({
  projectUrl:base,serviceRoleKey:key,
  fetchImpl:async(url,request)=>{calls.push({url,request});return {ok:true,json:async()=>true}},
 })
 assert.equal(await gate.tryAdmit(),true)
 assert.equal(calls.length,1)
 assert.equal(calls[0].url,base+'/rest/v1/rpc/f16_paypal_try_admit_global')
 assert.equal(calls[0].request.method,'POST')
 assert.equal(calls[0].request.redirect,'error')
 assert.equal(calls[0].request.body,'{}')
 assert.equal(calls[0].request.headers.Authorization,'Bearer '+key)
 assert.equal(JSON.stringify(calls[0].request.body).includes(key),false)
})
test('wrong project and missing service-role key are denied at construction',()=>{
 for(const projectUrl of ['https://other.supabase.co',base+'/x','http://mrybvqdebbgcayuvgkkr.supabase.co']){
  assert.throws(()=>createF16GlobalAdmission({projectUrl,serviceRoleKey:key}))
 }
 assert.throws(()=>createF16GlobalAdmission({projectUrl:base,serviceRoleKey:'bad'}))
})
test('database outage and malformed RPC reply never allow admission',async()=>{
 for(const fetchImpl of [
  async()=>({ok:false,status:503}),
  async()=>({ok:true,json:async()=>({allowed:true})}),
  async()=>{throw Error('synthetic unavailable')},
 ]){
  const gate=createF16GlobalAdmission({projectUrl:base,serviceRoleKey:key,fetchImpl})
  await assert.rejects(()=>gate.tryAdmit())
 }
})
