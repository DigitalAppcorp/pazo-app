import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {pathToFileURL} from 'node:url'
import React from 'react'
import {create,act} from 'react-test-renderer'
import ts from 'typescript'
globalThis.IS_REACT_ACT_ENVIRONMENT=true
const root=fs.mkdtempSync(path.resolve('node_modules/.cache/pazo-release-ui-'))
let code=ts.transpileModule(fs.readFileSync('src/features/admin/components/AdminLiveReleaseControl.tsx','utf8'),{
 compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2023,jsx:ts.JsxEmit.ReactJSX}
}).outputText.replace(/import \{([^}]+)\} from ['"]([^'"]+)['"];?/g,(all,names,specifier)=>{
 if(specifier==='react'||specifier==='react/jsx-runtime')return all
 if(specifier.endsWith('supabaseClient'))return 'const supabase={rpc:(...args)=>globalThis.__PAZO_RELEASE_DB__.rpc(...args),functions:{invoke:(...args)=>globalThis.__PAZO_RELEASE_DB__.invoke(...args)}};'
 if(specifier.endsWith('AuthContext'))return 'const useAuth=()=>({user:globalThis.__PAZO_RELEASE_USER__});'
 if(specifier.endsWith('liveReleaseStatus.mjs'))return 'import {'+names+'} from '+JSON.stringify(pathToFileURL(path.resolve('src/features/admin/liveReleaseStatus.mjs')).href)+';'
 throw Error('Unexpected dependency: '+specifier)
})
fs.writeFileSync(path.join(root,'control.mjs'),code)
const {AdminLiveReleaseControl}=await import(pathToFileURL(path.join(root,'control.mjs')).href)
const status=patch=>({source:'pazo_live_release_status_v1',asOf:'2026-10-22T00:00:00Z',mode:'off',revision:0,
 engineeringVerified:true,preparationReady:true,originalOperator:true,mayCharge:false,...patch})
const props={lang:'es',mfaRecentlyVerified:true,onChanged:()=>{}}
const text=ui=>JSON.stringify(ui.toJSON())
const button=(ui,label)=>ui.root.findAllByType('button').find(b=>b.children.join('')===label)
test('release UI keeps explicit consent unchecked and blocks operations without technical readiness or MFA',async()=>{
 for(const patch of [{mfaRecentlyVerified:false},{}]){
  let ui,writes=0
  globalThis.__PAZO_RELEASE_USER__={id:'owner-a'}
  globalThis.__PAZO_RELEASE_DB__={rpc:async()=>({data:status({engineeringVerified:false,preparationReady:false}),error:null}),
   invoke:async()=>{writes++}}
  try{
   await act(async()=>{ui=create(React.createElement(AdminLiveReleaseControl,{...props,...patch}))})
   assert.equal(ui.root.findByType('input').props.checked,false)
   assert.equal(button(ui,'Confirmar operación').props.disabled,true)
   assert.match(text(ui),/preparación técnica/);assert.equal(writes,0)
  }finally{if(ui)await act(async()=>ui.unmount())}
 }
})
test('double click sends one confirmed operation; uncertain result offers readback instead of another POST',async()=>{
 let ui,finish;const writes=[];let reads=0
 globalThis.__PAZO_RELEASE_USER__={id:'owner-a'}
 globalThis.__PAZO_RELEASE_DB__={rpc:async()=>{reads++;return {data:status(),error:null}},
  invoke:async(name,options)=>{writes.push({name,body:options.body});return new Promise(resolve=>{finish=resolve})}}
 try{
  await act(async()=>{ui=create(React.createElement(AdminLiveReleaseControl,props))})
  assert.equal(button(ui,'Confirmar operación').props.disabled,true)
  await act(async()=>ui.root.findByType('input').props.onChange({target:{checked:true}}))
  await act(async()=>{const submit=button(ui,'Confirmar operación').props.onClick;submit();submit()})
  assert.equal(writes.length,1)
  assert.equal(writes[0].name,'pazo-admin-paypal-release')
  assert.equal(writes[0].body.confirmation,'AUTORIZO PRUEBA LIVE DE 2.99 USD')
  assert.equal(writes[0].body.expectedRevision,0)
  await act(async()=>finish({data:null,error:Error('uncertain')}))
  assert.match(text(ui),/Consulta el estado/);assert.equal(ui.root.findAllByType('input').length,0)
  await act(async()=>button(ui,'Consultar estado de activación').props.onClick())
  assert.equal(reads,2);assert.equal(writes.length,1)
  assert.equal(ui.root.findByType('input').props.checked,false)
 }finally{if(ui)await act(async()=>ui.unmount())}
})
test('emergency stop remains available under failed readiness; late prior-account status is discarded',async()=>{
 let ui,finish;const writes=[]
 globalThis.__PAZO_RELEASE_USER__={id:'owner-a'}
 globalThis.__PAZO_RELEASE_DB__={rpc:async()=>new Promise(resolve=>{finish=resolve}),invoke:async(name,options)=>{
  writes.push(options.body);return {data:{code:'release_state_updated',mode:'off',revision:2,mayCharge:false},error:null}
 }}
 try{
  await act(async()=>{ui=create(React.createElement(AdminLiveReleaseControl,props))})
  globalThis.__PAZO_RELEASE_USER__={id:'owner-b'}
  globalThis.__PAZO_RELEASE_DB__.rpc=async()=>({data:status({mode:'canary',revision:1,engineeringVerified:false,
   preparationReady:false,originalOperator:false}),error:null})
  await act(async()=>ui.update(React.createElement(AdminLiveReleaseControl,props)))
  await act(async()=>finish({data:status(),error:null}))
  assert.equal(ui.root.findByType('select').props.value,'stop')
  await act(async()=>ui.root.findByType('input').props.onChange({target:{checked:true}}))
  assert.equal(button(ui,'Confirmar operación').props.disabled,false)
  await act(async()=>button(ui,'Confirmar operación').props.onClick())
  assert.equal(writes.length,1);assert.equal(writes[0].action,'stop')
  assert.equal(writes[0].expectedRevision,1);assert.equal(writes[0].confirmation,'DETENER NUEVAS COMPRAS')
 }finally{if(ui)await act(async()=>ui.unmount())}
})
test.after(()=>{
 delete globalThis.__PAZO_RELEASE_USER__;delete globalThis.__PAZO_RELEASE_DB__
 fs.rmSync(root,{recursive:true,force:true})
})
