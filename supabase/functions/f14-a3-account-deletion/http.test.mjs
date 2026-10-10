import test from 'node:test'
import assert from 'node:assert/strict'
import {makeA3InternalReviewHandler} from './http.ts'

const secret='abcdefghijklmnopqrstuvwxyz-SECRET-123456'
const id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const claim={token:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',version:1}
function request(secretHeader=secret,input={jobId:id,claim}){
 return new Request('https://example.invalid/functions/v1/f14-a3-account-deletion',{
  method:'POST',headers:{'content-type':'application/json','x-a3-worker-key':secretHeader},
  body:JSON.stringify(input),
 })
}
function safePort() {
 let revision=0
 return{
  async readJob(){return{status:'reviewing'}},
  async leaseIsCurrent(){return true},
  async readRevision(){return revision},
  async inspectGate(){return{passed:false,issue:'missing_evidence'}},
  async saveCheckpoint({expectedRevision}){return expectedRevision===revision ? ++revision : null},
 }
}
test('disabled worker never constructs a service client',async()=>{
 let called=0
 const h=makeA3InternalReviewHandler({enabled:false,invokeSecret:secret,makePort:()=>{called++;return safePort()}})
 const r=await h(request())
 assert.equal(r.status,503); assert.equal(called,0)
 assert.equal(r.headers.get('access-control-allow-origin'),null)
})
test('missing or incorrect internal secret is rejected and no service access',async()=>{
 let called=0
 const h=makeA3InternalReviewHandler({enabled:true,invokeSecret:secret,makePort:()=>{called++;return safePort()}})
 assert.equal((await h(request('wrong-secret'))).status,401)
 assert.equal((await h(request('X'.repeat(64)))).status,401)
 assert.equal(called,0)
})
test('authorized review returns blocked, not account deletion',async()=>{
 const h=makeA3InternalReviewHandler({enabled:true,invokeSecret:secret,makePort:safePort})
 const r=await h(request())
 const data=await r.json()
 assert.equal(r.status,200)
 assert.equal(data.status,'blocked')
 assert.equal(data.irreversibleAllowed,false)
 assert.equal(r.headers.get('cache-control'),'no-store')
 assert.equal(r.headers.get('access-control-allow-origin'),null)
})
test('bad input, large bodies, unsupported media and HTTP method fail closed',async()=>{
 const h=makeA3InternalReviewHandler({enabled:true,invokeSecret:secret,makePort:safePort})
 assert.equal((await h(request(secret,{hello:true}))).status,400)
 assert.equal((await h(request(secret,{jobId:id,claim:{version:'1',token:claim.token}}))).status,400)
 assert.equal((await h(request(secret,{payload:'X'.repeat(2000)}))).status,413)
 assert.equal((await h(new Request('https://example.invalid',{method:'GET'}))).status,405)
 const unsupported=new Request('https://example.invalid',{method:'POST',headers:{'x-a3-worker-key':secret},body:'{}'})
 assert.equal((await h(unsupported)).status,415)
})
test('internal exceptions are sanitized and never leak paths',async()=>{
 const h=makeA3InternalReviewHandler({enabled:true,invokeSecret:secret,
   makePort:()=>{throw Error('private/path/and/token')},
 })
 const r=await h(request())
 assert.equal(r.status,503)
 assert.ok(!(await r.text()).includes('private/path'))
})
