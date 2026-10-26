import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {validateMarketingUrl} from '../../../scripts/marketing-validate-urls.mjs'
import {parsePazoCampaign} from './attribution.ts'
import {createMarketingLandingHandler} from '../../../supabase/functions/pazo-marketing-landing/landingCore.mjs'
import {createMarketingIntakeHandler} from '../../../supabase/functions/pazo-marketing-attribution/intakeCore.mjs'
const manifest=JSON.parse(readFileSync(new URL('../../../docs/marketing/traffic-pilot-urls.json',import.meta.url),'utf8'))
test('all three official Traffic URLs pass actual client and both Edge contracts',async()=>{
 assert.deepEqual(manifest.ads.map(ad=>ad.format),['image','carousel','video'])
 const now=Date.now(),stamp=new Date(now).toISOString()
 for(const ad of manifest.ads){
  assert.equal(validateMarketingUrl(ad.url).valid,true)
  const url=new URL(ad.url),attr=parsePazoCampaign(url.search,now)
  assert.ok(attr);assert.equal(attr.campaign,manifest.campaign)
  const body=Object.fromEntries(url.searchParams),submitted=[]
  const headers={origin:'https://pazo-app.vercel.app','content-type':'application/json','x-pazo-challenge':'SYNTHETIC_ONLY_CHALLENGE',authorization:'Bearer SYNTHETIC_ONLY_AUTH'}
  const landing=createMarketingLandingHandler({released:true,verifyChallenge:async()=>true,submit:async creative=>{submitted.push(creative);return true}})
  const intake=createMarketingIntakeHandler({released:true,clock:()=>now,authenticate:async()=>({id:'11111111-1111-4111-8111-111111111111',created_at:stamp,email_confirmed_at:stamp}),submit:async value=>{submitted.push(value.creative);return true}})
  assert.equal((await landing(new Request('https://synthetic.invalid',{method:'POST',headers,body:JSON.stringify(body)}))).status,202)
  assert.equal((await intake(new Request('https://synthetic.invalid',{method:'POST',headers,body:JSON.stringify({...body,first_touch_at:stamp})}))).status,202)
  assert.equal(submitted.length,2)
 }
})
test('obsolete or altered advertising URLs produce explicit preflight diagnostics',()=>{
 const url=manifest.ads[0].url
 assert.deepEqual(validateMarketingUrl(url.replace(manifest.campaign,'pazo_us_pilot_30d')),{valid:false,code:'unsupported_campaign'})
 assert.equal(validateMarketingUrl(url.replace('perfil_en','01_qr_video_en_v1')).code,'unsupported_source_medium_or_creative')
 assert.equal(validateMarketingUrl(url+'&utm_content=qr_en').code,'missing_or_duplicate_utm')
 assert.equal(validateMarketingUrl(url+'&email=private%40example.com').code,'unapproved_query_parameter')
 assert.equal(validateMarketingUrl(url.replace('https://pazo-app.vercel.app','https://example.com')).code,'wrong_destination')
})
