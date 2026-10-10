import test from 'node:test'
import assert from 'node:assert/strict'
import {beginA3Processing,A3ProcessingBlocked} from './processingAdapter.ts'

const operator='11111111-1111-4111-8111-111111111111'
const subject='22222222-2222-4222-8222-222222222222'
const lease={
  revision:2,leaseToken:'33333333-3333-4333-8333-333333333333',
  expiresAt:'2026-10-10T12:00:00Z',stage:'review_request',
  destructiveExecutionAllowed:false,
}
function port(opts={}){
 const calls=[]
 return {
   calls,
   admin:{
     auth:{getUser:async jwt=>{
       calls.push('auth')
       return {data:{user:opts.user===undefined?{id:operator}:opts.user},error:opts.authError??null}
     }},
     rpc:async (name,args)=>{
       calls.push(name)
       if(name==='f14_a3_review_operator_authorized') return {data:opts.operator??true,error:null}
       if(name==='f14_a3_reauth_evidence_valid') return {data:opts.reauth??true,error:null}
       return {data:opts.processing??{
         status:'processing',frozen:true,revision:2,destructive_execution_allowed:false,
       },error:opts.error??null}
     },
   },
 }
}
test('processing transition is atomic SQL call after owner and reviewer verification',async()=>{
 const x=port()
 const r=await beginA3Processing(x.admin,'verified-operator-token-string',subject,lease)
 assert.deepEqual(r,{processing:true,revision:2,destructiveExecutionAllowed:false})
 assert.deepEqual(x.calls,[
  'auth','f14_a3_review_operator_authorized','f14_a3_reauth_evidence_valid',
  'auth','f14_a3_start_processing',
 ])
})
test('no SQL processing call after invalid fresh-login or operator proof',async()=>{
 for(const opts of [
  {operator:false},{reauth:false},{reauth:'true'},
  {authError:new Error('expired')},{user:{id:subject}},
 ]){
   const x=port(opts)
   await assert.rejects(beginA3Processing(x.admin,'verified-operator-token-string',subject,lease),A3ProcessingBlocked)
   assert.ok(!x.calls.includes('f14_a3_start_processing'))
 }
})
test('unverified freeze receipt never authorizes destructive execution',async()=>{
 for(const processing of [
  {status:'processing',frozen:false,revision:2,destructive_execution_allowed:false},
  {status:'requested',frozen:true,revision:2,destructive_execution_allowed:false},
  {status:'processing',frozen:true,revision:1,destructive_execution_allowed:false},
  {status:'processing',frozen:true,revision:2,destructive_execution_allowed:true},
  null,
 ]){
   const x=port({processing})
   await assert.rejects(beginA3Processing(x.admin,'verified-operator-token-string',subject,lease),A3ProcessingBlocked)
 }
})
test('malformed lease fails before Auth and RPC',async()=>{
 for(const value of [
  null,{}, {...lease,leaseToken:'bad'}, {...lease,stage:'remove_media'},
  {...lease,destructiveExecutionAllowed:true}, {...lease,revision:-1},
 ]){
   const x=port()
   await assert.rejects(beginA3Processing(x.admin,'verified-operator-token-string',subject,value),A3ProcessingBlocked)
   assert.deepEqual(x.calls,[])
 }
})
