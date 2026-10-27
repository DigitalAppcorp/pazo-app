import test from 'node:test'
import assert from 'node:assert/strict'
import {createMarketingSingleUseVerifier} from './singleUseVerifier.mjs'
import {createMarketingChallengeClaim} from './landingAdapter.mjs'
import {createMarketingLandingHandler} from './landingCore.mjs'
const token='synthetic_valid_provider_token_not_an_identity'
test('provider success is insufficient: an atomic claim admits exactly one duplicate across concurrent requests',async()=>{
 const used=new Set(),digests=[]
 const verifyChallenge=createMarketingSingleUseVerifier({verifyProvider:async()=>true,claimDigest:async digest=>{digests.push(digest);if(used.has(digest))return false;used.add(digest);return true}})
 let writes=0
 const handler=createMarketingLandingHandler({released:true,verifyChallenge,submit:async()=>{writes++;return true}})
 const request=()=>new Request('https://edge.invalid',{method:'POST',headers:{origin:'https://pazo-app.vercel.app','content-type':'application/json','x-pazo-challenge':token},body:JSON.stringify({utm_source:'meta',utm_medium:'paid_social',utm_campaign:'pazo_beta_local_202610',utm_content:'perfil_en'})})
 const results=await Promise.all(Array.from({length:12},()=>handler(request())))
 assert.equal(results.filter(r=>r.status===202).length,1);assert.equal(results.filter(r=>r.status===403).length,11);assert.equal(writes,1)
 assert.equal(new Set(digests).size,1);assert.match(digests[0],/^[a-f0-9]{64}$/);assert.ok(!digests[0].includes(token))
})
test('failed provider, absent ledger and failed claims remain closed without persisting raw token',async()=>{
 assert.throws(()=>createMarketingSingleUseVerifier({verifyProvider:async()=>true}))
 let claims=0
 assert.equal(await createMarketingSingleUseVerifier({verifyProvider:async()=>false,claimDigest:async()=>{claims++;return true}})(token),false)
 assert.equal(claims,0)
 for(const claimDigest of [async()=>false,async()=>{throw Error('offline')},async()=>({accepted:true})])
  assert.equal(await createMarketingSingleUseVerifier({verifyProvider:async()=>true,claimDigest})(token),false)
})
test('claim bridge is fixed-origin, service-only, strict boolean and sends only irreversible digest',async()=>{
 const digest='a'.repeat(64),calls=[]
 const claim=createMarketingChallengeClaim({url:'https://mrybvqdebbgcayuvgkkr.supabase.co',serviceKey:'SYNTHETIC_SERVICE_ONLY',fetchImpl:async(url,options)=>{calls.push({url,options});return Response.json(true)}})
 assert.equal(await claim(token),false);assert.equal(calls.length,0);assert.equal(await claim(digest),true)
 assert.deepEqual(JSON.parse(calls[0].options.body),{p_digest:digest});assert.equal(calls[0].options.redirect,'error');assert.ok(!calls[0].options.body.includes(token))
 assert.throws(()=>createMarketingChallengeClaim({url:'https://evil.invalid',serviceKey:'SYNTHETIC_SERVICE_ONLY'}))
})
