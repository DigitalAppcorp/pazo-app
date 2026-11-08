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
async function load(file){const f=path.join(cache,path.basename(file).replace(/\.tsx?$/,'.mjs'));fs.writeFileSync(f,ts.transpileModule(fs.readFileSync(file,'utf8').replaceAll('../notices/AppNotice','./AppNotice.mjs').replaceAll('../illustrations/PazoStateIllustration','./PazoStateIllustration.mjs'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2023,jsx:ts.JsxEmit.ReactJSX}}).outputText);return import(pathToFileURL(f).href)}
await load('src/features/illustrations/PazoStateIllustration.tsx')
await load('src/features/notices/AppNotice.tsx')
const {shouldOfferFirstUse,isCurrentFirstUse}=await load('src/features/onboarding/firstUse.ts')
const {FirstUsePrompt}=await load('src/features/onboarding/FirstUsePrompt.tsx')
const {HomeFeedStatus}=await load('src/features/feed/HomeFeedStatus.tsx')
const {petSpeciesLabel,petAgeLabel}=await load('src/features/i18n/petLabels.ts')
test.after(()=>fs.rmSync(cache,{recursive:true,force:true}))
test('species presentation is localized without rewriting enums or custom labels',()=>{
 for(const [value,label] of Object.entries({gato:'Cat',perro:'Dog',conejo:'Rabbit',ave:'Bird',otro:'Other'})){
  assert.equal(petSpeciesLabel(value,'en'),label);assert.equal(petSpeciesLabel(value,'es'),value)
 }
 assert.equal(petSpeciesLabel('custom owner label','en'),'custom owner label')
})
test('only the service empty-age placeholder is translated, owner-entered age stays intact',()=>{
 assert.equal(petAgeLabel('Desconocida','en'),'Unknown');assert.equal(petAgeLabel('Desconocida','es'),'Desconocida')
 for(const value of ['3 años','2 years','owner text',''])assert.equal(petAgeLabel(value,'en'),value)
})
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
for(const lang of ['es','en'])for(const status of ['loading','error'])test(`${lang}/${status} is an illustrated page state, never an onboarding notice`,async()=>{
 let root;const calls=[]
 await act(async()=>{root=create(React.createElement(HomeFeedStatus,{lang,status,onRetry:()=>calls.push('retry'),onOpenPetTools:()=>calls.push('tools')}))})
 assert.equal(root.root.findAll(n=>n.props.role===(status==='loading'?'status':'alert')).length,1)
 const buttons=root.root.findAllByType('button');assert.equal(buttons.length,status==='loading'?1:2)
 await act(async()=>buttons.forEach(b=>b.props.onClick()))
 assert.deepEqual(calls,status==='loading'?['tools']:['retry','tools'])
 const html=renderToStaticMarkup(React.createElement(HomeFeedStatus,{lang,status,onOpenPetTools(){}}))
 assert.doesNotMatch(html,/aria-modal|data-pazo-app-notice|Dismiss notice|Cerrar aviso|PayPal|<img/)
 assert.match(html,/<svg aria-hidden="true"/)
 assert.match(html,new RegExp(`data-pazo-feed-state="${status}"`))
 await act(async()=>root.unmount())
})
for(const lang of ['es','en'])for(const intent of ['qr','neutral'])test(`${lang}/${intent} notice has primary QR, paired secondary choices and safe dismissal`,async()=>{
 const calls=[];let root
 await act(async()=>{root=create(React.createElement(FirstUsePrompt,{lang,intent,petName:'Luna',onDismiss:()=>calls.push('dismiss'),onQr:()=>calls.push('qr'),onCare:()=>calls.push('care'),onExplore:()=>calls.push('explore')}))})
 const buttons=root.root.findAllByType('button');assert.equal(buttons.length,4)
 await act(async()=>{buttons.forEach(b=>b.props.onClick())})
 assert.deepEqual(calls,['dismiss','qr','care','explore'])
 const html=renderToStaticMarkup(React.createElement(FirstUsePrompt,{lang,intent,petName:'Luna',onExplore(){}}))
 assert.doesNotMatch(html,/role="dialog"|aria-modal|PayPal|2\.99|onboarding|RPC/)
 assert.match(html,lang==='es'?/Todo listo, Luna/:/All set, Luna/)
 assert.match(html,lang==='es'?/Explorar PAZO/:/Explore PAZO/)
 await act(async()=>root.unmount())
})
