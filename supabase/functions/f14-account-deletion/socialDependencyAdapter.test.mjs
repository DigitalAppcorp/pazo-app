import test from 'node:test'
import assert from 'node:assert/strict'
import {getA3SocialDependencies} from './socialDependencyAdapter.ts'
import {A3_SOCIAL_COUNTS} from './socialDependencyReview.ts'
import {A3ReviewDenied} from './reviewAdapter.ts'

const OPERATOR='11111111-1111-4111-8111-111111111111'
const SUBJECT='22222222-2222-4222-8222-222222222222'
const counts={
 ...Object.fromEntries(A3_SOCIAL_COUNTS.map(n=>[n,0])),
 social_cleanup_verified:false,destructive_execution_allowed:false,
}
function mock({identity=OPERATOR,operator=true,inventoryValid=true,report=counts}={}){
 const calls=[]
 const admin={
  auth:{getUser:async token=>{
   calls.push('auth.getUser')
   return {data:{user:identity?{id:identity}:null},error:null}
  }},
  rpc:async name=>{
   calls.push(name)
   if(name==='f14_a3_review_operator_authorized')return {data:operator,error:null}
   if(name==='f14_a3_review_inventory')return {data:inventoryValid?{
    owned_pets:0,owned_posts:0,owned_communities:0,
    third_party_feed_comments:0,third_party_community_posts:0,
    owned_documents:0,owned_care_items:0,
    total_storage_objects_needing_ownership_review:0,
    destructive_execution_allowed:false,
   }:{},error:null}
   if(name==='f14_a3_social_dependency_review')return {data:report,error:null}
   throw new Error('Unexpected RPC')
  },
 }
 return {admin,calls}
}
test('authorized reviewer sees aggregated counts but no subject identifiers',async()=>{
 const {admin,calls}=mock()
 const r=await getA3SocialDependencies(admin,'verified-reviewer-bearer-token',SUBJECT)
 assert.deepEqual(r,counts)
 assert.deepEqual(calls,[
  'auth.getUser','f14_a3_review_operator_authorized',
  'f14_a3_review_inventory','f14_a3_social_dependency_review',
 ])
 assert.equal(JSON.stringify(r).includes(OPERATOR),false)
 assert.equal(JSON.stringify(r).includes(SUBJECT),false)
})
test('unverified JWT, wrong reviewer, invalid inventory never reaches social query',async()=>{
 for(const options of [
  {identity:null},{identity:SUBJECT},{operator:false},{inventoryValid:false},
 ]){
  const {admin,calls}=mock(options)
  await assert.rejects(getA3SocialDependencies(admin,'verified-reviewer-bearer-token',SUBJECT),A3ReviewDenied)
  assert.ok(!calls.includes('f14_a3_social_dependency_review'))
 }
})
test('malformed social counts fail closed',async()=>{
 for(const report of [null,{},[],{...counts,owned_pets:'0'},
   {...counts,third_party_feed_replies_to_preserve:-1},
   {...counts,destructive_execution_allowed:true}]){
  const {admin}=mock({report})
  await assert.rejects(getA3SocialDependencies(admin,'verified-reviewer-bearer-token',SUBJECT),A3ReviewDenied)
 }
})
