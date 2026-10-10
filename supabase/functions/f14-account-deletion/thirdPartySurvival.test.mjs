import test from 'node:test'
import assert from 'node:assert/strict'
import {verifyA3ThirdPartySurvival,A3ThirdPartySurvivalBlocked} from './thirdPartySurvival.ts'

const REVIEWER='11111111-1111-4111-8111-111111111111'
const SUBJECT='22222222-2222-4222-8222-222222222222'
const lease={
 token:'33333333-3333-4333-8333-333333333333',
 revision:3,phase:'preserve_others',
}
function mock(opts={}){
 const calls=[]
 const admin={
  auth:{getUser:async()=>{calls.push('auth.getUser');return{
   data:{user:opts.reviewer===undefined?{id:REVIEWER}:opts.reviewer},
   error:opts.authError??null,
  }}},
  rpc:async(name,args)=>{calls.push(name);return{
   data:opts.data===undefined?{
    expected_contributions:4,missing_contributions:0,
    survival_verified:true,destructive_execution_allowed:false,
   }:opts.data,error:opts.rpcError??null,
  }},
 }
 return {admin,calls}
}
const run=(m,l=lease)=>verifyA3ThirdPartySurvival(
 m.admin,'verified-operator-token-string',SUBJECT,l,
)
test('retained contribution IDs and authors must be verified independently',async()=>{
 const m=mock()
 assert.deepEqual(await run(m),{
  expectedContributions:4,missingContributions:0,
  survivalVerified:true,destructiveExecutionAllowed:false,
 })
 assert.deepEqual(m.calls,['auth.getUser','f14_a3_verify_other_users_survived'])
})
test('never accesses private RPC with invalid reviewer or review-only lease',async()=>{
 for(const [options,l] of [
  [{reviewer:null},lease],[{reviewer:{id:SUBJECT}},lease],
  [{authError:new Error('session expired')},lease],
  [{}, {...lease,phase:'review_request'}],
  [{}, {...lease,token:'forged'}],
  [{}, {...lease,revision:0}],
 ]){
  const m=mock(options)
  await assert.rejects(run(m,l),A3ThirdPartySurvivalBlocked)
  assert.ok(!m.calls.includes('f14_a3_verify_other_users_survived'))
 }
})
test('missing row, forged aggregate or unknown status blocks closure',async()=>{
 for(const result of [
  null,[],{},
  {expected_contributions:4,missing_contributions:1,
    survival_verified:false,destructive_execution_allowed:false},
  {expected_contributions:4,missing_contributions:1,
    survival_verified:true,destructive_execution_allowed:false},
  {expected_contributions:4,missing_contributions:0,
    survival_verified:true,destructive_execution_allowed:true},
  {expected_contributions:'4',missing_contributions:0,
    survival_verified:true,destructive_execution_allowed:false},
  {expected_contributions:NaN,missing_contributions:0,
    survival_verified:true,destructive_execution_allowed:false},
 ]){
  const m=mock({data:result})
  await assert.rejects(run(m),A3ThirdPartySurvivalBlocked)
 }
 const fail=mock({rpcError:new Error('database unavailable')})
 await assert.rejects(run(fail),A3ThirdPartySurvivalBlocked)
})
