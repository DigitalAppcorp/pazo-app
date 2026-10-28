import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {pathToFileURL} from 'node:url'
import ts from 'typescript'
import React from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
import {create,act} from 'react-test-renderer'
globalThis.IS_REACT_ACT_ENVIRONMENT=true
fs.mkdirSync('node_modules/.cache',{recursive:true})
const cache=fs.mkdtempSync(path.resolve('node_modules/.cache/first-use-'))
async function load(file){const f=path.join(cache,path.basename(file).replace(/\.tsx?$/,'.mjs'));fs.writeFileSync(f,ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2023,jsx:ts.JsxEmit.ReactJSX}}).outputText);return import(pathToFileURL(f).href)}
const {shouldOfferFirstUse,isCurrentFirstUse}=await load('src/features/onboarding/firstUse.ts')
const {FirstUsePrompt}=await load('src/features/onboarding/FirstUsePrompt.tsx')
test.after(()=>fs.rmSync(cache,{recursive:true,force:true}))
test('only a successful first owned pet gets an offer; no guest, existing account or duplicate completion',()=>{
 assert.equal(shouldOfferFirstUse([],'owner','pet'),true)
 for(const args of [[['old'],'owner','pet'],[[],undefined,'pet'],[[],'owner',undefined],[[],'owner','pet',true]])assert.equal(shouldOfferFirstUse(...args),false)
})
test('an account/pet change cannot display a hint belonging to another identity',()=>{
 const hint={ownerId:'a',petId:'pa',intent:'qr'}
 assert.equal(isCurrentFirstUse(hint,'a','pa'),true)
 assert.equal(isCurrentFirstUse(hint,'b','pa'),false)
 assert.equal(isCurrentFirstUse(hint,'a','pb'),false)
 assert.equal(isCurrentFirstUse(null,'a','pa'),false)
})
for(const lang of ['es','en'])for(const intent of ['qr','neutral'])test(`${lang}/${intent} has honest inline copy and optional real-tool actions`,async()=>{
 const calls=[];let root
 await act(async()=>{root=create(React.createElement(FirstUsePrompt,{lang,intent,petName:'Luna',onQr:()=>calls.push('qr'),onCare:()=>calls.push('care'),onExplore:()=>calls.push('explore')}))})
 const buttons=root.root.findAllByType('button');assert.equal(buttons.length,3)
 await act(async()=>{buttons.forEach(b=>b.props.onClick())})
 assert.deepEqual(calls,['qr','care','explore'])
 const html=renderToStaticMarkup(React.createElement(FirstUsePrompt,{lang,intent,petName:'Luna',onQr(){},onCare(){},onExplore(){}}))
 assert.match(html,/min-h-11/);assert.doesNotMatch(html,/role="dialog"|PayPal|2\.99|onboarding|RPC|border-|ring-/)
 assert.match(html,lang==='es'?/Explorar PAZO/:/Explore PAZO/)
 await act(async()=>root.unmount())
})
