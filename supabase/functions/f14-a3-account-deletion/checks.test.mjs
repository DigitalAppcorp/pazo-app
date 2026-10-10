import test from 'node:test'
import assert from 'node:assert/strict'
import {createA3ReadOnlyChecks} from './checks.ts'
const id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const claim={token:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',version:7}
test('server checks are narrow: other eight gates have no provider',()=>{
 const checks=createA3ReadOnlyChecks({rpc:async()=>({data:true,error:null})})
 assert.deepEqual(Object.keys(checks).sort(),['legacy_authorship_reconciled','worker_lease_valid'])
 assert.equal(checks.recent_reauthentication,undefined)
 assert.equal(checks.writes_frozen,undefined)
 assert.equal(checks.media_origin_and_public_urls_verified,undefined)
})
test('live lease needs strict boolean true and correct claim',async()=>{
 const seen=[]
 const checks=createA3ReadOnlyChecks({rpc:async(name,args)=>{seen.push({name,args});return{data:true,error:null}}})
 assert.deepEqual(await checks.worker_lease_valid(id,claim),{passed:true})
 assert.deepEqual(seen,[{name:'f14_a3_worker_validate_lease',
   args:{p_job_id:id,p_token:claim.token,p_version:7}}])
})
test('legacy JSON reconciliation accepts only true, not truthy data',async()=>{
 for(const data of ['true',1,null,false,{legacy_clear:true}]) {
   const checks=createA3ReadOnlyChecks({rpc:async()=>({data,error:null})})
   assert.deepEqual(await checks.legacy_authorship_reconciled(id,claim),
     {passed:false,issue:'unsafe_dependency'})
 }
 const checks=createA3ReadOnlyChecks({rpc:async()=>({data:true,error:null})})
 assert.deepEqual(await checks.legacy_authorship_reconciled(id,claim),{passed:true})
})
test('server RPC errors fail closed and never expose details',async()=>{
 const checks=createA3ReadOnlyChecks({rpc:async()=>({
   data:true,error:{message:'private@example.test'},
 })})
 assert.deepEqual(await checks.worker_lease_valid(id,claim),{passed:false,issue:'missing_evidence'})
 const r=await checks.legacy_authorship_reconciled(id,claim)
 assert.deepEqual(r,{passed:false,issue:'unsafe_dependency'})
 assert.equal(JSON.stringify(r).includes('private@example'),false)
})
