import test from 'node:test'
import assert from 'node:assert/strict'
import {loadMetaPixelForVerifiedSignup}
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
  assert.deepEqual(f.browser.fbq.queue,[['consent','revoke'],['init',datasetId]])
  script.onload()
  const result=await pending
  assert.equal(result.status,'queued')
  assert.deepEqual(f.browser.fbq.queue,[
    ['consent','revoke'],['init',datasetId],['consent','grant'],
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
