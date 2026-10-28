import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {pathToFileURL} from 'node:url'
import ts from 'typescript'
fs.mkdirSync('node_modules/.cache',{recursive:true})
const cache=fs.mkdtempSync(path.resolve('node_modules/.cache/first-pet-lifetime-'))
let state
const row=()=>({id:'pet-a',owner_id:'a',name:'Luna',species:'gato',age:null,photo_url:'synthetic',created_at:new Date().toISOString()})
const fake={
 auth:{getUser:async()=>({data:{user:{id:state.owner}},error:null}),getSession:async()=>({data:{session:{user:{id:state.owner},access_token:'token-'+state.owner}},error:null})},
 rpc(){
  const headers={};state.onRpc?.()
  const builder={setHeader(k,v){headers[k]=v;return builder},then(a,b){
   state.dispatches.push({authorization:headers.Authorization,effectiveOwner:headers.Authorization?.replace('Bearer token-','')??state.owner})
   return (state.reply??Promise.resolve({data:'pet-a',error:null})).then(a,b)
  }};return builder
 },
 from(table){
  if(table==='pets')state.petReads++
  const builder={select(){return builder},eq(){return builder},in(){return builder},
   single:async()=>({data:row(),error:null}),then:(a,b)=>Promise.resolve({data:[],error:null}).then(a,b)}
  return builder
 }
}
globalThis.__FIRST_PET_SERVICE__=fake
const source=fs.readFileSync('src/services/petService.ts','utf8').replace("import { supabase } from './supabaseClient'",'const supabase=globalThis.__FIRST_PET_SERVICE__')
const file=path.join(cache,'pet-service.mjs')
fs.writeFileSync(file,ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2023}}).outputText)
const {createPetProfile}=await import(pathToFileURL(file).href)
const scopeFile=path.join(cache,'scope.mjs')
fs.writeFileSync(scopeFile,ts.transpileModule(fs.readFileSync('src/lib/requestScope.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2023}}).outputText)
const {createRequestScope}=await import(pathToFileURL(scopeFile).href)
const input={name:'Luna',species:'gato'}
test.beforeEach(()=>{state={owner:'a',dispatches:[],petReads:0}})
test.after(()=>{delete globalThis.__FIRST_PET_SERVICE__;fs.rmSync(cache,{recursive:true,force:true})})
test('first-pet request pins the verified owner token while preserving a successful creation',async()=>{
 const scope=createRequestScope();const pet=await createPetProfile(input,scope.capture())
 assert.equal(pet.id,'pet-a');assert.deepEqual(state.dispatches,[{authorization:'Bearer token-a',effectiveOwner:'a'}])
})
test('session changed between verified getUser and token snapshot cannot dispatch for another owner',async()=>{
 const scope=createRequestScope();const pending=createPetProfile(input,scope.capture());state.owner='b'
 await assert.rejects(pending,{name:'AbortError'});assert.equal(state.dispatches.length,0)
})
test('A to B to A retires first-pet creation even when the owner ID matches again',async()=>{
 const scope=createRequestScope();const pending=createPetProfile(input,scope.capture());scope.invalidate();state.owner='a'
 await assert.rejects(pending,{name:'AbortError'});assert.equal(state.dispatches.length,0)
})
test('a token switch during RPC dispatch cannot substitute the next account authorization',async()=>{
 const scope=createRequestScope();state.onRpc=()=>{state.owner='b'}
 await createPetProfile(input,scope.capture())
 assert.equal(state.dispatches[0].authorization,'Bearer token-a');assert.equal(state.dispatches[0].effectiveOwner,'a')
})
test('a retired late RPC response does not start a new owner read or publish its pet',async()=>{
 let resolve;state.reply=new Promise(r=>resolve=r)
 const scope=createRequestScope();const pending=createPetProfile(input,scope.capture())
 for(let i=0;i<12;i++)await Promise.resolve()
 assert.equal(state.dispatches.length,1);scope.invalidate()
 resolve({data:'pet-a',error:null})
 await assert.rejects(pending,{name:'AbortError'});assert.equal(state.petReads,0)
})
