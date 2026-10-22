import test,{after} from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import {create,act} from 'react-test-renderer'
import {readFileSync,mkdirSync,mkdtempSync,writeFileSync,rmSync} from 'node:fs'
import {resolve,join} from 'node:path'
import {pathToFileURL} from 'node:url'
import ts from 'typescript'
globalThis.IS_REACT_ACT_ENVIRONMENT=true
const cache=resolve('node_modules/.cache')
mkdirSync(cache,{recursive:true})
const temp=mkdtempSync(join(cache,'pazo-live-resource-ui-'))
after(()=>{if(temp.startsWith(cache+'\\')||temp.startsWith(cache+'/'))rmSync(temp,{recursive:true,force:true})})
const source=readFileSync(new URL('../components/AdminPaypalLiveResourceCheck.tsx',import.meta.url),'utf8')
 .replace("import {supabase} from '../../../services/supabaseClient'",
  'const supabase=globalThis.__PAZO_RESOURCE_UI_SYNTHETIC__')
writeFileSync(join(temp,'component.mjs'),ts.transpileModule(source,{compilerOptions:{
 target:ts.ScriptTarget.ES2023,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX
}}).outputText)
const calls=[]
let inspectResponse
globalThis.__PAZO_RESOURCE_UI_SYNTHETIC__={functions:{invoke:async(name,options)=>{
 calls.push({name,body:{...options.body}})
 if(options.body.action==='read_reservation')return {data:{ok:true,code:'reserved_generation_read',
  generation:1,webhookId:'',webhookUrl:'https://mrybvqdebbgcayuvgkkr.supabase.co/functions/v1/pazo-paypal-live-webhook?generation=1',
  mayCharge:false,liveActivated:false,credentialsStored:false},error:null}
 return inspectResponse
}}}
const {AdminPaypalLiveResourceCheck}=await import(pathToFileURL(join(temp,'component.mjs')).href)
const props={lang:'es',mfaRecentlyVerified:false,onVerified:async()=>{}}
test('resource form makes no request or exposes credential inputs until recent MFA',async()=>{
 calls.length=0
 let tree
 await act(async()=>{tree=create(React.createElement(AdminPaypalLiveResourceCheck,props))})
 assert.equal(tree.root.findAllByType('input').length,0)
 assert.equal(calls.length,0)
 await act(async()=>{tree.unmount()})
})
test('resource form clears keys while request is pending and accepts only bounded success',async()=>{
 calls.length=0
 let resolveResponse,verified=0,tree
 inspectResponse=new Promise(resolve=>{resolveResponse=resolve})
 await act(async()=>{tree=create(React.createElement(AdminPaypalLiveResourceCheck,{
  ...props,mfaRecentlyVerified:true,onVerified:async()=>{verified++}
 }))})
 assert.equal(calls.length,1)
 const inputs=tree.root.findAllByType('input')
 await act(async()=>{
  inputs[0].props.onChange({target:{value:'WH-SYNTHETIC-RESOURCE'}})
  inputs[1].props.onChange({target:{value:'SYNTHETIC_CLIENT_ID_12345'}})
  inputs[2].props.onChange({target:{value:'SYNTHETIC_CLIENT_SECRET_12345'}})
 })
 await act(async()=>{tree.root.findByType('form').props.onSubmit({preventDefault(){}})})
 assert.deepEqual(tree.root.findAllByType('input').slice(1).map(x=>x.props.value),['',''])
 assert.equal(calls.at(-1).body.clientSecret,'SYNTHETIC_CLIENT_SECRET_12345')
 assert.equal(verified,0)
 await act(async()=>{resolveResponse({data:{ok:true,code:'live_resource_configuration_recorded',
  generation:1,planReadVerified:true,webhookReadVerified:true,credentialsStored:false,
  mayCharge:false,liveActivated:false,merchantIdentityVerified:false,webhookDeliveryVerified:false},error:null})})
 assert.equal(verified,1)
 assert.match(JSON.stringify(tree.toJSON()),/Claves no guardadas/)
 assert.doesNotMatch(JSON.stringify(tree.toJSON()),/SYNTHETIC_CLIENT/)
 await act(async()=>{tree.unmount()})
})
test('expired MFA removes secrets and an old response cannot change the new form state',async()=>{
 let resolveResponse,verified=0,tree
 inspectResponse=new Promise(resolve=>{resolveResponse=resolve})
 const currentProps={...props,mfaRecentlyVerified:true,onVerified:async()=>{verified++}}
 await act(async()=>{tree=create(React.createElement(AdminPaypalLiveResourceCheck,currentProps))})
 await act(async()=>{
  for(const [i,value] of ['WH-SYNTHETIC-RESOURCE','SYNTHETIC_CLIENT_ID_12345','SYNTHETIC_CLIENT_SECRET_12345'].entries())
   tree.root.findAllByType('input')[i].props.onChange({target:{value}})
 })
 await act(async()=>{tree.root.findByType('form').props.onSubmit({preventDefault(){}})})
 await act(async()=>{tree.update(React.createElement(AdminPaypalLiveResourceCheck,{...currentProps,mfaRecentlyVerified:false}))})
 assert.equal(tree.root.findAllByType('input').length,0)
 await act(async()=>{resolveResponse({data:{ok:true,code:'live_resource_configuration_recorded',generation:1},error:null})})
 assert.equal(verified,0)
 assert.doesNotMatch(JSON.stringify(tree.toJSON()),/SYNTHETIC_CLIENT/)
 await act(async()=>{tree.unmount()})
})
