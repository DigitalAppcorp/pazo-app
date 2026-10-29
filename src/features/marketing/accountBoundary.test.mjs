import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {stripTypeScriptTypes} from 'node:module'

test('restored and interrupted attribution stays bound to signup account and captured Auth token',async()=>{
 const values=new Map(),calls=[]
 const storage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)}
 let finish
 globalThis.__marketingBoundary={functions:{invoke:async(_,request)=>{calls.push(request);return new Promise(resolve=>{finish=resolve})}}}
 globalThis.window={localStorage:storage}
 try{
  let source=readFileSync(new URL('./marketingRuntime.ts',import.meta.url),'utf8')
  source=source.replace("from './analyticsPreference'",`from '${new URL('./analyticsPreference.ts',import.meta.url).href}'`).replace("from './attribution'",`from '${new URL('./attribution.ts',import.meta.url).href}'`)
   .replace(/^import .*from '\.\/landingSignal'\r?\n/m,'const shouldSendLandingSignal=()=>false\n')
   .replace(/^import .*from '\.\/landingChallenge'\r?\n/m,'const requestLandingChallenge=async()=>null\n')
   .replace(/^import .*from '\.\.\/\.\.\/services\/supabaseClient'\r?\n/m,'const supabase=globalThis.__marketingBoundary\n')
   .replace('PAZO_MARKETING_COLLECTION_ENABLED = false','PAZO_MARKETING_COLLECTION_ENABLED = true')
  const runtime=await import('data:text/javascript;base64,'+Buffer.from(stripTypeScriptTypes(source)).toString('base64'))
  const url='?utm_source=meta&utm_medium=paid_social&utm_campaign=pazo_beta_local_202610&utm_content=perfil_en'
  const now=new Date().toISOString(),a='11111111-1111-4111-8111-111111111111',b='22222222-2222-4222-8222-222222222222'
  runtime.stageMarketingLanding(url);runtime.stageMarketingSignupRequested(a)
  runtime.stageMarketingSignupVerified(now,now,b)
  await runtime.submitAutomaticMarketingAttribution(b,'B_TOKEN')
  assert.equal(calls.length,0,'different recently-created restored account cannot claim staging')
  runtime.stageMarketingSignupVerified(now,now,a)
  const first=runtime.submitAutomaticMarketingAttribution(a,'A_CAPTURED_TOKEN')
  assert.equal(calls[0].headers.Authorization,'Bearer A_CAPTURED_TOKEN')
  assert.equal('owner_id' in calls[0].body,false)
  assert.equal(JSON.stringify(calls[0].body).includes(a),false)
  await runtime.submitAutomaticMarketingAttribution(a,'A_CAPTURED_TOKEN')
  assert.equal(calls.length,1,'double submission while pending is suppressed')
  runtime.clearLocalMarketingAttribution();runtime.stageMarketingLanding(url);runtime.stageMarketingSignupRequested(b)
  runtime.stageMarketingSignupVerified(now,now,b)
  finish({data:{status:'accepted'},error:null});await first
  assert.equal(JSON.parse(values.get('pazo_marketing_firstparty_v1')).signupOwnerId,b,'late response does not clear another account staging')
  const retry=runtime.submitAutomaticMarketingAttribution(b,'B_CAPTURED_TOKEN')
  finish({data:null,error:{message:'offline'}});await retry
  assert.equal(values.size,1,'network failure preserves retry without affecting Auth')
  const accepted=runtime.submitAutomaticMarketingAttribution(b,'B_CAPTURED_TOKEN')
  finish({data:{status:'accepted'},error:null});await accepted
  assert.equal(values.size,0)
 }finally{delete globalThis.window;delete globalThis.__marketingBoundary}
})
