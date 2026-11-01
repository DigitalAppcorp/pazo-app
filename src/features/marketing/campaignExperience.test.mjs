import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {createMarketingLandingHandler} from '../../../supabase/functions/pazo-marketing-landing/landingCore.mjs'
import {createExperienceCampaignSubmit} from '../../../supabase/functions/pazo-marketing-landing/landingAdapter.mjs'

const tag={utm_source:'meta',utm_medium:'paid_social',utm_campaign:'pazo_la_en_202611',utm_content:'qr_v2_en'}
const request=(body,extra={})=>new Request('https://isolated.invalid',{method:'POST',headers:{origin:'https://pazo-app.vercel.app','content-type':'application/json','x-pazo-challenge':'single-use',...extra},body:JSON.stringify(body)})
const handler=(over={})=>{const calls=[];return {calls,h:createMarketingLandingHandler({released:true,submit:async()=>true,verifyChallenge:async()=>true,experienceReleased:true,submitExperience:async s=>{calls.push(['plain',s]);return true},submitExperienceCampaign:async(c,s)=>{calls.push(['tagged',c,s]);return true},experienceCampaignReleased:true,...over})}}

test('notice and Edge are released; build flag and SQL gate stay independent',()=>{
 assert.match(fs.readFileSync('supabase/functions/pazo-marketing-landing/index.ts','utf8'),/INTELLIGENCE_CAMPAIGN_EXPERIENCE_RELEASED=true/)
 assert.match(fs.readFileSync('src/features/legal/legalCopy.ts','utf8'),/CAMPAIGN_EXPERIENCE_NOTICE_RELEASED=true/)
 assert.match(fs.readFileSync('src/features/marketing/campaignExperience.ts','utf8'),/VITE_PAZO_CAMPAIGN_EXPERIENCE_ENABLED==='true'/)
 assert.match(fs.readFileSync('supabase/migrations/20261102120000_pazo_campaign_experience.sql','utf8'),/campaign_experience_enabled boolean NOT NULL DEFAULT false/)
})
test('collection code has no identifier, storage write or retry',()=>{
 const source=fs.readFileSync('src/features/marketing/campaignExperience.ts','utf8')
 assert.doesNotMatch(source,/randomUUID|setItem|cookie|fbclid|ownerId|navigator\.userAgent/)
})
test('edge OFF refuses tagged signals and still accepts plain ones',async()=>{
 const {h,calls}=handler({experienceCampaignReleased:false})
 assert.equal((await h(request({experience:'demo_enter',...tag}))).status,503)
 assert.equal((await h(request({experience:'demo_enter'}))).status,202)
 assert.deepEqual(calls,[['plain','demo_enter']])
})
test('edge ON sends only the allowlisted creative and signal',async()=>{
 const {h,calls}=handler()
 assert.equal((await h(request({experience:'demo_pet',...tag}))).status,202)
 assert.deepEqual(calls,[['tagged','qr_v2_en','demo_pet']])
})
for(const [name,body]of Object.entries({
 'unknown creative':{experience:'demo_pet',...tag,utm_content:'hack'},
 'campaign mismatch':{experience:'demo_pet',...tag,utm_campaign:'pazo_beta_local_202610'},
 'other source':{experience:'demo_pet',...tag,utm_source:'google'},
 'extra field':{experience:'demo_pet',...tag,owner:'A'},
 'partial tag':{experience:'demo_pet',utm_content:'qr_v2_en'},
 'unknown signal':{experience:'email',...tag},
}))test('edge rejects '+name,async()=>{const {h,calls}=handler();assert.equal((await h(request(body))).status,400);assert.deepEqual(calls,[])})
test('GPC blocks tagged signals too',async()=>{const {h,calls}=handler();assert.equal((await h(request({experience:'demo_pet',...tag},{'sec-gpc':'1'}))).status,400);assert.deepEqual(calls,[])})
test('server bridge fixes project and exact RPC contract',async()=>{
 const url='https://mrybvqdebbgcayuvgkkr.supabase.co',calls=[]
 assert.throws(()=>createExperienceCampaignSubmit({url:'https://wrong.invalid',serviceKey:'synthetic_service_only'}))
 const send=createExperienceCampaignSubmit({url,serviceKey:'synthetic_service_only',fetchImpl:async(...a)=>{calls.push(a);return new Response('true',{status:200})}})
 assert.equal(await send('qr_v2_en','demo_pet'),true)
 assert.equal(calls[0][0],url+'/rest/v1/rpc/pazo_intelligence_experience_campaign_v1')
 assert.deepEqual(JSON.parse(calls[0][1].body),{p_creative:'qr_v2_en',p_signal:'demo_pet'})
})
