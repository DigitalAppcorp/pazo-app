import test from 'node:test'
import assert from 'node:assert/strict'
import {loadMetaPixelForVerifiedSignup,revokeOwnedMetaPixelConsent}
  from '../src/features/marketing/metaPixelLoader.mjs'
const eventId='11111111-2222-4333-8444-555555555555',datasetId='123456789012345'
function fakeBrowser(gpc=false){
  const appended=[]
  const dom={head:{appendChild:el=>appended.push(el)},createElement:tag=>{
    assert.equal(tag,'script');return {}
  }}
  return {browser:{navigator:{globalPrivacyControl:gpc},document:dom},
    dom,appended}
}
const settings={releaseEnabled:true,privacyGateApproved:true,
  explicitConsent:true,accountExcluded:false,qaOrAdmin:false,
  optedOut:false,verifiedRegistration:true,eventId,datasetId}
test('default OFF, GPC, QA/admin, missing consent and spoofed ID block SDK load',async()=>{
  for(const patch of [{releaseEnabled:false},{privacyGateApproved:false},
    {explicitConsent:false},{accountExcluded:true},{qaOrAdmin:true},
    {optedOut:true},{verifiedRegistration:false},{eventId:'bad'}]){
    const f=fakeBrowser(false)
    const result=await loadMetaPixelForVerifiedSignup({
      ...settings,...patch,...f,stillAllowed:()=>true})
    assert.equal(result.status,'suppressed',JSON.stringify(patch))
    assert.equal(f.appended.length,0)
    assert.equal(f.browser.fbq,undefined)
  }
  const f=fakeBrowser(true)
  const result=await loadMetaPixelForVerifiedSignup({...settings,...f,stillAllowed:()=>true})
  assert.equal(result.status,'suppressed')
  assert.equal(f.appended.length,0)
})
test('SDK is lazy: only with valid consent, queues revoke before init, no auto PageView',async()=>{
  const f=fakeBrowser(false)
  const pending=loadMetaPixelForVerifiedSignup({...settings,...f,stillAllowed:()=>true})
  assert.equal(f.appended.length,1)
  const script=f.appended[0]
  assert.equal(script.src,'https://connect.facebook.net/en_US/fbevents.js')
  assert.equal(script.async,true)
  assert.deepEqual(f.browser.fbq.queue,[['consent','revoke'],['set','autoConfig',false,datasetId],['init',datasetId]])
  script.onload()
  const result=await pending
  assert.equal(result.status,'queued')
  assert.deepEqual(f.browser.fbq.queue,[
    ['consent','revoke'],['set','autoConfig',false,datasetId],
    ['init',datasetId],['consent','grant'],
    ['trackSingle',datasetId,'CompleteRegistration',{}, {eventID:eventId}],
  ])
  assert.equal(f.browser.fbq.queue.some(x=>x.includes('PageView')),false)
})
test('withdrawal between insertion and load suppresses conversion, without grant',async()=>{
  const f=fakeBrowser(false)
  let allowed=true
  const pending=loadMetaPixelForVerifiedSignup({...settings,...f,stillAllowed:()=>allowed})
  allowed=false
  f.appended[0].onload()
  assert.equal((await pending).status,'suppressed')
  assert.equal(f.browser.fbq.queue.some(x=>x.includes('trackSingle')),false)
  assert.equal(f.browser.fbq.queue.some(x=>x.includes('grant')),false)
})
test('throwing permission callback never loads Meta SDK or sends events',async()=>{
  const f=fakeBrowser(false)
  const result=await loadMetaPixelForVerifiedSignup({...settings,...f,
    stillAllowed:()=>{throw Error('privacy read unavailable')}})
  assert.equal(result.status,'suppressed')
  assert.equal(f.appended.length,0)
  assert.equal(f.browser.fbq,undefined)
})
test('permission check failure during SDK loading resolves without conversion',async()=>{
  const f=fakeBrowser(false)
  let shouldThrow=false
  const pending=loadMetaPixelForVerifiedSignup({...settings,...f,
    stillAllowed:()=>{if(shouldThrow)throw Error('privacy read unavailable');return true}})
  shouldThrow=true
  f.appended[0].onload()
  assert.equal((await pending).status,'suppressed')
  assert.equal(f.browser.fbq.queue.some(x=>x.includes('trackSingle')),false)
  assert.deepEqual(f.browser.fbq.queue.at(-1),['consent','revoke'])
})
test('late opt-out during Pixel event dispatch revokes SDK consent',async()=>{
  const f=fakeBrowser(false)
  let calls=0
  const pending=loadMetaPixelForVerifiedSignup({...settings,...f,
    stillAllowed:()=>++calls<3})
  f.appended[0].onload()
  assert.equal((await pending).status,'suppressed')
  assert.equal(f.browser.fbq.queue.some(x=>x.includes('trackSingle')),false)
  assert.deepEqual(f.browser.fbq.queue.at(-1),['consent','revoke'])
})
test('DOM SDK creation or insertion errors resolve without conversion',async()=>{
  for(const point of ['create','append']){
    const f=fakeBrowser(false)
    if(point==='create')f.dom.createElement=()=>{throw Error('no DOM element')}
    else f.dom.head.appendChild=()=>{throw Error('insertion blocked')}
    const result=await loadMetaPixelForVerifiedSignup({...settings,...f,stillAllowed:()=>true})
    assert.equal(result.status,'unavailable')
    assert.equal(f.browser.fbq.queue.some(x=>x.includes('trackSingle')),false)
    assert.deepEqual(f.browser.fbq.queue.at(-1),['consent','revoke'])
  }
})
test('stalled SDK resolves within the configured timeout and never dispatches late',async()=>{
  const f=fakeBrowser(false)
  const pending=loadMetaPixelForVerifiedSignup({
    ...settings,...f,stillAllowed:()=>true,sdkTimeoutMs:10,
  })
  assert.equal(f.appended.length,1)
  let removals=0
  f.appended[0].remove=()=>{removals++}
  assert.deepEqual(await pending,{status:'unavailable'})
  assert.equal(removals,1,'timed-out SDK element must be detached')
  assert.deepEqual(f.browser.fbq.queue.at(-1),['consent','revoke'])
  // Even a late onload callback must not grant consent or enqueue an event.
  f.appended[0].onload()
  assert.equal(f.browser.fbq.queue.some(x=>x.includes('trackSingle')),false)
  assert.equal(f.browser.fbq.queue.some(x=>x.includes('grant')),false)
})
test('successful SDK cancels the timeout rather than revoking consent later',async()=>{
  const f=fakeBrowser(false)
  const pending=loadMetaPixelForVerifiedSignup({
    ...settings,...f,stillAllowed:()=>true,sdkTimeoutMs:10,
  })
  f.appended[0].onload()
  assert.deepEqual(await pending,{status:'queued'})
  await new Promise(resolve=>setTimeout(resolve,25))
  assert.deepEqual(f.browser.fbq.queue.at(-1),[
    'trackSingle',datasetId,'CompleteRegistration',{}, {eventID:eventId},
  ])
})
test('invalid custom timeout falls back to safe default without enabling the SDK',async()=>{
  const f=fakeBrowser(true)
  const result=await loadMetaPixelForVerifiedSignup({
    ...settings,...f,stillAllowed:()=>true,sdkTimeoutMs:NaN,
  })
  assert.equal(result.status,'suppressed')
  assert.equal(f.appended.length,0)
})
test('preexisting Pixel never silently inherits PAZO conversion events',async()=>{
  const f=fakeBrowser(false)
  f.browser.fbq=()=>{}
  const result=await loadMetaPixelForVerifiedSignup({...settings,...f,stillAllowed:()=>true})
  assert.equal(result.status,'existing_pixel')
  assert.equal(f.appended.length,0)
})
test('failed SDK network never fires a conversion',async()=>{
  const f=fakeBrowser(false)
  const pending=loadMetaPixelForVerifiedSignup({...settings,...f,stillAllowed:()=>true})
  f.appended[0].onerror()
  assert.equal((await pending).status,'unavailable')
  assert.equal(f.browser.fbq.queue.some(x=>x.includes('trackSingle')),false)
})

test('the SDK is restricted to explicit registration, with autoConfig and SPA hooks OFF',async()=>{
  const f=fakeBrowser(false)
  const pending=loadMetaPixelForVerifiedSignup({...settings,...f,stillAllowed:()=>true})
  assert.deepEqual(f.browser.fbq.queue.slice(0,3),[
    ['consent','revoke'],['set','autoConfig',false,datasetId],
    ['init',datasetId],
  ])
  assert.equal(f.browser.fbq.disablePushState,true)
  f.appended[0].onload()
  assert.equal((await pending).status,'queued')
  const eventCalls=f.browser.fbq.queue.filter(c=>c[0].startsWith('track'))
  assert.deepEqual(eventCalls,[
    ['trackSingle',datasetId,'CompleteRegistration',{}, {eventID:eventId}],
  ])
})
test('withdrawal revokes only the Pixel owned by PAZO, not a third-party Pixel',async()=>{
  const f=fakeBrowser(false)
  assert.equal(revokeOwnedMetaPixelConsent({browser:f.browser}),false)
  const pending=loadMetaPixelForVerifiedSignup({...settings,...f,stillAllowed:()=>true})
  f.appended[0].onload()
  assert.equal((await pending).status,'queued')
  const before=f.browser.fbq.queue.length
  assert.equal(revokeOwnedMetaPixelConsent({browser:f.browser}),true)
  assert.deepEqual(f.browser.fbq.queue.at(-1),['consent','revoke'])
  assert.equal(f.browser.fbq.queue.length,before+1)
  assert.equal(f.browser.fbq.queue.filter(c=>c[0]==='trackSingle').length,1)
  // A previously loaded SDK is not retroactively erased or unsent.
  const external=()=>{}
  f.browser.fbq=external
  assert.equal(revokeOwnedMetaPixelConsent({browser:f.browser}),false)
  assert.equal(f.browser.fbq,external)
  const other=fakeBrowser(false)
  other.browser.fbq=()=>{throw Error('foreign SDK should never be modified')}
  other.browser._fbq=other.browser.fbq
  assert.equal(revokeOwnedMetaPixelConsent({browser:other.browser}),false)
})
