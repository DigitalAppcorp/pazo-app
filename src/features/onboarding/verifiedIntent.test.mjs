import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {pathToFileURL} from 'node:url'
import ts from 'typescript'
fs.mkdirSync('node_modules/.cache',{recursive:true})
const cache=fs.mkdtempSync(path.resolve('node_modules/.cache/verified-intent-'))
async function moduleFrom(source,name){const file=path.join(cache,name+'.mjs');fs.writeFileSync(file,ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2023}}).outputText);return import(pathToFileURL(file).href)}
const attr=await moduleFrom(fs.readFileSync('src/features/marketing/attribution.ts','utf8'),'attribution')
let result={data:{status:'accepted'},error:null},reply,calls=[]
const storage=new Map()
const oldWindow=globalThis.window
globalThis.window={localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},location:{search:''}}
globalThis.__INTENT_RUNTIME__={browserAnalyticsAllowed:()=>true,captureAnalyticsRequest:()=>()=>true,subscribeAnalyticsPreference:()=>()=>{},...attr,shouldSendLandingSignal:()=>false,requestLandingChallenge:async()=>null,supabase:{functions:{invoke:async(name,args)=>{calls.push({name,args});return reply?reply():result}}}}
let source=fs.readFileSync('src/features/marketing/marketingRuntime.ts','utf8').replace(/import \{([^}]+)\} from '[^']+'/g,(_all,names)=>`const {${names}}=globalThis.__INTENT_RUNTIME__`)
const runtime=await moduleFrom(source,'runtime')
function stage(code='qr_es',owner='a'){
 runtime.stageMarketingLanding('?utm_source=meta&utm_medium=paid_social&utm_campaign=pazo_beta_local_202610&utm_content='+code)
 runtime.stageMarketingSignupRequested(owner)
 runtime.stageMarketingSignupVerified(new Date(Date.now()-1000).toISOString(),new Date().toISOString(),owner)
}
test.beforeEach(()=>{runtime.clearLocalMarketingAttribution();storage.clear();calls=[];result={data:{status:'accepted'},error:null};reply=null})
test.after(()=>{globalThis.window=oldWindow;delete globalThis.__INTENT_RUNTIME__;fs.rmSync(cache,{recursive:true,force:true})})
test('only a verified accepted QR campaign produces a one-use QR hint',async()=>{
 stage();assert.equal(runtime.takeVerifiedFirstUseIntent('a'),'neutral')
 await runtime.submitAutomaticMarketingAttribution('a','synthetic-token')
 assert.equal(runtime.takeVerifiedFirstUseIntent('a'),'qr');assert.equal(runtime.takeVerifiedFirstUseIntent('a'),'neutral')
 assert.equal(storage.size,0,'intent does not add persistent tracking state')
})
test('unknown or care-like unapproved UTMs are neutral and never submitted',async()=>{
 stage('care_en');await runtime.submitAutomaticMarketingAttribution('a','synthetic-token')
 assert.equal(calls.length,0);assert.equal(runtime.takeVerifiedFirstUseIntent('a'),'neutral')
})
test('valid profile/social campaigns do not invent a utility intention',async()=>{
 stage('perfil_en');await runtime.submitAutomaticMarketingAttribution('a','synthetic-token');assert.equal(runtime.takeVerifiedFirstUseIntent('a'),'neutral')
})
test('a failed attribution cannot produce an ad-specific suggestion',async()=>{
 stage();result={data:null,error:Error('offline')};await runtime.submitAutomaticMarketingAttribution('a','synthetic-token');assert.equal(runtime.takeVerifiedFirstUseIntent('a'),'neutral')
})
test('intent never crosses accounts or logout',async()=>{
 stage();await runtime.submitAutomaticMarketingAttribution('a','synthetic-token')
 assert.equal(runtime.takeVerifiedFirstUseIntent('b'),'neutral');assert.equal(runtime.takeVerifiedFirstUseIntent('a'),'neutral')
 stage();await runtime.submitAutomaticMarketingAttribution('a','synthetic-token');runtime.clearLocalMarketingAttribution();assert.equal(runtime.takeVerifiedFirstUseIntent('a'),'neutral')
})
test('late account-A receipt cannot acquire account-B context',async()=>{
 let resolve;reply=()=>new Promise(r=>resolve=r);stage();const pending=runtime.submitAutomaticMarketingAttribution('a','synthetic-token')
 runtime.clearLocalMarketingAttribution();stage('qr_en','b');resolve({data:{status:'accepted'},error:null});await pending
 assert.equal(runtime.takeVerifiedFirstUseIntent('b'),'neutral');assert.equal(runtime.takeVerifiedFirstUseIntent('a'),'neutral')
})
test('late receipt cannot survive A to B to A even with identical staging',async()=>{
 stage();const original=[...storage.entries()]
 let resolve;reply=()=>new Promise(r=>resolve=r)
 const pending=runtime.submitAutomaticMarketingAttribution('a','old-session')
 runtime.clearLocalMarketingAttribution();stage('qr_en','b')
 runtime.clearLocalMarketingAttribution();storage.clear();for(const [k,v] of original)storage.set(k,v)
 resolve({data:{status:'accepted'},error:null});await pending
 assert.equal(runtime.takeVerifiedFirstUseIntent('a'),'neutral')
 assert.deepEqual([...storage.entries()],original,'obsolete receipt cannot erase new session staging')
})
