import test from 'node:test'
import assert from 'node:assert/strict'
import {removeVerifiedA3Object,A3StorageBlocked} from './storageRemoval.ts'

const row=()=>({
 bucket:'post-photos',path:'11111111-1111-4111-8111-111111111111/post.webp',
 objectVersion:'gen-1',objectVerified:true,ownershipVerified:true,
 totalReferences:1,referencesOwnedByRequester:1,accountWritesFrozen:true,
 workerLeaseValidated:true,
})

function harness(options={}){
 const calls=[]
 let exists=options.exists===undefined?true:options.exists
 const admin={storage:{from(bucket){
   calls.push('bucket:'+bucket)
   return {
     exists:async(path)=>{
       calls.push('exists:'+path)
       return {data:exists,error:options.existsError??null}
     },
     remove:async(paths)=>{
       calls.push('remove:'+paths.join(','))
       if(options.removeError) return {error:new Error('storage failure')}
       exists=false
       return {error:null}
     },
   }
 }}}
 const proofs={
   verifyLease:async()=>{calls.push('lease');return options.lease??true},
   verifyWriteFence:async()=>{calls.push('fence');return options.fence??true},
   verifyExactGenerationAndReferences:async()=>{
     calls.push('version');return options.version??true
   },
   verifyPreviouslyRemoved:async()=>{
     calls.push('oldCheckpoint');return options.oldCheckpoint??false
   },
   checkpointRemoved:async()=>{
     calls.push('checkpoint');return options.checkpoint??true
   },
   verifyOldUrlAndCdn:async()=>{
     calls.push('url');return options.url??true
   },
 }
 return {admin,proofs,calls}
}
async function blocked(opts={},entry=row()){
 const x=harness(opts)
 await assert.rejects(removeVerifiedA3Object(x.admin,entry,x.proofs),A3StorageBlocked)
 return x.calls
}

test('only an exact owned object is removed and independently verified',async()=>{
 const x=harness()
 const evidence=await removeVerifiedA3Object(x.admin,row(),x.proofs)
 assert.deepEqual(evidence,{
  originObjectMissing:true,oldPublicUrlUnavailable:true,
  storageNoLongerReferencesObject:true,cdnResponseVerified:true,
 })
 const removal=x.calls.findIndex(v=>v.startsWith('remove:'))
 assert.ok(removal>0)
 assert.ok(x.calls.lastIndexOf('version')<removal)
 assert.ok(x.calls.includes('checkpoint'))
 assert.ok(x.calls.lastIndexOf('exists:'+row().path)>removal)
 assert.ok(x.calls.lastIndexOf('url')>removal)
})

test('shared, foreign, unsafe and duplicate candidates are never removed',async()=>{
 for(const invalid of [
   {...row(),totalReferences:2,referencesOwnedByRequester:1},
   {...row(),ownershipVerified:false},
   {...row(),bucket:'inbox'},
   {...row(),path:'../escape'},
   {...row(),objectVersion:null},
   {...row(),workerLeaseValidated:false},
   {...row(),accountWritesFrozen:false},
 ]){
   const calls=await blocked({},invalid)
   assert.ok(!calls.some(v=>v.startsWith('remove:')))
 }
})

test('missing lease, fence, authoritative generation or origin blocks physical remove',async()=>{
 for(const options of [
  {lease:false},{fence:false},{version:false},
  {existsError:new Error('unavailable')},{exists:null},
 ]){
   const calls=await blocked(options)
   assert.ok(!calls.some(v=>v.startsWith('remove:')),JSON.stringify(options))
 }
})

test('a disappearing file is not accepted without prior server-side checkpoint',async()=>{
 const calls=await blocked({exists:false})
 assert.ok(!calls.some(v=>v.startsWith('remove:')))
})

test('retry accepts absence with verified durable checkpoint, no second remove',async()=>{
 const x=harness({exists:false,oldCheckpoint:true})
 await removeVerifiedA3Object(x.admin,row(),x.proofs)
 assert.ok(x.calls.includes('oldCheckpoint'))
 assert.ok(!x.calls.some(v=>v.startsWith('remove:')))
})

test('failed removal or failed checkpoint cannot return success',async()=>{
 for(const options of [{removeError:true},{checkpoint:false},{url:false}]){
   const calls=await blocked(options)
   if(options.removeError) assert.ok(!calls.includes('checkpoint'))
   assert.ok(!calls.includes('auth.admin.deleteUser'))
 }
})
