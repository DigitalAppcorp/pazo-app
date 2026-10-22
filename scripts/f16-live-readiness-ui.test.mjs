import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {pathToFileURL} from 'node:url'
import React from 'react'
import {create,act} from 'react-test-renderer'
import ts from 'typescript'
globalThis.IS_REACT_ACT_ENVIRONMENT=true
const root=fs.mkdtempSync(path.resolve('node_modules/.cache/pazo-readiness-ui-'))
let code=ts.transpileModule(fs.readFileSync('src/features/admin/components/AdminLiveReadiness.tsx','utf8'),{
 compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2023,jsx:ts.JsxEmit.ReactJSX}
}).outputText
code=code.replace(/import \{([^}]+)\} from ['"]([^'"]+)['"];?/g,(all,names,specifier)=>{
 if(specifier==='react'||specifier==='react/jsx-runtime')return all
 if(specifier.endsWith('supabaseClient'))return 'const supabase={rpc:(...args)=>globalThis.__PAZO_READINESS_DB__.rpc(...args)};'
 if(specifier.endsWith('AuthContext'))return 'const useAuth=()=>({user:globalThis.__PAZO_READINESS_USER__});'
 if(specifier.endsWith('liveReadiness.mjs'))return 'import {'+names+'} from '+JSON.stringify(pathToFileURL(path.resolve('src/features/admin/liveReadiness.mjs')).href)+';'
 throw Error('Unexpected dependency: '+specifier)
})
fs.writeFileSync(path.join(root,'readiness.mjs'),code)
const {AdminLiveReadiness}=await import(pathToFileURL(path.join(root,'readiness.mjs')).href)
let vault=ts.transpileModule(fs.readFileSync('src/features/admin/components/AdminPaypalLiveVaultSetup.tsx','utf8'),{
 compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2023,jsx:ts.JsxEmit.ReactJSX}
}).outputText.replace(/import \{([^}]+)\} from ['"]([^'"]+)['"];?/g,(all,_names,specifier)=>{
 if(specifier==='react'||specifier==='react/jsx-runtime')return all
 if(specifier.endsWith('supabaseClient'))return 'const supabase={functions:{invoke:(...args)=>globalThis.__PAZO_READINESS_DB__.invoke(...args)}};'
 throw Error('Unexpected Vault dependency: '+specifier)
})
fs.writeFileSync(path.join(root,'vault.mjs'),vault)
const {AdminPaypalLiveVaultSetup}=await import(pathToFileURL(path.join(root,'vault.mjs')).href)
const row=stored=>({source:'pazo_live_admin_readiness_v1',asOf:'2026-10-21T21:00:00Z',
 phase:'engineering_pending',checkoutActive:false,mayActivate:false,mayCharge:false,
 checks:{termsReady:true,ownerRecoverySchemaReady:true,benefitsSchemaReady:true,
  financeSchemaReady:true,releaseControlsReady:false,credentialsStored:stored,
  providerResourcesVerified:stored,workerHealthy:true},
 blockers:stored?['controlled_release_pending']:
  ['controlled_release_pending','live_credentials_pending','provider_verification_pending']})
const text=ui=>JSON.stringify(ui.toJSON())
test('readiness discards the previous admin response and clears stale status on read failure',async()=>{
 let resolveA;let fail=false;const calls=[]
 globalThis.__PAZO_READINESS_USER__={id:'owner-a'}
 globalThis.__PAZO_READINESS_DB__={rpc:async name=>{
  calls.push(name)
  if(globalThis.__PAZO_READINESS_USER__.id==='owner-a')return new Promise(r=>{resolveA=r})
  return fail?{data:null,error:Error('unavailable')}:{data:row(false),error:null}
 }}
 let ui
 try{
  await act(async()=>{ui=create(React.createElement(AdminLiveReadiness,{lang:'es'}))})
  assert.equal(typeof resolveA,'function')
  await act(async()=>{globalThis.__PAZO_READINESS_USER__={id:'owner-b'};ui.update(React.createElement(AdminLiveReadiness,{lang:'es'}))})
  await act(async()=>resolveA({data:row(true),error:null}))
  assert.match(text(ui),/todavía no constan como guardadas/)
  assert.doesNotMatch(text(ui),/Credenciales originales guardadas/)
  fail=true
  await act(async()=>ui.root.findByType('button').props.onClick())
  assert.match(text(ui),/No se pudo comprobar la preparación/)
  assert.doesNotMatch(text(ui),/Checkout Live apagado/)
  assert.deepEqual(calls,Array(3).fill('pazo_admin_live_readiness'))
 }finally{if(ui)await act(async()=>ui.unmount())}
})
test('stored credentials survive remount and uncertain saves allow only a readback action',async()=>{
 let posts=0,reads=0,ui
 globalThis.__PAZO_READINESS_DB__={invoke:async()=>{posts++;return {data:null,error:Error('uncertain')}}}
 const props={lang:'es',mfaRecentlyVerified:true,credentialsStored:false,onStored:()=>{reads++}}
 try{
  await act(async()=>{ui=create(React.createElement(AdminPaypalLiveVaultSetup,props))})
  await act(async()=>{
   for(const input of ui.root.findAllByType('input'))input.props.onChange({target:{value:'SYNTHETIC_PRIVATE_VALUE_12345678'}})
  })
  await act(async()=>ui.root.findByType('form').props.onSubmit({preventDefault(){}}))
  assert.equal(posts,1);assert.equal(ui.root.findAllByType('input').length,0)
  await act(async()=>ui.root.findByType('button').props.onClick())
  assert.equal(reads,1);assert.equal(posts,1)
  await act(async()=>ui.unmount())
  await act(async()=>{ui=create(React.createElement(AdminPaypalLiveVaultSetup,{...props,mfaRecentlyVerified:false,credentialsStored:true}))})
  assert.equal(ui.root.findAllByType('input').length,0)
  assert.match(text(ui),/Claves comprobadas y guardadas/)
  assert.doesNotMatch(text(ui),/código nuevo del autenticador/)
  assert.equal(posts,1)
 }finally{if(ui)await act(async()=>ui.unmount())}
})
test.after(()=>{
 delete globalThis.__PAZO_READINESS_USER__;delete globalThis.__PAZO_READINESS_DB__
 fs.rmSync(root,{recursive:true,force:true})
})
