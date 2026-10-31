import test from 'node:test'
import assert from 'node:assert/strict'
import {persistAuthenticatedMetaGpc}
  from '../supabase/functions/_shared/metaGpcOverride.mjs'
import {createMetaGrantHandler}
  from '../supabase/functions/pazo-meta-consent/grantCore.mjs'
import {createMetaReceiptHandler}
  from '../supabase/functions/pazo-meta-receipt/receiptCore.mjs'
import {createMetaGrantProvider}
  from '../supabase/functions/pazo-meta-consent/grantAdapter.mjs'
import {createMetaReceiptProvider}
  from '../supabase/functions/pazo-meta-receipt/receiptAdapter.mjs'

const owner='16900000-0000-4000-8000-000000000001'
const token='synthetic-server-auth-jwt-for-gpc-test'
const origin='https://pazo-app.vercel.app'
const user={id:owner,is_anonymous:false,email_confirmed_at:new Date().toISOString()}
const get=(path='grant',headers={})=>new Request('https://test.invalid',{
 method:'POST',headers:{origin,'content-type':'application/json',
 authorization:'Bearer '+token,'sec-gpc':'1',...headers},
 body:path==='receipt'?'{}':'{"action":"grant","noticeVersion":"pazo-meta-conversions-v1"}',
})
const mock=(type,write=async()=>true)=>{
 const state={grants:0,receipts:0,withdrawals:0,auth:0}
 const opts={released:true,privacyReviewed:true,
  authenticate:async()=>{state.auth++;return user},
  persistGpc:async id=>{state.withdrawals++;assert.equal(id,owner);return write()},
  grant:async()=>{state.grants++;return true},
  lookupReceipt:async()=>{state.receipts++;return null},
 }
 return {state,handler:type==='grant'?createMetaGrantHandler(opts):createMetaReceiptHandler(opts)}
}
test('authenticated Sec-GPC:1 persists withdrawal before any grant or receipt read',async()=>{
 for(const name of ['grant','receipt']){
  const {handler,state}=mock(name)
  const res=await handler(get(name))
  assert.equal(res.status,403)
  assert.deepEqual(await res.json(),{status:'not_available'})
  assert.deepEqual(state,{grants:0,receipts:0,withdrawals:1,auth:1})
  assert.equal(res.headers.get('cache-control'),'no-store, private')
 }
})
test('GPC persistence errors never claim durable exclusion or process conversion',async()=>{
 for(const name of ['grant','receipt']){
  for(const write of [async()=>false,async()=>{throw Error('unavailable')}]) {
   const {handler,state}=mock(name,write)
   const res=await handler(get(name))
   assert.equal(res.status,503)
   assert.deepEqual(await res.json(),{status:'not_available'})
   assert.equal(state.withdrawals,1)
   assert.equal(state.grants+state.receipts,0)
  }
 }
})
test('missing persistence adapter cannot accidentally grant/claim under GPC',async()=>{
 for(const name of ['grant','receipt']){
  const {handler,state}=mock(name)
  const disabled=createMetaGrantHandler({released:true,privacyReviewed:true,
   authenticate:async()=>{state.auth++;return user},
   grant:async()=>{state.grants++;return true}})
  const h=name==='grant'?disabled:createMetaReceiptHandler({
   released:true,privacyReviewed:true,
   authenticate:async()=>{state.auth++;return user},
   lookupReceipt:async()=>{state.receipts++;return null},
  })
  assert.equal((await h(get(name))).status,403)
  assert.equal(state.auth+state.grants+state.receipts,0)
 }
})
test('GPC cannot spoof identity; invalid authorization never invokes privileged RPC',async()=>{
 for(const name of ['grant','receipt']){
  let read=0,mutations=0
  const common={released:true,privacyReviewed:true,
   authenticate:async()=>{read++;return null},
   persistGpc:async()=>{mutations++;return true},
   grant:async()=>{mutations++;return true},
   lookupReceipt:async()=>{mutations++;return null},
  }
  const handler=name==='grant'?createMetaGrantHandler(common):
   createMetaReceiptHandler(common)
  assert.equal((await handler(get(name))).status,401)
  assert.equal(read,1);assert.equal(mutations,0)
  assert.equal((await handler(get(name,{authorization:''}))).status,401)
  assert.equal(read,1);assert.equal(mutations,0)
  assert.equal((await handler(get(name,{origin:'https://attacker.invalid'}))).status,403)
  assert.equal(read,1);assert.equal(mutations,0)
 }
})
test('GPC OPTIONS preflight never writes privacy changes',async()=>{
 for(const name of ['grant','receipt']){
  const {handler,state}=mock(name)
  const res=await handler(new Request('https://test.invalid',{method:'OPTIONS',
   headers:{origin,'sec-gpc':'1','access-control-request-method':'POST'},
  }))
  assert.equal(res.status,204)
  assert.equal(state.auth+state.withdrawals+state.grants+state.receipts,0)
 }
})
test('server GPC helper rejects anonymous, invalid owner and bad request',async()=>{
 const request=get()
 for(const userValue of [{...user,is_anonymous:true},{id:'not-a-uuid'},null]){
  let mutation=0
  const status=await persistAuthenticatedMetaGpc({request,
   authenticate:async()=>userValue,
   withdraw:async()=>{mutation++;return true}})
  assert.equal(status,'unauthorized')
  assert.equal(mutation,0)
 }
 assert.equal(await persistAuthenticatedMetaGpc({request,
  authenticate:async()=>user,withdraw:null}),'unavailable')
})
test('real candidate adapters route a GPC POST to private withdrawal RPC only',async()=>{
 const url='https://mrybvqdebbgcayuvgkkr.supabase.co'
 const anonKey='synthetic_anon_key_for_auth_1234567'
 const serviceKey='synthetic_service_role_key_for_gpc_1234567'
 for(const type of ['grant','receipt']){
  const calls=[]
  const fetchImpl=async(path,opts)=>{
   calls.push({path,opts})
   if(path.endsWith('/auth/v1/user'))
    return new Response(JSON.stringify(user),{status:200})
   if(path.endsWith('/auth/v1/settings'))
    return new Response(JSON.stringify({mailer_autoconfirm:false}),{status:200})
   if(path.endsWith('/rpc/pazo_meta_withdraw_candidate'))
    return new Response('true',{status:200})
   throw Error('GPC must never touch grant/receipt DB RPC')
  }
  const args={url,anonKey,serviceKey,fetchImpl}
  const provider=type==='grant'?createMetaGrantProvider(args):
   createMetaReceiptProvider({...args,datasetId:'1438916858347709'})
  const handler=type==='grant'?
   createMetaGrantHandler({released:true,privacyReviewed:true,...provider}):
   createMetaReceiptHandler({released:true,privacyReviewed:true,...provider})
  assert.equal((await handler(get(type))).status,403)
  assert.deepEqual(calls.map(x=>x.path.split('/').slice(-2).join('/')),[
   'v1/user','v1/settings','rpc/pazo_meta_withdraw_candidate'])
  const call=calls[2]
  assert.deepEqual(JSON.parse(call.opts.body),{p_owner:owner})
  assert.equal(call.opts.headers.authorization,'Bearer '+serviceKey)
  assert.equal(call.opts.body.includes(serviceKey),false)
 }
})
