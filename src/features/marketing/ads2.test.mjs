import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {parsePazoCampaign,createPazoMarketingRecorder,prepareAutomaticCampaignIntake} from './attribution.ts'
import {createMarketingLandingHandler} from '../../../supabase/functions/pazo-marketing-landing/landingCore.mjs'
import {createMarketingIntakeHandler} from '../../../supabase/functions/pazo-marketing-attribution/intakeCore.mjs'
import {validateMarketingUrl} from '../../../scripts/marketing-validate-urls.mjs'
import {ALL_CREATIVES,campaignForCreative} from '../../../supabase/functions/_shared/marketingCampaign.mjs'
const manifest=JSON.parse(readFileSync(new URL('../../../docs/marketing/ads2-urls.json',import.meta.url)))
const now=Date.now(),stamp=new Date(now).toISOString(),owner='16800000-0000-4000-8000-000000000001'
const headers={origin:'https://pazo-app.vercel.app','content-type':'application/json',authorization:'Bearer SYNTHETIC_ONLY_AUTH','x-pazo-challenge':'SYNTHETIC'}
const request=body=>new Request('https://synthetic.invalid',{method:'POST',headers,body:JSON.stringify(body)})
test('three distinct image contracts complete the first-party funnel without rewriting campaign',async()=>{
 assert.deepEqual(manifest.ads.map(a=>a.format),['image','image','image'])
 for(const ad of manifest.ads){
  assert.equal(validateMarketingUrl(ad.url).valid,true)
  const url=new URL(ad.url),body=Object.fromEntries(url.searchParams),values=new Map()
  const recorder=createPazoMarketingRecorder({getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)},{enabled:true,now:()=>now})
  recorder.captureLanding(url.search);recorder.signupRequested(owner)
  assert.equal(prepareAutomaticCampaignIntake(recorder.read()),null)
  recorder.signupVerified(stamp,stamp);recorder.signupVerified(stamp,stamp);recorder.firstPetCreated()
  const intake=prepareAutomaticCampaignIntake(recorder.read())
  assert.equal(intake.utm_campaign,manifest.campaign);assert.equal(intake.utm_content,body.utm_content)
  assert.deepEqual(recorder.read().steps,['landing','signup_requested','signup_verified','first_pet_created'])
  let landing=0,registered=0
  const l=createMarketingLandingHandler({released:true,verifyChallenge:async()=>true,submit:async c=>{assert.equal(c,body.utm_content);landing++;return true}})
  const i=createMarketingIntakeHandler({released:true,clock:()=>now,authenticate:async()=>({id:owner,created_at:stamp,email_confirmed_at:stamp}),submit:async v=>{assert.equal(v.creative,body.utm_content);return ++registered===1}})
  assert.equal((await l(request(body))).status,202);assert.equal(landing,1)
  assert.equal((await i(request(intake))).status,202);assert.equal((await i(request(intake))).status,409)
 }
})
test('closed campaign/creative pairing is identical in parser and both Edge handlers',async()=>{
 for(const creative of ALL_CREATIVES)for(const campaign of ['pazo_beta_local_202610','pazo_la_en_202611','unknown']){
  const body={utm_source:'meta',utm_medium:'paid_social',utm_campaign:campaign,utm_content:creative}
  const valid=campaignForCreative(creative)===campaign
  assert.equal(!!parsePazoCampaign(new URLSearchParams(body).toString(),now),valid)
  const l=createMarketingLandingHandler({released:true,verifyChallenge:async()=>true,submit:async()=>true})
  const i=createMarketingIntakeHandler({released:true,clock:()=>now,authenticate:async()=>({id:owner,created_at:stamp,email_confirmed_at:stamp}),submit:async()=>true})
  assert.equal((await l(request(body))).status,valid?202:400)
  assert.equal((await i(request({...body,first_touch_at:stamp}))).status,valid?202:400)
 }
})
