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
let response,reads=[],root
const metrics=['verified_registrations','first_pet_accounts','matured_first_pet_accounts','first_utility_accounts','qr_visible_accounts','qr_download_initiated_accounts','qr_share_confirmed_accounts','care_created_accounts','d7_matured_accounts','d7_return_accounts']
globalThis.__UTILITY_PANEL__={utilityMetrics:metrics,firstUtilitySummary:days=>{reads.push(days);return response(days)}}
const cache=fs.mkdtempSync(path.resolve('node_modules/.cache/utility-panel-')),f=path.join(cache,'panel.mjs')
let source=fs.readFileSync('src/features/marketing/FirstUtilityPanel.tsx','utf8').replace(/import \{[^}]+\} from '.\/firstUtility'/,'const {firstUtilitySummary,utilityMetrics}=globalThis.__UTILITY_PANEL__')
fs.writeFileSync(f,ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2023,jsx:ts.JsxEmit.ReactJSX}}).outputText)
const {FirstUtilityPanel}=await import(pathToFileURL(f).href)
const flush=async fn=>act(async()=>{await fn?.();for(let i=0;i<4;i++)await Promise.resolve()})
test.afterEach(async()=>{if(root)await flush(()=>root.unmount());root=null;reads=[]})
test.after(()=>{delete globalThis.__UTILITY_PANEL__;fs.rmSync(cache,{recursive:true,force:true})})
for(const lang of ['es','en'])test(lang+' distinguishes absent/paused/small-sample outcomes without inventing success',async()=>{
 response=async()=>({status:'collecting',effective_days:14,groups:[]})
 await flush(()=>{root=create(React.createElement(FirstUtilityPanel,{lang,period:30}))})
 assert.match(JSON.stringify(root.toJSON()),lang==='es'?/Datos insuficientes/:/Insufficient data/)
 assert.match(JSON.stringify(root.toJSON()),lang==='es'?/no prueba|no prueban/:/do not prove/)
 response=()=>Promise.reject(Error('not installed'))
 await flush(()=>root.root.findByType('button').props.onClick())
 assert.equal(root.root.findAll(x=>x.props.role==='alert').length,1)
})
test('older report cannot overwrite a new period; error retry is local',async()=>{
 let finishOld
 response=days=>days===7?new Promise(r=>finishOld=r):Promise.resolve({status:'paused',effective_days:14,groups:[]})
 await flush(()=>{root=create(React.createElement(FirstUtilityPanel,{lang:'en',period:7}))})
 await flush(()=>root.update(React.createElement(FirstUtilityPanel,{lang:'en',period:30})))
 await flush(()=>finishOld({status:'collecting',effective_days:7,groups:[]}))
 assert.match(JSON.stringify(root.toJSON()),/Collection paused/)
 assert.deepEqual(reads,[7,30])
})
