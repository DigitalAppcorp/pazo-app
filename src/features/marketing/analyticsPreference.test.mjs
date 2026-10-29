import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {pathToFileURL} from 'node:url'
import ts from 'typescript'
import {createMarketingIntakeHandler} from '../../../supabase/functions/pazo-marketing-attribution/intakeCore.mjs'

const url='?utm_source=meta&utm_medium=paid_social&utm_campaign=pazo_beta_local_202610&utm_content=perfil_es'
const tick=()=>new Promise(resolve=>setImmediate(resolve))
async function environment(work,{values=new Map(),storageDenied=false}={}){
 const keys=['window','document','navigator','__analyticsQA'],old=keys.map(k=>Object.getOwnPropertyDescriptor(globalThis,k))
 const root=path.resolve('node_modules/.cache');fs.mkdirSync(root,{recursive:true})
 const cache=fs.mkdtempSync(path.join(root,'analytics-preference-')),calls=[],events=new EventTarget()
 const storage={getItem(k){if(storageDenied)throw Error('denied');return values.get(k)??null},setItem(k,v){if(storageDenied)throw Error('denied');values.set(k,v)},removeItem(k){if(storageDenied)throw Error('denied');values.delete(k)}}
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:{globalPrivacyControl:false,webdriver:false}})
 globalThis.window={location:{hostname:'pazo-app.vercel.app',search:url},localStorage:storage,sessionStorage:{getItem:()=>null,setItem:()=>{}},addEventListener:events.addEventListener.bind(events),removeEventListener:events.removeEventListener.bind(events)}
 globalThis.document={visibilityState:'visible'}
 let challenge=async()=> 'synthetic-once',session={user:{id:'admin'},access_token:'synthetic-pinned'},sessionRead=async()=>({data:{session}}),reply
 const client={auth:{getSession:()=>sessionRead()},functions:{invoke:async(name,args)=>{calls.push({name,args});return reply?reply(name,args):{data:{status:'accepted'},error:null}}},rpc(name,args){const call={name,args};calls.push(call);const q={setHeader(k,v){call.header=[k,v];return q},abortSignal(signal){call.signal=signal;return q},then(a,b){return Promise.resolve({data:true,error:null}).then(a,b)}};return q}}
 globalThis.__analyticsQA={client,challenge:()=>challenge()}
 const modules=['analyticsPreference','attribution','landingSignal','intelligenceCatalog','behaviorRuntime','intelligenceRuntime','preregRuntime','marketingRuntime','firstUtility']
 for(const file of modules){
  let source=fs.readFileSync(`src/features/marketing/${file}.ts`,'utf8')
   .replace(/from '\.\/([^']+)'/g,(_all,name)=>`from './${name}.mjs'`)
   .replace(/^import .*supabase.*from '[^']+'/m,'const supabase=globalThis.__analyticsQA.client')
   .replace(/^import .*requestLandingChallenge.*from '[^']+'/m,'const requestLandingChallenge=()=>globalThis.__analyticsQA.challenge()')
   .replace('import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY',"'sb_publishable_synthetic'")
  fs.writeFileSync(path.join(cache,file+'.mjs'),ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2023}}).outputText)
 }
 const load=name=>import(pathToFileURL(path.join(cache,name+'.mjs')).href),p=await load('analyticsPreference'),marketing=await load('marketingRuntime'),intelligence=await load('intelligenceRuntime'),prereg=await load('preregRuntime'),behavior=await load('behaviorRuntime'),utility=await load('firstUtility')
 try{await work({p,marketing,intelligence,prereg,behavior,utility,calls,values,storage,events,setChallenge:f=>challenge=f,setSession:f=>session=f,setSessionRead:f=>sessionRead=f,setReply:f=>reply=f})}
 finally{behavior.behaviorRecorder.bind(null);keys.forEach((k,i)=>{if(old[i])Object.defineProperty(globalThis,k,old[i]);else delete globalThis[k]});assert.ok(cache.startsWith(root+path.sep));fs.rmSync(cache,{recursive:true,force:true})}
}

test('default includes legitimate requests; login view plus form submission is two requests, not people',()=>environment(async({intelligence,calls})=>{
 intelligence.observeAnonymous('login_open');intelligence.observeAnonymous('login_attempt');intelligence.observeAnonymous('login_attempt');await tick()
 assert.deepEqual(calls.map(c=>c.args.body),[{experience:'login_open'},{experience:'login_attempt'}])
 for(const c of calls){assert.equal(c.args.headers.Authorization,'Bearer sb_publishable_synthetic');assert.deepEqual(Object.keys(c.args.body),['experience'])}
}))
test('explicit exclusion is one local boolean, persists through logout and account deletion cleanup',()=>environment(async({p,marketing,intelligence,prereg,utility,behavior,calls,values})=>{
 assert.equal(p.excludeBrowserAnalytics(true),true)
 marketing.clearLocalMarketingAttribution();marketing.clearLocalMarketingAttribution()
 intelligence.observeAnonymous('welcome');intelligence.observeAnonymous('login_open');intelligence.observeAnonymous('login_attempt');intelligence.observeAnonymous('demo_enter')
 prereg.observePrereg('signup_start');marketing.stageMarketingLanding(url)
 marketing.stageMarketingSignupRequested('admin');marketing.stageMarketingSignupVerified(new Date().toISOString(),new Date().toISOString(),'admin')
 await marketing.submitAutomaticMarketingAttribution('admin','token');await utility.recordFirstUtility('qr_visible','pet','admin')
 behavior.behaviorRecorder.bind({owner:'admin',token:'token'});behavior.behaviorRecorder.observe('pet');intelligence.beginTask('care_create')('failure');await behavior.behaviorRecorder.flushTasks();await tick()
 assert.deepEqual(calls,[]);assert.deepEqual([...values],[['pazo_analytics_excluded_v1','1']])
}))
test('revocation allows new observations and never replays the excluded visit',()=>environment(async({p,intelligence,calls})=>{
 p.excludeBrowserAnalytics(true);intelligence.observeAnonymous('login_open');await tick();assert.equal(calls.length,0)
 p.excludeBrowserAnalytics(false);intelligence.observeAnonymous('login_open');await tick();assert.equal(calls.length,1)
}))
test('a browser reload or a new tab reads the same explicit preference without account identity',async()=>{
 const values=new Map()
 await environment(async({p})=>{p.excludeBrowserAnalytics(true)},{values})
 await environment(async({p,intelligence,calls})=>{assert.equal(p.analyticsPreference(),'excluded');intelligence.observeAnonymous('login_attempt');await tick();assert.equal(calls.length,0)},{values})
})
test('another tab invalidates pending work through the storage event, including clear',()=>environment(async({p,values,events})=>{
 const valid=p.captureAnalyticsRequest();values.set(p.ANALYTICS_EXCLUSION_KEY,'1')
 const change=new Event('storage');Object.defineProperty(change,'key',{value:p.ANALYTICS_EXCLUSION_KEY});events.dispatchEvent(change)
 values.delete(p.ANALYTICS_EXCLUSION_KEY);const clear=new Event('storage');Object.defineProperty(clear,'key',{value:null});events.dispatchEvent(clear)
 assert.equal(valid(),false);assert.equal(p.browserAnalyticsAllowed(),true)
}))
for(const channel of ['anonymous','landing','prereg'])test(`${channel}: late challenge cannot survive include → exclude → include`,()=>environment(async({p,intelligence,marketing,prereg,setChallenge,calls})=>{
 let finish;setChallenge(()=>new Promise(resolve=>finish=resolve))
 if(channel==='anonymous')intelligence.observeAnonymous('login_attempt')
 if(channel==='landing')marketing.stageMarketingLanding(url)
 if(channel==='prereg')prereg.observePrereg('signup_start')
 p.excludeBrowserAnalytics(true);p.excludeBrowserAnalytics(false);finish('synthetic-late');await tick();assert.deepEqual(calls,[])
}))
test('pending verified attribution is retired; revocation cannot restore a previous campaign or QR hint',()=>environment(async({p,marketing,setReply,calls,values})=>{
 let finish;setReply(name=>name==='pazo-marketing-attribution'?new Promise(resolve=>finish=resolve):{data:true,error:null});marketing.stageMarketingLanding(url.replace('perfil_es','qr_es'))
 marketing.stageMarketingSignupRequested('admin');const now=new Date().toISOString();marketing.stageMarketingSignupVerified(now,now,'admin')
 const pending=marketing.submitAutomaticMarketingAttribution('admin','pinned');await tick()
 p.excludeBrowserAnalytics(true);p.excludeBrowserAnalytics(false);finish({data:{status:'accepted'},error:null});await pending
 assert.equal(marketing.takeVerifiedFirstUseIntent('admin'),'neutral');assert.equal(values.has('pazo_marketing_firstparty_v1'),false)
 assert.equal(calls.filter(c=>c.name==='pazo-marketing-attribution').length,1,'an already submitted request cannot be retracted or reclassified')
}))
test('pending QR measurement cannot survive a preference round trip during Auth read',()=>environment(async({p,utility,setSessionRead,calls})=>{
 let finish;setSessionRead(()=>new Promise(resolve=>finish=resolve));const pending=utility.recordFirstUtility('qr_visible','pet','admin')
 p.excludeBrowserAnalytics(true);p.excludeBrowserAnalytics(false);finish({data:{session:{user:{id:'admin'},access_token:'old'}}});await pending;assert.deepEqual(calls,[])
}))
test('exclusion aborts queued/in-flight session work and invalidates old task completions',()=>environment(async({p,behavior,intelligence,calls})=>{
 behavior.behaviorRecorder.bind({owner:'a',token:'a'});const finish=intelligence.beginTask('care_create');await behavior.behaviorRecorder.flushTasks()
 const before=calls.length,signal=calls[0].signal;p.excludeBrowserAnalytics(true);p.excludeBrowserAnalytics(false);finish('failure');await behavior.behaviorRecorder.flushTasks()
 assert.equal(signal.aborted,true);assert.equal(calls.length,before)
 behavior.behaviorRecorder.observe('pet');await tick();assert.equal(calls.at(-1).name,'pazo_behavior_record_v1')
}))
test('GPC remains an independent veto across every optional collector',()=>environment(async({p,intelligence,marketing,prereg,behavior,utility,calls})=>{
 p.excludeBrowserAnalytics(false);navigator.globalPrivacyControl=true
 intelligence.observeAnonymous('demo_enter');marketing.stageMarketingLanding(url);prereg.observePrereg('signup_requested');await utility.recordFirstUtility('qr_visible','pet','admin')
 behavior.behaviorRecorder.bind({owner:'a',token:'t'});behavior.behaviorRecorder.observe('pet');intelligence.beginTask('care_create')('failure');await behavior.behaviorRecorder.flushTasks();await tick();assert.deepEqual(calls,[])
}))
test('webdriver still cannot submit anonymous requests, independently of this preference',()=>environment(async({intelligence,calls})=>{
 navigator.webdriver=true;intelligence.observeAnonymous('login_open');await tick();assert.deepEqual(calls,[])
}))
test('unavailable storage fails closed without breaking product functions or promising persistence',()=>environment(async({p,intelligence,marketing,calls})=>{
 assert.equal(p.analyticsPreference(),'unavailable');assert.equal(p.excludeBrowserAnalytics(true),false);intelligence.observeAnonymous('login_attempt');marketing.stageMarketingLanding(url);await tick();assert.deepEqual(calls,[])
},{storageDenied:true}))
test('ordinary re-login after an ad-tagged request has no signup receipt and sends no conversion',()=>environment(async({marketing,calls})=>{
 marketing.stageMarketingLanding(url);marketing.stageMarketingSignupVerified('2020-01-01T00:00:00Z','2020-01-01T00:00:00Z','admin');await marketing.submitAutomaticMarketingAttribution('admin','pinned');await tick()
 assert.equal(calls.filter(c=>c.name==='pazo-marketing-attribution').length,0)
}))
test('a real verified signup can still submit the existing allowlisted receipt',()=>environment(async({marketing,calls})=>{
 const now=new Date().toISOString();marketing.stageMarketingLanding(url);marketing.stageMarketingSignupRequested('new');marketing.stageMarketingSignupVerified(now,now,'new');await marketing.submitAutomaticMarketingAttribution('new','new-token')
 const conversion=calls.find(c=>c.name==='pazo-marketing-attribution');assert.ok(conversion);assert.equal(conversion.args.headers.Authorization,'Bearer new-token');assert.equal('ownerId' in conversion.args.body,false)
}))
test('Edge independently rejects an existing-account login even with a fabricated current first touch',async()=>{
 let writes=0,authReads=0;const now=Date.now(),h=createMarketingIntakeHandler({released:true,clock:()=>now,authenticate:async()=>{authReads++;return {id:'96000000-0000-4000-8000-000000000031',created_at:'2020-01-01T00:00:00Z',email_confirmed_at:'2020-01-01T00:00:00Z'}},submit:async()=>{writes++;return true}})
 const r=await h(new Request('https://isolated.invalid',{method:'POST',headers:{origin:'https://pazo-app.vercel.app','content-type':'application/json',authorization:'Bearer synthetic-invalid-token'},body:JSON.stringify({utm_source:'meta',utm_medium:'paid_social',utm_campaign:'pazo_beta_local_202610',utm_content:'perfil_es',first_touch_at:new Date(now).toISOString()})}))
 assert.equal(authReads,1);assert.equal(r.status,403);assert.equal(writes,0)
})
