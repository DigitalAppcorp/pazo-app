import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {pathToFileURL} from 'node:url'
import ts from 'typescript'
import {createMarketingLandingHandler} from '../../../supabase/functions/pazo-marketing-landing/landingCore.mjs'
import {createExperienceSubmit} from '../../../supabase/functions/pazo-marketing-landing/landingAdapter.mjs'
fs.mkdirSync('node_modules/.cache',{recursive:true})
const cache=fs.mkdtempSync(path.resolve('node_modules/.cache/intelligence-'))
async function load(file){let s=fs.readFileSync('src/features/marketing/'+file+'.ts','utf8').replace(/import \{\s*supabase\s*\} from '[^']+'/,'const supabase={}').replaceAll("'./intelligenceCatalog'","'./intelligenceCatalog.mjs'").replaceAll("'./analyticsPreference'","'./analyticsPreference.mjs'");const target=path.join(cache,file+'.mjs');fs.writeFileSync(target,ts.transpileModule(s,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2023}}).outputText);return import(pathToFileURL(target).href)}
await load('analyticsPreference')
const {INTELLIGENCE_COLLECTION_ENABLED,intelligenceTasks}=await load('intelligenceCatalog')
const {createBehaviorRecorder}=await load('behaviorRuntime'),{parseIntelligenceSummary}=await load('intelligenceSummary')
test.after(()=>fs.rmSync(cache,{recursive:true,force:true}))
const actor={owner:'A',token:'A1'},tick=()=>new Promise(r=>setImmediate(r))
const create=(options={})=>createBehaviorRecorder({enabled:true,taskEnabled:true,send:async()=>true,sendTasks:async()=>true,...options})
test('new release gate ON preserves released #150',()=>assert.equal(INTELLIGENCE_COLLECTION_ENABLED,true))
test('bounded semantic batch, dedupe, exact retry and no values',async()=>{
 const calls=[];const r=create({sendTasks:async(a,s,items)=>{calls.push(items);return calls.length!==1}});r.bind(actor)
 for(let i=0;i<100;i++)r.task('care_create','attempt')
 r.task('care_create','failure');await r.flushTasks()
 assert.deepEqual(calls,[calls[0],calls[0]]);assert.deepEqual(calls[0],[{seq:1,task:'care_create',kind:'attempt'},{seq:2,task:'care_create',kind:'failure'}]);r.retire()
})
test('task channel cannot consume old navigation sequence',async()=>{const nav=[];const r=create({send:async(a,s,i)=>{nav.push(i.seq);return true}});r.bind(actor);r.task('care_create');r.observe('home');await tick();r.observe('pet');await tick();assert.deepEqual(nav,[1,2]);r.retire()})
test('task A→B→A session boundaries abort and reject stale failures',async()=>{const calls=[];const r=create({sendTasks:async(a,s,items,signal)=>{calls.push({a,s,items,signal});return true}});r.bind(actor);const finish=r.captureTask('care_create');await r.flushTasks();r.bind({owner:'B',token:'B1'});r.bind({owner:'A',token:'A2'});finish('failure');await r.flushTasks();assert.equal(calls.length,1);assert.equal(calls[0].signal.aborted,true);r.retire()})
test('pet A→B and A→B→A invalidate operation lifetime, no ID-only comparison',async()=>{for(const returns of [false,true]){const calls=[];const r=create({sendTasks:async(a,s,i)=>{calls.push(...i);return true}});r.bind(actor);r.setContext('petA');const finish=r.captureTask('care_complete');r.setContext('petB');if(returns)r.setContext('petA');finish('failure');await r.flushTasks();assert.equal(calls.some(i=>i.kind==='failure'),false);r.retire()}})
test('in-flight old upload cannot remove a new account queue',async()=>{let resolve;const calls=[];const r=create({sendTasks:async(a,s,i)=>{calls.push({a,i});if(calls.length===1)return new Promise(r=>resolve=r);return true}});r.bind(actor);r.task('care_create');const old=r.flushTasks();r.bind({owner:'B',token:'B'});r.task('care_edit');await r.flushTasks();resolve(true);await old;assert.deepEqual(calls.map(x=>x.a.owner),['A','B']);assert.equal(calls[1].i[0].seq,1);r.retire()})
test('offline failures bounded, no infinite retry or sequence-gap traffic',async()=>{let calls=0;const r=create({sendTasks:async()=>{calls++;throw Error('offline')}});r.bind(actor);r.task('care_create');await r.flushTasks();r.task('care_edit');await r.flushTasks();assert.equal(calls,2);r.retire()})
test('session buffer limits, batch8, cap64 and later recovery use fresh lifetime',async()=>{const batches=[];let at=1;const r=create({now:()=>at,sendTasks:async(a,s,i)=>{batches.push(i);return true}});r.bind(actor);for(const task of Object.keys(intelligenceTasks))r.task(task);await r.flushTasks();assert.equal(batches.flat().length,16);assert.ok(batches.every(x=>x.length<=8));at+=31*60000;r.task('care_create');await r.flushTasks();assert.equal(batches.at(-1)[0].seq,1);r.retire()})
test('retry is a separate closed state, not a second success',async()=>{const out=[];const r=create({sendTasks:async(a,s,i)=>{out.push(...i);return true}});r.bind(actor);r.captureTask('care_create')('failure');r.captureTask('care_create');await r.flushTasks();assert.deepEqual(out.map(x=>x.kind),['attempt','failure','retry']);r.retire()})
const report=()=>({version:1,status:'observing',coverage_since:new Date().toISOString(),as_of:new Date().toISOString(),effective_days:14,tasks:[{task:'care_create',kind:'attempt',accounts:10}],facts:[{metric:'care_created',accounts:20,returning:10}],anonymous:[{signal:'demo_enter',requests:10}]})
test('an active session cannot exceed 64 accepted observations even with distinct task states',async()=>{const out=[];const r=create({sendTasks:async(a,s,items)=>{out.push(...items);return true}});r.bind(actor);let n=0;for(const task of Object.keys(intelligenceTasks))for(const kind of ['attempt','failure']){r.task(task,kind);if(++n%8===0)await r.flushTasks()}await r.flushTasks();assert.equal(out.length,64);assert.equal(out.at(-1).seq,64);r.retire()})
test('retired-reaction history is not accepted as a measured source',()=>{const v=report();v.facts[0].metric='feed_unlike';assert.throws(()=>parseIntelligenceSummary(v))})
test('strict report accepts known counts',()=>assert.equal(parseIntelligenceSummary(report()).facts[0].accounts,20))
for(const [name,change]of Object.entries({extra:v=>v.email='private',small:v=>v.tasks[0].accounts=9,unsafe:v=>v.tasks[0].task='email',complement:v=>v.facts[0].accounts=19,identity:v=>v.anonymous[0].id='x',overretention:v=>v.effective_days=90,paused:v=>v.status='paused'}))test('report rejects '+name,()=>{const v=report();change(v);assert.throws(()=>parseIntelligenceSummary(v))})
const request=(body,extra={})=>new Request('https://isolated.invalid',{method:'POST',headers:{origin:'https://pazo-app.vercel.app','content-type':'application/json','x-pazo-challenge':'single-use',...extra},body:JSON.stringify(body)})
test('anonymous extension OFF preserves old intake without contacting new adapter',async()=>{let calls=0;const h=createMarketingLandingHandler({released:true,submit:async()=>true,verifyChallenge:async()=>true,submitExperience:async()=>{calls++;return true}});assert.equal((await h(request({experience:'demo_enter'}))).status,503);assert.equal(calls,0);assert.equal((await h(request({utm_source:'meta',utm_medium:'paid_social',utm_campaign:'pazo_beta_local_202610',utm_content:'qr_es'}))).status,202)})
test('anonymous requires single-use challenge, closed keys, GPC, no account bridge',async()=>{let calls=0,tokens=0;const h=createMarketingLandingHandler({released:true,submit:async()=>true,experienceReleased:true,submitExperience:async()=>{calls++;return true},verifyChallenge:async()=>++tokens===1});assert.equal((await h(request({experience:'demo_enter'}))).status,202);assert.equal((await h(request({experience:'demo_enter'}))).status,403);assert.equal((await h(request({experience:'demo_enter',owner:'A'}))).status,400);assert.equal((await h(request({experience:'demo_enter'},{'sec-gpc':'1'}))).status,400);assert.equal(calls,1)})
test('new server bridge fixes the project, privileged identity and exact RPC contract',async()=>{
 const url='https://mrybvqdebbgcayuvgkkr.supabase.co',serviceKey='synthetic_service_only',calls=[]
 assert.throws(()=>createExperienceSubmit({url:'https://wrong.invalid',serviceKey}))
 const send=createExperienceSubmit({url,serviceKey,fetchImpl:async(...args)=>{calls.push(args);return new Response('true',{status:200})}})
 assert.equal(await send('demo_enter'),true)
 assert.equal(calls[0][0],url+'/rest/v1/rpc/pazo_intelligence_experience_v1')
 assert.equal(calls[0][1].headers.authorization,'Bearer '+serviceKey)
 assert.equal(calls[0][1].redirect,'error')
 assert.deepEqual(JSON.parse(calls[0][1].body),{p_signal:'demo_enter'})
 const falseReply=createExperienceSubmit({url,serviceKey,fetchImpl:async()=>new Response('"true"',{status:200})})
 assert.equal(await falseReply('demo_enter'),false)
})
async function enabledRuntime(){
 let s=fs.readFileSync('src/features/marketing/intelligenceRuntime.ts','utf8').replace('import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY',"'sb_publishable_synthetic'").replace("'./analyticsPreference'","'./analyticsPreference.mjs'")
 s=s.replace(/import \{behaviorRecorder\}[^\n]+/,'const behaviorRecorder=globalThis.__recorder')
  .replace(/import \{INTELLIGENCE_COLLECTION_ENABLED[^\n]+/,`const INTELLIGENCE_COLLECTION_ENABLED=true,anonymousSignals=${JSON.stringify(['welcome','demo_enter','signup_start'])}`)
  .replace(/import \{requestLandingChallenge\}[^\n]+/,'const requestLandingChallenge=()=>globalThis.__challenge()')
  .replace(/import \{supabase\}[^\n]+/,'const supabase=globalThis.__telemetryClient')
 const target=path.join(cache,'enabled-'+crypto.randomUUID()+'.mjs');fs.writeFileSync(target,ts.transpileModule(s,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2023}}).outputText);return import(pathToFileURL(target).href)
}
async function environment(work){
 const keys=['navigator','document','window','__recorder','__challenge','__telemetryClient'],prior=keys.map(k=>Object.getOwnPropertyDescriptor(globalThis,k)),calls=[]
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:{globalPrivacyControl:false,webdriver:false}})
 globalThis.document={visibilityState:'visible'};globalThis.window={location:{hostname:'pazo-app.vercel.app'},localStorage:{getItem:()=>null}}
 globalThis.__recorder={task:(...x)=>calls.push(['task',...x]),captureTask:()=>kind=>calls.push(['finish',kind])}
 globalThis.__challenge=async()=>{calls.push(['challenge']);return 'single-use'}
 globalThis.__telemetryClient={functions:{invoke:async(...x)=>{calls.push(['invoke',...x]);return {data:true}}}}
 try{await work(await enabledRuntime(),calls)}finally{keys.forEach((k,i)=>{if(prior[i])Object.defineProperty(globalThis,k,prior[i]);else delete globalThis[k]})}
}
test('real enabled entry points stop all new collection under GPC',()=>environment(async(r,calls)=>{navigator.globalPrivacyControl=true;r.observeTask('care_create');r.beginTask('care_create')('failure');r.observeAnonymous('demo_enter');await tick();assert.deepEqual(calls,[])}))
test('anonymous page dedupe, public authorization cannot inherit an account JWT',()=>environment(async(r,calls)=>{r.observeAnonymous('demo_enter');r.observeAnonymous('demo_enter');await tick();assert.equal(calls.filter(x=>x[0]==='challenge').length,1);const req=calls.find(x=>x[0]==='invoke');assert.deepEqual(req[2].body,{experience:'demo_enter'});assert.equal(req[2].headers.Authorization,'Bearer sb_publishable_synthetic');assert.deepEqual(Object.keys(req[2]),['headers','body'])}))
test('preview and automation cannot create anonymous production observations',()=>environment(async(r,calls)=>{window.location.hostname='preview.vercel.app';r.observeAnonymous('demo_enter');window.location.hostname='pazo-app.vercel.app';navigator.webdriver=true;r.observeAnonymous('welcome');await tick();assert.deepEqual(calls,[])}))
test('GPC withdrawal during challenge discards pending anonymous signal',()=>environment(async(r,calls)=>{let finish;globalThis.__challenge=()=>new Promise(resolve=>finish=resolve);r.observeAnonymous('demo_enter');navigator.globalPrivacyControl=true;finish('single-use');await tick();assert.deepEqual(calls,[])}))
