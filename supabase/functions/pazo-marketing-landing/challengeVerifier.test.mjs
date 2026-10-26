import test from 'node:test'
import assert from 'node:assert/strict'
import {createMarketingChallengeVerifier} from './challengeVerifier.mjs'
import {createMarketingLandingHandler} from './landingCore.mjs'
const now=Date.parse('2026-10-24T04:00:00Z'),secret='SYNTHETIC_CHALLENGE_SECRET_ONLY',token='SYNTHETIC_ONETIME_TOKEN'
const valid={success:true,hostname:'pazo-app.vercel.app',action:'pazo_marketing_landing',challenge_ts:new Date(now).toISOString()}
const request=(t=token)=>new Request('https://edge.invalid',{method:'POST',headers:{origin:'https://pazo-app.vercel.app','content-type':'application/json','x-pazo-challenge':t},body:JSON.stringify({utm_source:'meta',utm_medium:'paid_social',utm_campaign:'pazo_beta_local_202610',utm_content:'perfil_es'})})
test('only provider success with original host/action and fresh timestamp is accepted; token/IP never reaches SQL',async()=>{
 let submission=0
 const verifyChallenge=createMarketingChallengeVerifier({secret,clock:()=>now,fetchImpl:async(url,options)=>{
  assert.equal(url,'https://challenges.cloudflare.com/turnstile/v0/siteverify');assert.equal(options.redirect,'error')
  assert.deepEqual([...new URLSearchParams(options.body).keys()],['secret','response']);assert.ok(!options.body.includes('remoteip'))
  return Response.json(valid)
 }})
 const r=await createMarketingLandingHandler({released:true,verifyChallenge,submit:async creative=>{assert.equal(creative,'perfil_es');submission++;return true}})(request())
 assert.equal(r.status,202);assert.equal(submission,1);assert.equal((await r.text()).includes(token),false)
})
test('forged Origin, expired/reused/absent tokens, foreign hostname/action, malformed provider and outages never consume DB budget',async()=>{
 let calls=0
 for(const value of [{...valid,success:false},{...valid,hostname:'evil.invalid'},{...valid,action:'other'},
  {...valid,challenge_ts:new Date(now-300001).toISOString()},{...valid,challenge_ts:new Date(now+30001).toISOString()},
  {...valid,challenge_ts:'invalid'},null]){
  const verifyChallenge=createMarketingChallengeVerifier({secret,clock:()=>now,fetchImpl:async()=>Response.json(value)})
  assert.equal((await createMarketingLandingHandler({released:true,verifyChallenge,submit:()=>{calls++}})(request())).status,403)
 }
 const failed=createMarketingChallengeVerifier({secret,fetchImpl:()=>{throw Error('secret must not leak')}})
 assert.equal(await failed(token),false);assert.equal(await failed(''),false)
 assert.equal((await createMarketingLandingHandler({released:true,submit:()=>{calls++}})(request())).status,503)
 assert.equal(calls,0)
})
test('provider single use is honored and a replay cannot increment landing count',async()=>{
 let seen=false,count=0
 const verifyChallenge=createMarketingChallengeVerifier({secret,clock:()=>now,fetchImpl:async()=>{const ok=!seen;seen=true;return Response.json({...valid,success:ok})}})
 const handler=createMarketingLandingHandler({released:true,verifyChallenge,submit:async()=>{count++;return true}})
 assert.equal((await handler(request())).status,202);assert.equal((await handler(request())).status,403);assert.equal(count,1)
 assert.throws(()=>createMarketingChallengeVerifier({secret:''}))
})
test('a scripted flood with forged Origin and UTM cannot exhaust the SQL creative budget',async()=>{
 let writes=0
 const verifyChallenge=createMarketingChallengeVerifier({secret,fetchImpl:async()=>Response.json({success:false})})
 const handler=createMarketingLandingHandler({released:true,verifyChallenge,submit:()=>{writes++;return true}})
 const responses=await Promise.all(Array.from({length:64},()=>handler(request())))
 assert.ok(responses.every(r=>r.status===403));assert.equal(writes,0)
})
