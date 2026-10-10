import test from 'node:test'
import assert from 'node:assert/strict'
import {finalizeA3AuthUser,A3AuthFinalBlocked} from './authFinal.ts'

const SUBJECT = '22222222-2222-4222-8222-222222222222'
function fixture(overrides = {}) {
  const calls=[]
  let exists = overrides.exists ?? true
  const fail = overrides.fail ?? null
  const portNames=[
    'verifyExclusiveLease','verifyStorageAndUrlsGone',
    'verifyPersonalDataGone','verifyOtherUsersPreserved',
    'verifySessionsRevoked','verifyRetentionReviewed',
    'stageFinalIntent','verifyFinalIntent','markCompleted',
  ]
  const ports=Object.fromEntries(portNames.map(name=>[name,async(id)=>{
    calls.push(name)
    assert.equal(id,SUBJECT)
    return name === fail ? false : true
  }]))
  const admin={auth:{admin:{
    getUserById:async(id)=>{
      calls.push('auth.getUserById')
      assert.equal(id,SUBJECT)
      return exists
        ? {data:{user:{id:SUBJECT}},error:null}
        : {data:{user:null},error:overrides.authReadError ?? {status:404}}
    },
    deleteUser:async(id,soft)=>{
      calls.push('auth.deleteUser')
      assert.equal(id,SUBJECT)
      assert.equal(soft,false)
      if(overrides.deleteError) return {error:new Error('Auth failure')}
      exists=false
      return {error:null}
    },
  }}}
  return {admin,ports,calls}
}
const invoke=(f,approved=true)=>
  finalizeA3AuthUser(f.admin,f.ports,SUBJECT,approved)

test('release OFF cannot access even Auth read',async()=>{
 const f=fixture()
 await assert.rejects(invoke(f,false),A3AuthFinalBlocked)
 assert.deepEqual(f.calls,[])
})
test('Auth deletion is last destructive step and success is verified by 404',async()=>{
 const f=fixture()
 assert.deepEqual(await invoke(f),{completed:true})
 const authDelete=f.calls.indexOf('auth.deleteUser')
 assert.ok(authDelete>f.calls.indexOf('stageFinalIntent'))
 assert.ok(authDelete>f.calls.indexOf('verifyRetentionReviewed'))
 assert.ok(f.calls.indexOf('auth.getUserById',authDelete)>authDelete)
 assert.equal(f.calls.at(-1),'markCompleted')
 assert.ok(f.calls.filter(name=>name==='verifyExclusiveLease').length>=3)
})
test('every failed invariant blocks Auth deletion and completion',async()=>{
 for(const name of [
  'verifyExclusiveLease','verifyStorageAndUrlsGone',
  'verifyPersonalDataGone','verifyOtherUsersPreserved',
  'verifySessionsRevoked','verifyRetentionReviewed',
  'stageFinalIntent','verifyFinalIntent',
 ]){
   const f=fixture({fail:name})
   await assert.rejects(invoke(f),A3AuthFinalBlocked)
   assert.ok(!f.calls.includes('auth.deleteUser'),name)
   assert.ok(!f.calls.includes('markCompleted'),name)
 }
})
test('Auth failure or unverified absence never marks completed',async()=>{
 for(const opts of [
  {deleteError:true},
  {authReadError:{status:500},exists:false},
  {authReadError:{status:403},exists:false},
  {authReadError:null,exists:false},
 ]){
  const f=fixture(opts)
  await assert.rejects(invoke(f),A3AuthFinalBlocked)
  assert.ok(!f.calls.includes('markCompleted'))
 }
})
test('crash retry can complete only with durable prior intent, without re-delete',async()=>{
 const f=fixture({exists:false})
 assert.deepEqual(await invoke(f),{completed:true})
 assert.ok(!f.calls.includes('auth.deleteUser'))
 assert.ok(!f.calls.includes('stageFinalIntent'))
 assert.ok(f.calls.includes('verifyFinalIntent'))
})
test('crash retry without registered intent fails closed',async()=>{
 const f=fixture({exists:false,fail:'verifyFinalIntent'})
 await assert.rejects(invoke(f),A3AuthFinalBlocked)
 assert.ok(!f.calls.includes('auth.deleteUser'))
 assert.ok(!f.calls.includes('markCompleted'))
})
test('markCompleted must succeed to report completion',async()=>{
 const f=fixture({fail:'markCompleted'})
 await assert.rejects(invoke(f),A3AuthFinalBlocked)
 assert.ok(f.calls.includes('auth.deleteUser'))
 assert.equal(f.calls.at(-1),'markCompleted')
})
