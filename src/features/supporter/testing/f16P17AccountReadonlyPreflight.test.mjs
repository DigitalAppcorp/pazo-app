import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {inspectSupporterGateway,validStableOrigin}
 from '../../../../scripts/f16-p17-account-readonly-preflight.mjs'
const ORIGIN='https://pazo.example'
const TOKEN='mock.jwt.token.abcdefghijklmnopqrstuvwxyz0123456'
const KEY='sb_publishable_SYNTHETIC_KEY'
const ENDPOINT='https://mrybvqdebbgcayuvgkkr.supabase.co/functions/v1/f16-paypal-supporter-account'
const CORS={'access-control-allow-origin':ORIGIN,
 'access-control-allow-methods':'POST',
 'access-control-allow-headers':'authorization,content-type,apikey',
 'cache-control':'no-store'}
const headers=x=>new Headers(x)
function fixture({badOrigin=false,badList=false,fullPage=false,
 badHeaders=false,httpFailure=false,preflightStatus=204}={}){
 const requests=[]
 const fetchImpl=async (url,init)=>{
  requests.push({url,init})
  assert.equal(url,ENDPOINT)
  assert.equal(init.redirect,'error')
  assert.ok(['OPTIONS','POST'].includes(init.method))
  assert.equal(init.headers.Origin,ORIGIN)
  if(init.method==='OPTIONS')
   return{status:preflightStatus,headers:headers({...CORS,
    ...(badOrigin?{'access-control-allow-origin':'https://evil.invalid'}:{}),
    ...(badHeaders?{'access-control-allow-headers':'authorization_extra, content-type, apikey'}:{})
   })}
  assert.equal(init.body,'{"action":"list"}')
  if(httpFailure)return{status:503,headers:headers(CORS)}
  const entries=[{intentId:'intent-77777777-7777-4777-8777-777777777777',
   state:'bound',canDownloadAcceptance:false}]
  return{status:200,headers:headers(CORS),json:async()=>({
   ok:true,code:'account_list_verified',paidThrough:null,
   mayGrantBenefits:false,mayCreateSubscription:false,
   accounts:badList?[{intentId:'INVALID',state:'bound',
    canDownloadAcceptance:true}]:fullPage?Array(6).fill(entries[0]):entries,
  })}
 }
 return{fetchImpl,requests}
}
test('stable origin is exact HTTPS, not wildcard or a preview pattern',()=>{
 assert.equal(validStableOrigin(ORIGIN),true)
 for(const bad of [undefined,'https://*.vercel.app','http://pazo.example',
  'https://pazo.example:8080','https://pazo.example/extra',
  'https://user@pazo.example','https://pazo.example?q=1',
  'https://pazo.example/#foo','https://pazo.example.evil.invalid/path']){
  assert.equal(validStableOrigin(bad),false,String(bad))
 }
})
test('default CLI never connects without explicit opt-in',async()=>{
 let count=0
 const fetchImpl=async()=>{count++;throw Error('must not call network')}
 assert.equal((await inspectSupporterGateway({origin:ORIGIN,
  fetchImpl})).phase,'NOT_RUN')
 assert.equal((await inspectSupporterGateway({origin:'bad',allowNetwork:true,
  fetchImpl})).phase,'BLOCKED')
 assert.equal(count,0)
})
test('OPTIONS only without bearer does not contact PayPal or POST',async()=>{
 const m=fixture()
 const result=await inspectSupporterGateway({origin:ORIGIN,
  allowNetwork:true,fetchImpl:m.fetchImpl})
 assert.equal(result.phase,'CORS_VERIFIED')
 assert.deepEqual(m.requests.map(x=>x.init.method),['OPTIONS'])
})
test('owner list read-only emits only count and cannot leak secrets',async()=>{
 const m=fixture()
 const r=await inspectSupporterGateway({origin:ORIGIN,
  bearer:TOKEN,publishableKey:KEY,allowNetwork:true,fetchImpl:m.fetchImpl})
 assert.equal(r.phase,'READ_ONLY_LIST_VERIFIED')
 assert.equal(r.accountCount,1)
 assert.deepEqual(m.requests.map(x=>x.init.method),['OPTIONS','POST'])
 for(const secret of [TOKEN,KEY,URL,'intent-77777777-7777-4777-8777-777777777777'])
  assert.equal(JSON.stringify(r).includes(secret),false)
 for(const k of ['mayCancel','mayCreateSubscription','mayGrantBenefits','mayRecordPayment'])
  assert.equal(r[k],false)
 assert.equal(r.paidThrough,null)
})
test('host mismatch, partial header names, provider outage, excessive list block',async()=>{
 for(const args of [
  {badOrigin:true},{badHeaders:true},{httpFailure:true},
  {badList:true},{fullPage:true},
 ]){
  const m=fixture(args)
  const r=await inspectSupporterGateway({origin:ORIGIN,
   bearer:TOKEN,publishableKey:KEY,allowNetwork:true,fetchImpl:m.fetchImpl})
  assert.equal(r.phase,'BLOCKED')
  assert.equal(m.requests.filter(x=>x.init.method==='POST').length,
   args.badOrigin||args.badHeaders?0:1)
 }
})
test('P18 identifies preflight HTTP class without revealing body or secrets',async()=>{
 const cases=[
  [401,'preflight_http_401_authentication_gate'],
  [403,'preflight_http_403_origin_or_gateway_denial'],
  [404,'preflight_http_404_route_missing'],
  [503,'preflight_http_503_unavailable'],
 ]
 for(const [code,reason] of cases){
  const h=fixture({preflightStatus:code})
  const result=await inspectSupporterGateway({origin:ORIGIN,
   bearer:TOKEN,publishableKey:KEY,allowNetwork:true,fetchImpl:h.fetchImpl})
  assert.equal(result.phase,'BLOCKED')
  assert.equal(result.reason,reason)
  assert.deepEqual(h.requests.map(x=>x.init.method),['OPTIONS'])
  assert.ok(!JSON.stringify(result).includes(TOKEN))
  assert.ok(!JSON.stringify(result).includes(KEY))
 }
})
test('only authorized diagnostic request bodies, no billing or cancellation',()=>{
 const src=fs.readFileSync(
  new URL('../../../../scripts/f16-p17-account-readonly-preflight.mjs',import.meta.url),
  'utf8')
 assert.ok(src.includes('body:\'{"action":"list"}\''))
 assert.equal(/["']action["']\s*:\s*["']cancel["']/.test(src),false)
 assert.equal(/["']action["']\s*:\s*["']checkout["']/.test(src),false)
})
