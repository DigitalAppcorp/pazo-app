import test from 'node:test'
import assert from 'node:assert/strict'
import {auditPazoPublicPwa,PAZO_BETA_PUBLIC_ORIGIN}
 from './f16-public-pwa-http-gate.mjs'

const html='<!doctype html><html><head><link rel="manifest" href="/manifest.webmanifest"></head>'+
 '<body><div id="root"></div><script type="module" src="/assets/index-test123.js"></script></body></html>'
const manifest=JSON.stringify({name:'PAZO',display:'standalone',scope:'/',start_url:'/',
 icons:[{src:'/pwa-icon-192.png',sizes:'192x192'},
  {src:'/pwa-icon-512.png',sizes:'512x512'}]})
const sw="self.addEventListener('fetch', (event) => {\n"+
 " if (event.request.mode !== 'navigate' || event.request.method !== 'GET') return;\n"+
 " event.respondWith(fetch(event.request));\n})"
const png=Uint8Array.from([137,80,78,71,13,10,26,10,...Array(24).fill(0)])
const pathOf=url=>new URL(url).pathname
const good=()=>async (url,opts)=>{
 assert.equal(opts.method,'GET')
 assert.equal(opts.redirect,'manual')
 assert.equal(opts.credentials,'omit')
 assert.equal(opts.cache,'no-store')
 assert.ok(!('Authorization' in opts.headers))
 const path=pathOf(url)
 if(path==='/manifest.webmanifest')return new Response(manifest,{
  status:200,headers:{'content-type':'application/manifest+json'}})
 if(path==='/sw.js')return new Response(sw,{
  status:200,headers:{'content-type':'application/javascript'}})
 if(path.endsWith('.png'))return new Response(png,{
  status:200,headers:{'content-type':'image/png'}})
 return new Response(html,{status:200,headers:{'content-type':'text/html; charset=utf-8'}})
}

test('canonical public PWA readiness returns seven PASS without cookies or private credentials',async()=>{
 const urls=[]
 const provider=good()
 const result=await auditPazoPublicPwa({fetchImpl:async(url,options)=>{
  urls.push(url);return provider(url,options)
 }})
 assert.equal(result.origin,PAZO_BETA_PUBLIC_ORIGIN)
 assert.equal(result.ready,true)
 assert.equal(result.checks.length,7)
 assert.ok(result.checks.every(c=>c.code==='pass'))
 assert.ok(urls.every(x=>x.startsWith(PAZO_BETA_PUBLIC_ORIGIN+'/')))
 assert.ok(urls.some(x=>x.includes('/paypal/return?ba_token=')))
})

test('stale Vercel deployment with 404 callback fails closed with scoped evidence',async()=>{
 const provider=good()
 const r=await auditPazoPublicPwa({fetchImpl:async(url,options)=>{
  if(pathOf(url)==='/paypal/return')return new Response('Not Found',{status:404})
  return provider(url,options)
 }})
 assert.equal(r.ready,false)
 assert.deepEqual(r.checks.find(x=>x.id==='paypalReturn'),
  {id:'paypalReturn',code:'http_status_not_200'})
 assert.equal(JSON.stringify(r).includes('PAZO_NONPAYMENT_CALLBACK_PROBE'),false)
})

test('SSO redirect, wrong manifest and reflected callback token are all NO-GO',async()=>{
 const provider=good()
 const r=await auditPazoPublicPwa({fetchImpl:async(url,opts)=>{
  const path=pathOf(url)
  if(path==='/')return new Response(null,{status:302,headers:{location:'/login'}})
  if(path==='/manifest.webmanifest')return new Response('{}',{status:200,
   headers:{'content-type':'application/json'}})
  if(path==='/paypal/cancel')return new Response(
   html+'PAZO_NONPAYMENT_CALLBACK_PROBE',{status:200,headers:{'content-type':'text/html'}})
  return provider(url,opts)
 }})
 assert.equal(r.ready,false)
 assert.equal(r.checks.find(x=>x.id==='home').code,'unexpected_redirect')
 assert.equal(r.checks.find(x=>x.id==='manifest').code,'invalid_pwa_manifest')
 assert.equal(r.checks.find(x=>x.id==='paypalCancel').code,'provider_token_reflected')
})

test('rejects any unapproved target to prevent credentialless HTTP probing of local/internal origins',async()=>{
 await assert.rejects(()=>auditPazoPublicPwa({
  origin:'http://localhost:5173',fetchImpl:good()
 }),/public_origin_not_approved/)
 await assert.rejects(()=>auditPazoPublicPwa({
  origin:'https://malicious.example',fetchImpl:good()
 }),/public_origin_not_approved/)
})
