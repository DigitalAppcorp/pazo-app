// PAZO #169 — REAL Meta SDK egress inspection with zero event delivery.
// Loads official SDK asset(s) only from connect.facebook.net, after explicit
// synthetic opt-in. All event/beacon/unknown hosts are intercepted and ABORTED.
// No PAZO site, user data, secrets, server outbox, Graph API or QA token.
import {mkdirSync,writeFileSync} from 'node:fs'
import {createRequire} from 'node:module'
import {createServer} from 'vite'
const require=createRequire(import.meta.url)
const {chromium}=require('playwright')
const PORT=5394,ORIGIN='http://127.0.0.1:'+PORT
const DATASET='1090116830295088'
const EVENT='11111111-2222-4333-8444-555555555555'
const OUT='artifacts/meta-vendor-egress/OBSERVATIONS.json'
const plugin={name:'pazo-meta-vendor-qa-host',
 configureServer(server){
  server.middlewares.use(async(req,res,next)=>{
   if(!req.url?.startsWith('/__meta_vendor_audit__/'))return next()
   try{
    res.setHeader('content-type','text/html; charset=utf-8')
    res.setHeader('cache-control','no-store')
    res.end(await server.transformIndexHtml(req.url,
      '<!doctype html><html><head><meta charset="utf-8"></head><body>'+
      '<h1>PAZO QA -- Synthetic, no user data</h1></body></html>'))
   }catch(error){next(error)}
  })
 }}
const app=await createServer({configFile:false,logLevel:'error',
 plugins:[plugin],server:{host:'127.0.0.1',port:PORT,strictPort:true}})
let browser,ctx
const observed={status:'INCONCLUSIVE',qaDataset:DATASET,
 productionDatasetNotUsed:true,externalEventsDelivered:0,
 sourceAssetsLoaded:0,interceptedEventRequests:[],
 unexpectedRemoteRequests:[],scriptResult:null,
 cookiesBefore:[],cookiesAfter:[],
 sdkAssetErrors:[],limits:[
  'Only synthetic localhost browser session; no PAZO credentials or users',
  'Actual vendor SDK version varies; event egress blocked, not delivered',
  'No server CAPI event or provider-side deduplication tested',
  'Cookie/IP/URL exposure on real PAZO hosted routes NOT approved',
 ]}
try{
 await app.listen()
 browser=await chromium.launch({headless:true,args:['--no-sandbox']})
 ctx=await browser.newContext({serviceWorkers:'block',viewport:{
  width:390,height:780},ignoreHTTPSErrors:false})
 const page=await ctx.newPage()
 page.on('pageerror',err=>{
  // Do not record arbitrary vendor error text or URLs/tokens.
  observed.sdkAssetErrors.push('page_exception')
 })
 await page.route('**/*',async route=>{
  const url=new URL(route.request().url())
  if(url.origin===ORIGIN)return route.continue()
  // Only Meta-hosted static scripts may be fetched. No tracking beacon,
  // XHR/fetch, iframe or image to any external domain ever reaches network.
  const staticSdk=url.hostname==='connect.facebook.net'
    && route.request().resourceType()==='script'
    && (url.pathname==='/en_US/fbevents.js'
      || /^\/signals\/(config|plugins)\//.test(url.pathname))
  if(staticSdk){
   try{
    const response=await route.fetch({timeout:12000,maxRedirects:0})
    if(!response.ok()){
     observed.sdkAssetErrors.push('vendor_asset_non_200')
     return route.abort('blockedbyclient')
    }
    observed.sourceAssetsLoaded++
    return route.fulfill({response})
   }catch{
    observed.sdkAssetErrors.push('vendor_asset_unreachable')
    return route.abort('blockedbyclient')
   }
  }
  const keys=[...url.searchParams.keys()].sort()
  const rec={host:url.hostname,
    path:url.pathname.slice(0,80),type:route.request().resourceType(),
    queryKeys:keys.slice(0,32)}
  if(url.hostname==='www.facebook.com' && url.pathname.startsWith('/tr')){
   // Event name and event ID are synthetic non-personal identifiers.
   rec.eventName=(url.searchParams.get('ev')||'').slice(0,40)
   rec.eventIdIsSynthetic=url.searchParams.get('eid')===EVENT
   rec.hasDocumentLocation=url.searchParams.has('dl')
   rec.hasReferrer=url.searchParams.has('rl')
   rec.hasCookieIdentifiers=url.searchParams.has('fbp')||url.searchParams.has('fbc')
   observed.interceptedEventRequests.push(rec)
  }else observed.unexpectedRemoteRequests.push(rec)
  return route.abort('blockedbyclient')
 })
 await page.goto(ORIGIN+'/__meta_vendor_audit__/',{
  waitUntil:'domcontentloaded',timeout:20000})
 observed.cookiesBefore=(await ctx.cookies()).map(c=>c.name).sort()
 const result=await page.evaluate(async({DATASET,EVENT})=>{
  const {loadMetaPixelForVerifiedSignup,revokeOwnedMetaPixelConsent}
   =await import('/src/features/marketing/metaPixelLoader.mjs')
  // Capture the queue BEFORE loading the real SDK, which consumes or
  // replaces it during bootstrap. Never inspect it post-load as proof.
  const originalAppend=document.head.appendChild
  let beforeVendorSdk=[]
  document.head.appendChild=function(node){
   if(node?.src==='https://connect.facebook.net/en_US/fbevents.js'){
    beforeVendorSdk=(window.fbq?.queue||[]).map(x=>Array.from(x))
   }
   return originalAppend.call(this,node)
  }
  const result=await loadMetaPixelForVerifiedSignup({
   releaseEnabled:true,privacyGateApproved:true,explicitConsent:true,
   accountExcluded:false,qaOrAdmin:false,optedOut:false,
   verifiedRegistration:true,datasetId:DATASET,eventId:EVENT,
   browser:window,dom:document,stillAllowed:()=>true,
   sdkTimeoutMs:15000,
  })
  document.head.appendChild=originalAppend
  // Let the authentic vendor SDK try to emit the synthetic event first;
  // all event/beacon/network destinations are intercepted and ABORTED
  // by the Playwright route above, so no provider event is delivered.
  await new Promise(resolve=>setTimeout(resolve,1700))
  const cookiesBeforeRevoke=document.cookie.split(';').map(x=>x.trim()
    .split('=')[0]).filter(Boolean).sort()
  const revoke=revokeOwnedMetaPixelConsent({browser:window})
  const cookiesAfterRevoke=document.cookie.split(';').map(x=>x.trim()
    .split('=')[0]).filter(Boolean).sort()
  return {status:result.status,revoked:revoke,
    cookiesBeforeRevoke,cookiesAfterRevoke,
    preloadCommandsCaptured:beforeVendorSdk.length,
    consentInitiallyRevoked:beforeVendorSdk.some(a=>
      a[0]==='consent'&&a[1]==='revoke'),
    automaticEventConfigDisabled:beforeVendorSdk.some(a=>
      a[0]==='set'&&a[1]==='autoConfig'
        &&a[2]===false&&a[3]===DATASET),
    historyInstrumentationDisabled:window.fbq?.disablePushState===true}
 },{DATASET,EVENT})
 observed.scriptResult=result
 // Allow any short asynchronous Meta SDK callbacks to be intercepted.
 await page.waitForTimeout(1200)
 observed.cookiesAfter=(await ctx.cookies()).map(c=>c.name).sort()
 const badAutoEvents=observed.interceptedEventRequests.filter(e=>
  e.eventName&&e.eventName!=='CompleteRegistration')
 const unexpected=observed.unexpectedRemoteRequests.length
 const matched=observed.interceptedEventRequests.some(e=>
  e.eventName==='CompleteRegistration'&&e.eventIdIsSynthetic)
 if(observed.sourceAssetsLoaded===0||result.status!=='queued'){
  observed.status='INCONCLUSIVE_VENDOR_SDK_UNAVAILABLE'
 }else if(observed.cookiesAfter.some(n=>n==='_fbp'||n==='_fbc')){
  observed.status='REVIEW_REQUIRED_TRACKING_COOKIE_PERSISTS_AFTER_WITHDRAWAL'
 }else if(unexpected||badAutoEvents.length){
  observed.status='REVIEW_REQUIRED_UNEXPECTED_SDK_EGRESS'
 }else if(!matched){
  observed.status='INCONCLUSIVE_NO_BROWSER_EVENT_OBSERVED'
 }else if(result.automaticEventConfigDisabled
  &&result.historyInstrumentationDisabled&&result.revoked){
  observed.status='OBSERVED_VENDOR_EVENT_BLOCKED_BY_AUDIT'
 }else{
  observed.status='REVIEW_REQUIRED_CONTROL_MISSING'
 }
}finally{
 if(ctx)await ctx.close()
 if(browser)await browser.close()
 await app.close()
 mkdirSync('artifacts/meta-vendor-egress',{recursive:true})
 writeFileSync(OUT,JSON.stringify(observed,null,2))
 console.log('META_VENDOR_EGRESS_AUDIT_RESULT '+observed.status)
 console.log('META_VENDOR_ASSETS '+observed.sourceAssetsLoaded+
   ' EVENT_REQUESTS_BLOCKED '+observed.interceptedEventRequests.length+
   ' OTHER_REMOTE_BLOCKED '+observed.unexpectedRemoteRequests.length)
}
