import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {normalizePazoDraft,savePazoAdminDraftWithReadback}
 from '../paypalDraftSave.mjs'

const input={environment:'live',price:'2,99',planId:'',
 origin:'HTTPS://PAZO-APP-T83R.VERCEL.APP/',webhookId:''}
const draft=normalizePazoDraft(input)
const settings=Object.freeze({environments:[
 {environment:'sandbox',plan_id:'P-14V25407JP6850922NLHMDKI',price_minor:299,
  return_origin:'',webhook_id:''},
 {environment:'live',plan_id:'',price_minor:299,
  return_origin:'https://pazo-app-t83r.vercel.app',webhook_id:''}
]})
test('Spanish decimal price, official HTTPS origin and optional Live plan/webhook normalize',()=>{
 assert.equal(draft.p_environment,'live')
 assert.equal(draft.p_price_minor,299)
 assert.equal(draft.p_return_origin,'https://pazo-app-t83r.vercel.app')
 assert.equal(draft.p_plan_id,'')
 assert.equal(draft.p_webhook_id,'')
})
test('invalid price, URL path, insecure origin and webhook reject before network',()=>{
 for(const changes of [
  {price:'2,9,9'},{price:'2000'}, {price:'2.999'},
  {origin:'http://pazo-app-t83r.vercel.app'},
  {origin:'https://pazo-app-t83r.vercel.app/paypal/return'},
  {origin:'https://pazo-app-t83r.vercel.app?secret=x'},
  {planId:'bogus'},{webhookId:'123'},{environment:'test'}
 ]){
  assert.equal(normalizePazoDraft({...input,...changes}),null)
 }
})
test('success is reported only after authenticated RPC and exact database readback',async()=>{
 let writes=0,reads=0
 const result=await savePazoAdminDraftWithReadback({draft,
  write:async payload=>{
   writes++
   assert.equal(payload.p_return_origin,'https://pazo-app-t83r.vercel.app')
   return {data:true,error:null}
  },
  read:async()=>{reads++;return {data:settings,error:null}}
 })
 assert.equal(result.state,'verified')
 assert.equal(result.code,'saved_and_read_back')
 assert.equal(result.settings,settings)
 assert.equal(writes,1)
 assert.equal(reads,1)
})
test('write rejection never claims success or attempts an additional read',async()=>{
 let reads=0
 const result=await savePazoAdminDraftWithReadback({draft,
  write:async()=>({data:null,error:{code:'42501',message:'private'}}),
  read:async()=>{reads++;return {data:settings}}
 })
 assert.equal(result.state,'rejected')
 assert.equal(result.code,'write_42501')
 assert.equal(JSON.stringify(result).includes('private'),false)
 assert.equal(reads,0)
})
test('ambiguous verification is not mistaken for a failed mutation or retried',async()=>{
 let writes=0
 const verify=async data=>savePazoAdminDraftWithReadback({draft,
  write:async()=>{writes++;return {data:true}},
  read:async()=>data
 })
 const unavailable=await verify({error:{code:'TIMEOUT'}})
 assert.equal(unavailable.state,'uncertain')
 assert.equal(unavailable.code,'readback_unavailable')
 const mismatch=await verify({data:{environments:[
  {...settings.environments[1],return_origin:'https://other.example.com'}
 ]}})
 assert.equal(mismatch.state,'uncertain')
 assert.equal(mismatch.code,'stored_values_mismatch')
 assert.equal(writes,2)
})
test('admin displays draft result beside save button rather than only above scrolled content',()=>{
 const ui=readFileSync(new URL('../components/AdminPayPalSettings.tsx',import.meta.url),'utf8')
 assert.ok(ui.includes('normalizePazoDraft('))
 assert.ok(ui.includes('savePazoAdminDraftWithReadback('))
 assert.ok(ui.includes('data-pazo-draft-result'))
 assert.ok(ui.includes('draftFeedback'))
 assert.ok(ui.includes('role={draftFeedback.state==='))
 assert.ok(ui.includes("busy?t('Guardando…'"))
})
