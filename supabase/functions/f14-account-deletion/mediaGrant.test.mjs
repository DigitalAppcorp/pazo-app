import test from 'node:test'
import assert from 'node:assert/strict'
import {authorizeA3MediaGrant,A3MediaGrantDenied} from './mediaGrant.ts'

const operator='11111111-1111-4111-8111-111111111111'
const subject='22222222-2222-4222-8222-222222222222'
const lease={token:'33333333-3333-4333-8333-333333333333',revision:4,phase:'remove_media'}
const object={
  bucket:'post-photos',path:'22222222-2222-4222-8222-222222222222/post.png',
  objectVersion:'version-1',objectVerified:true,ownershipVerified:true,
  totalReferences:1,referencesOwnedByRequester:1,
  accountWritesFrozen:true,workerLeaseValidated:true,
}
function port(opts={}){
 const calls=[]
 const client={
  auth:{getUser:async jwt=>{calls.push(['getUser',jwt]);return{
   data:{user:opts.user===undefined?{id:operator}:opts.user},error:opts.authError??null,
  }}},
  rpc:async(name,args)=>{calls.push([name,args]);return{
   data:opts.grant===undefined?true:opts.grant,
   error:opts.error??null,
  }},
 }
 return {client,calls}
}
test('approved operator can request only one exact version and path',async()=>{
 const x=port()
 assert.equal(await authorizeA3MediaGrant(x.client,'valid-jwt-token-for-operator',subject,lease,object),true)
 assert.deepEqual(x.calls.map(x=>x[0]),['getUser','f14_a3_allow_exact_media_remove'])
 assert.deepEqual(x.calls[1][1],{
  p_subject_user_id:subject,p_reviewer_user_id:operator,
  p_lease_token:lease.token,p_revision:4,p_bucket:'post-photos',
  p_path:object.path,p_object_version:'version-1',
 })
})
test('unsafe path, shared object and stale lease never reach Supabase',async()=>{
 const inputs=[
  [lease,{...object,bucket:'nonexistent'}],
  [lease,{...object,path:'../private'}],
  [lease,{...object,totalReferences:2}],
  [lease,{...object,objectVersion:null}],
  [{...lease,token:'invalid'},object],
  [{...lease,phase:'review_request'},object],
  [{...lease,revision:0},object],
 ]
 for(const [l,row] of inputs){
  const x=port()
  await assert.rejects(authorizeA3MediaGrant(
    x.client,'valid-jwt-token-for-operator',subject,l,row),A3MediaGrantDenied)
  assert.equal(x.calls.length,0)
 }
})
test('cannot get grant with subject JWT, expired operator or DB deny',async()=>{
 for(const opts of [
  {user:null},{user:{id:subject}},
  {authError:new Error('expired')},
  {grant:false},{grant:'true'},{error:new Error('lease expired')},
 ]){
  const x=port(opts)
  await assert.rejects(authorizeA3MediaGrant(
   x.client,'valid-jwt-token-for-operator',subject,lease,object),A3MediaGrantDenied)
  if(opts.user===null||opts.user?.id===subject||opts.authError)
    assert.ok(!x.calls.some(c=>c[0]==='f14_a3_allow_exact_media_remove'))
 }
})
