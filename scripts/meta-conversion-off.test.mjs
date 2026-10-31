// #169: offline provider tests. No real identities, accounts, cookies, Meta SDK
// or external requests are used in this suite.
import test from 'node:test'
import assert from 'node:assert/strict'
import {buildMetaRegistration,eligibleMetaRegistration,META_EVENT_NAME,META_CANONICAL_URL}
  from '../supabase/functions/_shared/metaConversion.mjs'
import {sendMetaCapi,validMetaServerEvent}
  from '../supabase/functions/_shared/metaCapi.mjs'
import {canUseMetaPixel,dispatchMetaPixel} from '../src/features/marketing/metaPixel.mjs'

const eventId='11111111-2222-4333-8444-555555555555'
const datasetId='123456789012345'
const hashedEmail='a'.repeat(64) // fixture, not anyone's email
const consent={
  releaseEnabled:true,explicitConsent:true,consentTrusted:true,
  verifiedRegistration:true,excluded:false,globalPrivacyControl:false,
  optedOut:false,qaOrAdmin:false,eventId,
}
const proof=()=>buildMetaRegistration({...consent,datasetId,hashedEmail,
  eventTime:Math.floor(Date.now()/1000)})
test('third-party sharing is OFF by default, even if Meta ID is configured',()=>{
  assert.equal(eligibleMetaRegistration(),false)
  assert.equal(buildMetaRegistration({datasetId,hashedEmail}),null)
  assert.equal(canUseMetaPixel(),false)
  assert.equal(dispatchMetaPixel({eventId,datasetId,fbq:()=>{throw Error('network')}}).status,'suppressed')
})
test('each independent privacy/identity gate suppresses sharing',()=>{
  for(const [key,bad] of Object.entries({
    releaseEnabled:false,explicitConsent:false,consentTrusted:false,
    verifiedRegistration:false,excluded:true,globalPrivacyControl:true,
    optedOut:true,qaOrAdmin:true,eventId:'not-a-uuid',
  })) assert.equal(buildMetaRegistration({...consent,[key]:bad,datasetId,hashedEmail,eventTime:Math.floor(Date.now()/1000)}),null,key)
  assert.equal(buildMetaRegistration({...consent,datasetId,hashedEmail:'',eventTime:Math.floor(Date.now()/1000)}),null)
  assert.equal(buildMetaRegistration({...consent,datasetId,hashedEmail,eventTime:1}),null)
})
test('shared browser/server event_name and eventID, fixed URL with no query/PII',()=>{
  const event=proof()
  assert.equal(event.eventName,META_EVENT_NAME)
  assert.equal(event.browser.eventName,event.server.event_name)
  assert.equal(event.browser.eventID,event.server.event_id)
  assert.equal(event.server.event_source_url,META_CANONICAL_URL)
  assert.equal(event.server.action_source,'website')
  assert.deepEqual(Object.keys(event.server.user_data),['em'])
  assert.equal(JSON.stringify(event.server).includes('utm'),false)
  assert.equal(JSON.stringify(event.server).includes('facebook.com'),false)
  assert.equal(validMetaServerEvent(event.server,datasetId),true)
})
test('Pixel never dispatches without current affirmative authorization or SDK',()=>{
  const calls=[],fbq=(...args)=>calls.push(args)
  const base={authorized:true,eventId,datasetId,fbq,browserGpc:false,stillConsented:()=>true}
  for(const opt of [{authorized:false},{browserGpc:true},{stillConsented:()=>false},
    {eventId:'bad-id'},{datasetId:'wrong'},{fbq:null}])
    assert.equal(dispatchMetaPixel({...base,...opt}).status,'suppressed')
  assert.equal(calls.length,0)
  assert.equal(dispatchMetaPixel(base).status,'queued')
  assert.deepEqual(calls,[['trackSingle',datasetId,'CompleteRegistration',{}, {eventID:eventId}]])
})
test('CAPI does not touch network unless release, trusted privacy and one-time claim',async()=>{
  let calls=0
  const fetchImpl=async()=>{calls++;throw Error('should not call')}
  const event=proof().server
  const common={event,datasetId,apiVersion:'v24.0',serverToken:'private_synthetic_never_real_012345',
    authorized:async()=>true,fetchImpl}
  for(const patch of [{},{releaseEnabled:true},{releaseEnabled:true,privacyGateApproved:true},
    {releaseEnabled:true,privacyGateApproved:true,claimWasInserted:true,authorized:async()=>false},
    {releaseEnabled:true,privacyGateApproved:true,claimWasInserted:true,apiVersion:'../../evil'},
    {releaseEnabled:true,privacyGateApproved:true,claimWasInserted:true,event:{...event,event_source_url:'https://example.com/?email=bad'}}])
    await sendMetaCapi({...common,...patch})
  assert.equal(calls,0)
})
test('CAPI sends a single canonical event, token only in header and respects late consent revocation',async()=>{
  let calls=0,seen
  const p=proof()
  const common={releaseEnabled:true,privacyGateApproved:true,claimWasInserted:true,
    event:p.server,datasetId,apiVersion:'v24.0',serverToken:'private_synthetic_never_real_012345'}
  const suppressed=await sendMetaCapi({...common,authorized:async()=>false,
    fetchImpl:async()=>{calls++;}})
  assert.equal(suppressed.status,'suppressed')
  const ok=await sendMetaCapi({...common,authorized:async()=>true,fetchImpl:async(url,options)=>{
    calls++;seen={url,options};return {ok:true,json:async()=>({events_received:1})}
  }})
  assert.deepEqual(ok,{status:'accepted'})
  assert.equal(calls,1)
  assert.equal(seen.url,`https://graph.facebook.com/v24.0/${datasetId}/events`)
  assert.equal(new URL(seen.url).search,'')
  assert.equal(seen.options.headers.authorization,'Bearer '+common.serverToken)
  const payload=JSON.parse(seen.options.body)
  assert.deepEqual(payload,{data:[p.server]})
  assert.equal(seen.options.body.includes(common.serverToken),false)
})
test('malformed CAPI receipt does not claim conversion success',async()=>{
  const p=proof()
  const result=await sendMetaCapi({releaseEnabled:true,privacyGateApproved:true,claimWasInserted:true,
    event:p.server,datasetId,apiVersion:'v24.0',serverToken:'private_synthetic_never_real_012345',
    authorized:async()=>true,fetchImpl:async()=>({ok:true,json:async()=>({events_received:0})})})
  assert.equal(result.status,'provider_error')
})
