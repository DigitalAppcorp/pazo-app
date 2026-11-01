// PAZO #169 — real Chromium isolation, real candidate loader, synthetic SDK.
// Strictly NO requests may reach Meta or another external domain. Intercept
// fbevents.js and inject a local audit stub; this is NOT a vendor SDK audit.
import assert from 'node:assert/strict'
import {mkdirSync,writeFileSync} from 'node:fs'
import {createRequire} from 'node:module'
import {createServer} from 'vite'

const require=createRequire(import.meta.url)
const {chromium}=require('playwright')
const PORT=5393,ORIGIN='http://127.0.0.1:'+PORT
const PIXEL_URL='https://connect.facebook.net/en_US/fbevents.js'
const DATASET='1090116830295088' // isolated QA only
const EVENT='11111111-2222-4333-8444-555555555555'
const TARGET='artifacts/meta-pixel-egress/AUDIT.json'
const plugin={name:'meta-pixel-egress-local-only',
 configureServer(server){
   server.middlewares.use(async(req,res,next)=>{
     if(!req.url?.startsWith('/__meta_pixel_audit__/'))return next()
     try{
       const html='<html><head><meta charset="utf-8"></head><body><h1>PAZO QA synthetic Pixel egress lab</h1></body></html>'
       res.setHeader('Content-Type','text/html; charset=utf-8')
       res.setHeader('Cache-Control','no-store')
       res.end(await server.transformIndexHtml(req.url,html))
     }catch(error){next(error)}
   })
 }}
const app=await createServer({configFile:false,logLevel:'error',
 plugins:[plugin],server:{host:'127.0.0.1',port:PORT,strictPort:true}})
let browser
const report=[]
try{
 await app.listen()
 browser=await chromium.launch({headless:true,args:['--no-sandbox']})
 for(const scenario of ['off','gpc','consented','withdrawn']){
   const ctx=await browser.newContext({serviceWorkers:'block',
     viewport:{width:390,height:800}})
   const page=await ctx.newPage()
   const requested=[],blocked=[]
   const allowStub=['consented','withdrawn'].includes(scenario)
   await page.route('**/*',async route=>{
     const url=route.request().url(),u=new URL(url)
     if(u.origin===ORIGIN)return route.continue()
     // Never forward network to Meta: use a deterministic SDK stand-in.
     if(url===PIXEL_URL&&allowStub){
       requested.push('sdk_loader_intercepted')
       return route.fulfill({status:200,contentType:'application/javascript',
         body:`window.__metaSdkCalls=[];window.fbq.callMethod=function(...args){
           window.__metaSdkCalls.push(args)
         }`})
     }
     blocked.push(u.hostname)
     return route.abort('blockedbyclient')
   })
   await page.goto(ORIGIN+'/__meta_pixel_audit__/',{waitUntil:'domcontentloaded'})
   const info=await page.evaluate(async({scenario,DATASET,EVENT})=>{
     const module=await import('/src/features/marketing/metaPixelLoader.mjs')
     if(scenario==='gpc')Object.defineProperty(navigator,'globalPrivacyControl',{
       configurable:true,value:true})
     const result=await module.loadMetaPixelForVerifiedSignup({
       releaseEnabled:scenario!=='off',privacyGateApproved:true,
       explicitConsent:true,accountExcluded:false,qaOrAdmin:false,
       optedOut:false,verifiedRegistration:true,datasetId:DATASET,
       eventId:EVENT,browser:window,dom:document,stillAllowed:()=>true,
       sdkTimeoutMs:1200,
     })
     const queue=window.fbq?.queue||[]
     const sdkCalls=window.__metaSdkCalls||[]
     let revoked=false
     if(scenario==='withdrawn'){
       revoked=module.revokeOwnedMetaPixelConsent({browser:window})
     }
     return {status:result.status,queue,sdkCalls,
       revoked,postRevocationCalls:window.__metaSdkCalls||[],
       cookies:document.cookie,
       sessionStorageKeys:sessionStorage.length,
       localStorageKeys:localStorage.length}
   },{scenario,DATASET,EVENT})
   assert.deepEqual(blocked,[],'unexpected external egress attempt: '+scenario)
   if(scenario==='off'||scenario==='gpc'){
     assert.equal(info.status,'suppressed')
     assert.deepEqual(requested,[])
     assert.deepEqual(info.queue,[])
   }else{
     assert.equal(info.status,'queued')
     assert.deepEqual(requested,['sdk_loader_intercepted'])
     assert.deepEqual(info.queue,[
       ['consent','revoke'],
       ['set','autoConfig',false,DATASET],
       ['init',DATASET],
     ])
     assert.deepEqual(info.sdkCalls.slice(0,2),[
       ['consent','grant'],
       ['trackSingle',DATASET,'CompleteRegistration',{}, {eventID:EVENT}],
     ])
     if(scenario==='withdrawn'){
       assert.equal(info.revoked,true)
       assert.deepEqual(info.postRevocationCalls.at(-1),['consent','revoke'])
     }
   }
   assert.equal(info.cookies,'')
   assert.equal(info.sessionStorageKeys,0)
   assert.equal(info.localStorageKeys,0)
   report.push({scenario,status:info.status,
     externalRequestsForwarded:0,
     sdkLoadRequestsIntercepted:requested.length,
     unexpectedRequests:blocked.length,
     syntheticSdkOnly:true,verifiedVendorSdkBehavior:false})
   await ctx.close()
 }
 mkdirSync('artifacts/meta-pixel-egress',{recursive:true})
 writeFileSync(TARGET,JSON.stringify({status:'ISOLATED_PIXEL_EGRESS_GATES_PASS',
  qaDataset:DATASET,productionUntouched:true,actualMetaRequests:0,
  scenarios:report,limitations:[
   'Synthetic stub replaces actual fbevents.js: vendor behavior NOT AUDITED',
   'Browser origin is localhost, not PAZO hosted app',
   'No real Meta deduplication, cookie/URL/IP or SDK behavior verified',
  ]},null,2))
 console.log('META_PIXEL_EGRESS_ISOLATED_PASS scenarios='+report.length)
}finally{
 if(browser)await browser.close()
 await app.close()
}
