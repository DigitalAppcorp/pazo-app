// #169 — isolated dual-path deduplication contract for PAZO QA.
// No Meta SDK downloaded; no Graph API calls; no Supabase or real users.
// CI replaces browser SDK and CAPI fetch with deterministic in-memory probes.
import test from 'node:test'
import assert from 'node:assert/strict'
import {buildMetaRegistration} from '../supabase/functions/_shared/metaConversion.mjs'
import {sendMetaCapi} from '../supabase/functions/_shared/metaCapi.mjs'
import {loadMetaPixelForVerifiedSignup}
  from '../src/features/marketing/metaPixelLoader.mjs'

const DATASET='1090116830295088' // dedicated QA; never PAZO Web
const QA_CODE='TESTSYNTH01' // fake local test code; NOT a Meta session
const EVENT='11111111-2222-4333-8444-555555555555'
const SECOND='22222222-2222-4333-8444-555555555555'
const HASH='a'.repeat(64)
const UA='Mozilla/5.0 (PAZO synthetic dedup fixture)'
const SERVER_TOKEN='synthetic_qa_only_never_real_token_123456789'
const eventTime=()=>Math.floor(Date.now()/1000)
const makeProof=(id=EVENT)=>buildMetaRegistration({
 releaseEnabled:true,explicitConsent:true,consentTrusted:true,
 verifiedRegistration:true,excluded:false,globalPrivacyControl:false,
 optedOut:false,qaOrAdmin:false,eventId:id,eventTime:eventTime(),
 datasetId:DATASET,hashedEmail:HASH,clientUserAgent:UA,
})
const browserFixture=()=>{
 const scripts=[]
 const document={head:{appendChild:el=>scripts.push(el)},
   createElement:()=>({})}
 return {scripts,document,browser:{
  document,navigator:{globalPrivacyControl:false}
 }}
}
const browserOpts=(proof,f,stillAllowed=()=>true)=>({
 releaseEnabled:true,privacyGateApproved:true,explicitConsent:true,
 accountExcluded:false,qaOrAdmin:false,optedOut:false,
 verifiedRegistration:true,datasetId:proof.datasetId,
 eventId:proof.eventId,browser:f.browser,dom:f.document,stillAllowed,
})
const serverOpts=(proof,fetchImpl,authorized=async()=>true)=>({
 releaseEnabled:true,privacyGateApproved:true,claimWasInserted:true,
 event:proof.server,datasetId:proof.datasetId,
 apiVersion:'v26.0',serverToken:SERVER_TOKEN,
 testModeEnabled:true,testEventCode:QA_CODE,nonProduction:true,
 authorized,fetchImpl,
})

test('real browser loader and CAPI sender emit exact same dataset, name and event ID',async()=>{
 const proof=makeProof()
 assert.ok(proof,'the synthetic consented fixture must be valid')
 const f=browserFixture()
 const promise=loadMetaPixelForVerifiedSignup(browserOpts(proof,f))
 assert.equal(f.scripts.length,1,'one SDK loader only')
 assert.equal(f.scripts[0].src,'https://connect.facebook.net/en_US/fbevents.js')
 // Simulate the SDK load without fetching or leaking browser data to Meta.
 f.scripts[0].onload()
 assert.deepEqual(await promise,{status:'queued'})
 const browserCalls=f.browser.fbq.queue
 assert.deepEqual(browserCalls.slice(0,4),
  [['consent','revoke'],['set','autoConfig',false,DATASET],
   ['init',DATASET],['consent','grant']])
 const pixel=browserCalls.filter(c=>c[0]==='trackSingle')
 assert.deepEqual(pixel,[
  ['trackSingle',DATASET,'CompleteRegistration',{}, {eventID:EVENT}],
 ])
 assert.equal(browserCalls.some(c=>c.includes('PageView')),false)
 let posts=0
 const result=await sendMetaCapi(serverOpts(proof,async(url,req)=>{
   posts++
   assert.equal(url,'https://graph.facebook.com/v26.0/'+DATASET+'/events')
   assert.deepEqual(Object.keys(req.headers).sort(),
    ['accept','authorization','content-type'])
   assert.equal(req.headers.authorization,'Bearer '+SERVER_TOKEN)
   const body=JSON.parse(req.body)
   assert.equal(body.test_event_code,QA_CODE)
   assert.equal(body.data.length,1)
   assert.deepEqual(body.data[0],proof.server)
   assert.equal(body.data[0].event_name,pixel[0][2])
   assert.equal(body.data[0].event_id,pixel[0][4].eventID)
   assert.equal(body.data[0].event_source_url,'https://pazo-app.vercel.app/')
   assert.deepEqual(Object.keys(body.data[0].user_data).sort(),
     ['client_user_agent','em'])
   assert.ok(!req.body.includes(SERVER_TOKEN))
   return {ok:true,json:async()=>({events_received:1,messages:[]})}
 }))
 assert.deepEqual(result,{status:'accepted'})
 assert.equal(posts,1)
 // A second attempt in the same document must not enqueue a second Pixel.
 assert.deepEqual(await loadMetaPixelForVerifiedSignup(browserOpts(proof,f)),
   {status:'existing_pixel'})
 assert.equal(f.browser.fbq.queue.filter(c=>c[0]==='trackSingle').length,1)
})

test('a different verified registration uses a different event ID (never invent duplicate)',()=>{
 const a=makeProof(),b=makeProof(SECOND)
 assert.equal(a.eventName,b.eventName)
 assert.equal(a.datasetId,b.datasetId)
 assert.notEqual(a.browser.eventID,b.browser.eventID)
 assert.notEqual(a.server.event_id,b.server.event_id)
 assert.equal(a.browser.eventID,a.server.event_id)
 assert.equal(b.browser.eventID,b.server.event_id)
})

test('GPC, withdrawal, absent consent or missing attestation emit neither browser nor server',async()=>{
 const proof=makeProof()
 for(const patch of [
  {explicitConsent:false},{privacyGateApproved:false},{qaOrAdmin:true},
  {optedOut:true},{verifiedRegistration:false},
 ]){
  const f=browserFixture()
  assert.deepEqual(await loadMetaPixelForVerifiedSignup({
    ...browserOpts(proof,f),...patch
   }),{status:'suppressed'})
  assert.equal(f.scripts.length,0)
 }
 const f=browserFixture()
 f.browser.navigator.globalPrivacyControl=true
 assert.deepEqual(await loadMetaPixelForVerifiedSignup(browserOpts(proof,f)),
   {status:'suppressed'})
 let calls=0
 const result=await sendMetaCapi(serverOpts(proof,async()=>{
  calls++;throw Error('forbidden test network')
 },async()=>false))
 assert.equal(result.status,'suppressed')
 assert.equal(calls,0)
})

test('Meta QA received=1 with an inactive test session is a warning, never clean acceptance',async()=>{
 const proof=makeProof()
 const messages=['test_event_code "TESTSYNTH01" does not match an active Test Events session']
 const status=await sendMetaCapi(serverOpts(proof,async()=>({
  ok:true,json:async()=>({events_received:1,messages})
 })))
 assert.deepEqual(status,{status:'accepted_with_warnings'})
 const statusWithNoMessages=await sendMetaCapi(serverOpts(proof,async()=>({
  ok:true,json:async()=>({events_received:1,messages:[]})
 })))
 assert.deepEqual(statusWithNoMessages,{status:'accepted'})
})
