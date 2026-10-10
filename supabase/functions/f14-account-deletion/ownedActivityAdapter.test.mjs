import test from 'node:test'
import assert from 'node:assert/strict'
import {removeA3OwnedActivity,A3OwnedActivityBlocked} from './ownedActivityAdapter.ts'

const OPERATOR='11111111-1111-4111-8111-111111111111'
const SUBJECT='22222222-2222-4222-8222-222222222222'
const lease={
  token:'33333333-3333-4333-8333-333333333333',
  revision:5,phase:'clean_private_data',
}
function mock(opts={}){
  const calls=[]
  const admin={
    auth:{getUser:async(jwt)=>{
      calls.push(['auth.getUser',jwt])
      return {
        data:{user:opts.identity===undefined?{id:OPERATOR}:opts.identity},
        error:opts.authError??null,
      }
    }},
    rpc:async(name,args)=>{
      calls.push([name,args])
      return {data:opts.report===undefined?{
        owned_replies_removed_for_review:true,
        third_party_survival_rechecked:true,
        account_deleted:false,destructive_execution_allowed:false,
      }:opts.report,error:opts.rpcError??null}
    },
  }
  return {admin,calls}
}

test('sends only exact subject/lease to privately authorized SQL',async()=>{
  const t=mock()
  const response=await removeA3OwnedActivity(
    t.admin,'verified-operator-access-token',SUBJECT,lease)
  assert.deepEqual(response,{
    reviewed:true,accountDeleted:false,destructiveExecutionAllowed:false,
  })
  assert.deepEqual(t.calls[1],[
    'f14_a3_remove_owned_activity',{
      p_subject_user_id:SUBJECT,p_reviewer_user_id:OPERATOR,
      p_lease_token:lease.token,p_revision:5,
    },
  ])
})

test('rejects no auth, forged subject and stale/malformed lease before SQL',async()=>{
  for(const [opts,leaseCandidate,subject] of [
    [{identity:null},lease,SUBJECT],
    [{authError:{status:401}},lease,SUBJECT],
    [{identity:{id:SUBJECT}},lease,SUBJECT],
    [{}, {...lease,phase:'review_request'},SUBJECT],
    [{}, {...lease,token:'bad'},SUBJECT],
    [{}, {...lease,revision:0},SUBJECT],
    [{},lease,'bad'],
  ]){
    const t=mock(opts)
    await assert.rejects(removeA3OwnedActivity(
      t.admin,'verified-operator-access-token',subject,leaseCandidate),
      A3OwnedActivityBlocked)
    assert.ok(!t.calls.some(([name])=>name==='f14_a3_remove_owned_activity'))
  }
})

test('missing proof, forged claim of account erasure or SQL error fails',async()=>{
  for(const report of [
    null,{},[],{owned_replies_removed_for_review:true,
      third_party_survival_rechecked:true,
      account_deleted:true,destructive_execution_allowed:false},
    {owned_replies_removed_for_review:true,
      third_party_survival_rechecked:false,
      account_deleted:false,destructive_execution_allowed:false},
  ]){
    const t=mock({report})
    await assert.rejects(removeA3OwnedActivity(
      t.admin,'verified-operator-access-token',SUBJECT,lease),
      A3OwnedActivityBlocked)
  }
  const t=mock({rpcError:new Error('lease expired')})
  await assert.rejects(removeA3OwnedActivity(
    t.admin,'verified-operator-access-token',SUBJECT,lease),
    A3OwnedActivityBlocked)
})
