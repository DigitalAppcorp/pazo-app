import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {parsePazoCampaign,createPazoMarketingRecorder,prepareAutomaticCampaignIntake} from './attribution.ts'
import {validateMarketingUrl} from '../../../scripts/marketing-validate-urls.mjs'
import {createMarketingLandingHandler} from '../../../supabase/functions/pazo-marketing-landing/landingCore.mjs'
import {createMarketingIntakeHandler} from '../../../supabase/functions/pazo-marketing-attribution/intakeCore.mjs'
import {ADS2_CREATIVES,LEGACY_CREATIVES,validCampaignPair} from '../../../supabase/functions/_shared/marketingCampaign.mjs'

const manifest=JSON.parse(readFileSync(new URL('../../../docs/marketing/ads2-six-urls.json',import.meta.url),'utf8'))
const identifiers=['c2_en_01_qr','c2_en_02_care','c2_en_03_alert','c2_en_04_places','c2_en_05_community','c2_en_06_overview']
const now=Date.parse('2026-11-03T02:00:00Z')
const stamp=new Date(now).toISOString()
const owner='16800000-0000-4000-8000-000000000098'
const headers={origin:'https://pazo-app.vercel.app','content-type':'application/json',authorization:'Bearer SYNTHETIC_ONLY_AUTH', 'x-pazo-challenge':'SYNTHETIC'}

const send=body=>new Request('https://synthetic.invalid',{method:'POST',headers,body:JSON.stringify(body)})

test('all six canonical new UTM links are disjoint, format-valid and accepted by app and both Edge handlers',async()=>{
  assert.equal(manifest.campaign,'pazo_la_en_202611')
  assert.equal(manifest.ads.length,6)
  assert.deepEqual(manifest.ads.map(a=>a.format),Array(6).fill('image'))
  assert.deepEqual(manifest.ads.map(a=>new URL(a.url).searchParams.get('utm_content')),identifiers)
  assert.equal(new Set(identifiers).size,6)
  for(const ad of manifest.ads){
    assert.equal(validateMarketingUrl(ad.url).valid,true)
    const url=new URL(ad.url),body=Object.fromEntries(url.searchParams)
    const attr=parsePazoCampaign(url.search,now)
    assert.equal(attr?.creative,body.utm_content)
    const values=new Map()
    const recorder=createPazoMarketingRecorder({getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)}, {enabled:true,now:()=>now})
    recorder.captureLanding(url.search);recorder.signupRequested(owner)
    recorder.signupVerified(stamp,stamp);recorder.firstPetCreated()
    const intake=prepareAutomaticCampaignIntake(recorder.read())
    assert.equal(intake?.utm_content,body.utm_content)
    assert.equal(intake?.utm_campaign,manifest.campaign)
    const landing=createMarketingLandingHandler({released:true,verifyChallenge:async()=>true,submit:async c=>c===body.utm_content})
    const acquisition=createMarketingIntakeHandler({released:true,clock:()=>now,authenticate:async()=>({id:owner,created_at:stamp,email_confirmed_at:stamp}),submit:async v=>v.creative===body.utm_content})
    assert.equal((await landing(send(body))).status,202)
    assert.equal((await acquisition(send(intake))).status,202)
    assert.equal(validateMarketingUrl(ad.url+'&utm_content=qr_v2_en').valid,false)
    assert.equal(parsePazoCampaign(url.search.replace(manifest.campaign,'pazo_beta_local_202610'),now),null)
  }
})
test('existing three C2 ads and all six legacy codes remain valid, unknown codes and cross-pairs fail closed',()=>{
  for(const old of ['qr_v2_en','cuidados_v2_en','app_v2_en']){
    assert.ok(ADS2_CREATIVES.includes(old))
    assert.equal(validCampaignPair('pazo_la_en_202611',old),true)
    assert.equal(validCampaignPair('pazo_beta_local_202610',old),false)
  }
  for(const creative of LEGACY_CREATIVES){
    assert.equal(validCampaignPair('pazo_beta_local_202610',creative),true)
    assert.equal(validCampaignPair('pazo_la_en_202611',creative),false)
  }
  for(const creative of identifiers){
    assert.equal(validCampaignPair('pazo_la_en_202611',creative),true)
    assert.equal(validCampaignPair('pazo_beta_local_202610',creative),false)
  }
  for(const unknown of ['c2_en_07_other','c2_en_01_qr%0A','test','__proto__']){
    assert.equal(validCampaignPair('pazo_la_en_202611',unknown),false)
  }
})
