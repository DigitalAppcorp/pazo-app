import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {pathToFileURL} from 'node:url'
import ts from 'typescript'
import React from 'react'
import {create,act} from 'react-test-renderer'

globalThis.IS_REACT_ACT_ENVIRONMENT=true
fs.mkdirSync(path.resolve('node_modules/.cache'),{recursive:true})
const work=fs.mkdtempSync(path.resolve('node_modules/.cache/meta-consent-ui-'))
const filename=path.join(work,'choice.mjs')
const src=fs.readFileSync('src/features/marketing/MetaConsentChoice.tsx','utf8')
fs.writeFileSync(filename,ts.transpileModule(src,{
 compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2023,
  jsx:ts.JsxEmit.ReactJSX},
}).outputText)
const {MetaConsentChoice,META_CHOICES_RELEASED}=await import(pathToFileURL(filename).href)
let root
const flush=async action=>act(async()=>{
 if(action)await action()
 for(let i=0;i<6;i++)await Promise.resolve()
})
function setGpc(value){
 Object.defineProperty(globalThis,'navigator',{
  value:{globalPrivacyControl:value},configurable:true,writable:true,
 })
}
async function render({
 lang='es',gpc=false,onGrant=async()=>false,
 onWithdraw=async()=>true,onContinue=()=>{},onPrivacy=()=>{},
}={}){
 setGpc(gpc)
 await flush(()=>{root=create(React.createElement(MetaConsentChoice,{
  lang,onGrant,onWithdraw,onContinue,onPrivacy,
 }))})
 return root
}
function click(label){
 const nodes=root.root.findAllByType('button')
 const button=nodes.find(x=>String(x.props.children).includes(label))
 assert.ok(button,'missing button '+label)
 return flush(()=>button.props.onClick())
}
test.afterEach(async()=>{
 if(root)await flush(()=>root.unmount())
 root=null
 delete globalThis.navigator
})
test.after(()=>fs.rmSync(work,{recursive:true,force:true}))
test('UI is hardcoded OFF and not linked to the production runtime',()=>{
 assert.equal(META_CHOICES_RELEASED,false)
})
for(const lang of ['es','en'])test(lang+': default unchecked, no pregrant, skip persists opt-out-only',async()=>{
 let grants=0,withdrawals=0,continued=0
 await render({lang,onGrant:async()=>{grants++;return true},
  onWithdraw:async()=>{withdrawals++;return true},
  onContinue:()=>{continued++}})
 assert.equal(root.root.findByType('input').props.checked,false)
 const button=root.root.findAllByType('button').find(x=>x.props.disabled)
 assert.ok(button,'positive consent should be disabled by default')
 await click(lang==='es'?'Continuar sin permitirlo':'Continue without allowing')
 assert.equal(grants,0)
 assert.equal(withdrawals,1)
 assert.equal(continued,1)
})
test('positive choice needs explicit checkbox; success does not persist a refusal',async()=>{
 let grants=0,withdrawals=0,continued=0
 await render({onGrant:async()=>{grants++;return true},
  onWithdraw:async()=>{withdrawals++;return true},
  onContinue:()=>{continued++}})
 const input=root.root.findByType('input')
 await flush(()=>input.props.onChange({currentTarget:{checked:true}}))
 assert.equal(root.root.findByType('input').props.checked,true)
 await click('Permitir medición')
 assert.equal(grants,1);assert.equal(continued,1)
 assert.equal(withdrawals,0)
})
test('grant failure is visible and still allows first-party continuation',async()=>{
 let continued=0,withdrawals=0
 await render({onGrant:async()=>{throw Error('synthetic-outage')},
  onWithdraw:async()=>{withdrawals++;return false},
  onContinue:()=>{continued++}})
 await flush(()=>root.root.findByType('input').props.onChange({
  currentTarget:{checked:true},
 }))
 await click('Permitir medición')
 assert.equal(root.root.findAll(x=>x.props.role==='alert').length,1)
 await click('Continuar sin permitirlo')
 assert.equal(continued,1);assert.equal(withdrawals,1)
})
test('GPC never offers positive consent; persist-only call confirms actual server result',async()=>{
 let withdrawals=0,grants=0,continued=0
 await render({gpc:true,onGrant:async()=>{grants++;return true},
  onWithdraw:async()=>{withdrawals++;return true},
  onContinue:()=>{continued++}})
 assert.equal(root.root.findAllByType('input').length,0)
 assert.equal(root.root.findAllByType('button').some(x=>
   String(x.props.children).includes('Permitir medición')),false)
 assert.equal(grants,0)
 assert.equal(withdrawals,1)
 assert.match(JSON.stringify(root.toJSON()),/quedó guardada/)
 await click('Continuar sin permitirlo')
 assert.equal(continued,1)
 assert.equal(withdrawals,1,'already-saved GPC need not double-send on continue')
})
test('failed GPC server write cannot be reported saved; retry is explicit and works',async()=>{
 let attempt=0
 await render({gpc:true,onWithdraw:async()=>{attempt++;return attempt>1}})
 assert.equal(attempt,1)
 assert.equal(root.root.findAll(x=>x.props.role==='alert').length,1)
 assert.match(JSON.stringify(root.toJSON()),/No pudimos confirmar/)
 await click('Reintentar guardar')
 assert.equal(attempt,2)
 assert.equal(root.root.findAll(x=>x.props.role==='alert').length,0)
 assert.match(JSON.stringify(root.toJSON()),/quedó guardada/)
})
test('GPC effect re-renders without repeatedly writing refusal',async()=>{
 let n=0
 const withdraw=async()=>{n++;return true}
 const props={lang:'en',onGrant:async()=>false,onWithdraw:withdraw,
  onContinue:()=>{},onPrivacy:()=>{}}
 await render({lang:'en',gpc:true,onWithdraw:withdraw})
 await flush(()=>root.update(React.createElement(MetaConsentChoice,props)))
 assert.equal(n,1)
})
