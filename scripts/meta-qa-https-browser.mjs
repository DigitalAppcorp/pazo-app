// #169 — one-shot HTTPS QA browser audit. REAL synthetic Pixel request only.
// Runs from GitHub-hosted Chromium, NEVER from a real PAZO account/browser.
// The QA page requires deliberate opt-in, with GPC and revocation coverage.
import assert from 'node:assert/strict'
import {createRequire} from 'node:module'
import {mkdirSync,writeFileSync} from 'node:fs'
const {chromium}=createRequire(import.meta.url)('playwright')
const SITE='https://pazo-meta-qa-20261031.vercel.app'
const DATASET='1090116830295088'
const out='artifacts/meta-qa-https/OBSERVATIONS.json'
const result={lab:SITE,dataset:DATASET,productionUntouched:true,
  status:'NOT_RUN',testOnly:true,apiTokenUsed:false,
  initialMetaRequests:0,gpcMetaRequests:0,
  inspectedPixelRequests:[],externalRequestsDenied:[],
  testPageStatus:null,eventIdentifier:null,metaResponseStatus:null,
  cookiesAfterWithdrawal:[],cookieScopeAfterWithdrawal:[],
  sdkStateEarly:null,sdkStateLate:null,consoleErrors:[],failedRequests:[],errors:[],
  limitations:[
   'One synthetic browser Pixel request is not CAPI deduplication',
   'Meta Events Manager ingestion has not been independently confirmed',
   'CI runner IP and browser data belong to a synthetic test environment',
   'No real users, credentials, account email, or PAZO production visit',
  ]}
let browser
const remote=(value)=>!value.startsWith(SITE+'/')
try{
 browser=await chromium.launch({headless:true,args:['--no-sandbox']})
 // First prove the page does not contact any Meta endpoint on opening.
 const initial=await browser.newContext({serviceWorkers:'block'})
 const initialPage=await initial.newPage()
 const seen=[]
 await initialPage.on('request',req=>{
  if(remote(req.url()))seen.push(new URL(req.url()).hostname)
 })
 const response=await initialPage.goto(SITE+'/',{waitUntil:'domcontentloaded',timeout:30000})
 assert.equal(response.status(),200,'QA HTTPS page must be public and reachable')
 assert.match(await initialPage.title(),/PAZO QA/)
 await initialPage.waitForTimeout(700)
 result.initialMetaRequests=seen.length
 assert.equal(seen.length,0,'Meta must be unloaded before opt-in')
 assert.equal(await initialPage.locator('#fire').isDisabled(),true)
 await initial.close()

 // Browser-supplied Global Privacy Control must block the test entirely.
 const gpc=await browser.newContext({serviceWorkers:'block'})
 await gpc.addInitScript(()=>Object.defineProperty(navigator,
  'globalPrivacyControl',{configurable:true,value:true}))
 const gpcPage=await gpc.newPage()
 const gpcSeen=[]
 gpcPage.on('request',req=>{if(remote(req.url()))gpcSeen.push(new URL(req.url()).hostname)})
 await gpcPage.goto(SITE+'/',{waitUntil:'domcontentloaded',timeout:30000})
 await gpcPage.locator('#agree').check()
 assert.equal(await gpcPage.locator('#fire').isDisabled(),true)
 await gpcPage.waitForTimeout(800)
 result.gpcMetaRequests=gpcSeen.length
 assert.equal(gpcSeen.length,0,'GPC must not load any Meta SDK request')
 await gpc.close()

 // Only this synthetic runner consents and may send one QA Pixel event.
 const ctx=await browser.newContext({serviceWorkers:'block',
  viewport:{width:390,height:780}})
 const page=await ctx.newPage()
 page.on('console',msg=>{
  if(msg.type()==='error' && result.consoleErrors.length<12){
   const val=msg.text()
   result.consoleErrors.push(val.includes('Content Security Policy')
    ?'CSP_BLOCK':'BROWSER_CONSOLE_ERROR')
  }
 })
 page.on('pageerror',()=>{
  if(result.consoleErrors.length<12)result.consoleErrors.push('PAGE_EXCEPTION')
 })
 page.on('requestfailed',req=>{
  if(result.failedRequests.length<12){
   try{
    const url=new URL(req.url())
    result.failedRequests.push({host:url.hostname,path:url.pathname.slice(0,90),
      reason:String(req.failure()?.errorText||'network_failed').slice(0,100)})
   }catch{}
  }
 })
 const sdkState=()=>page.evaluate(()=>({
  loaded:typeof window.fbq==='function',
  callMethodType:typeof window.fbq?.callMethod,
  pushType:typeof window.fbq?.push,
  queueCount:window.fbq?.queue?.length??null,
  gpc:navigator.globalPrivacyControl===true,
  cookieNames:document.cookie.split(';').map(x=>x.trim().split('=')[0]).filter(Boolean),
  sdkScripts:[...document.scripts].filter(x=>x.src.includes('facebook.net')).length,
 }))
 let forwarded=0
 await page.route('**/*',async route=>{
  const request=route.request()
  const url=new URL(request.url())
  if(url.origin===SITE)return route.continue()
  if(url.hostname==='connect.facebook.net' &&
    request.resourceType()==='script' &&
    (url.pathname==='/en_US/fbevents.js' ||
      /^\/signals\/(config|plugins)\//.test(url.pathname)))
    return route.continue()
  if(url.hostname==='www.facebook.com' && url.pathname==='/tr/' ||
     url.hostname==='www.facebook.com' && url.pathname==='/tr'){
    const id=url.searchParams.get('id')
    const ev=url.searchParams.get('ev')
    const eid=url.searchParams.get('eid')
    const dl=url.searchParams.get('dl')||''
    const synthetic=id===DATASET && ev==='CompleteRegistration' &&
      /^https:\/\/pazo-meta-qa-20261031(?:-[^/]+)?\.vercel\.app\//.test(dl)
    const forbidden=['em','ph','external_id','user_id','first_name','last_name']
    const hasSensitiveParam=forbidden.some(k=>url.searchParams.has(k))
    const entry={datasetCorrect:id===DATASET, event:ev||null,
      eventId:eid||null,pageLocationIsQA:dl.startsWith(SITE+'/'),
      queryKeys:[...url.searchParams.keys()].sort().slice(0,36),
      sensitiveParamDetected:hasSensitiveParam,
      attempted:true,forwarded:false}
    result.inspectedPixelRequests.push(entry)
    if(synthetic && !hasSensitiveParam && forwarded===0){
      forwarded++
      entry.forwarded=true
      return route.continue()
    }
    result.externalRequestsDenied.push({host:url.hostname,path:url.pathname,reason:'unexpected_pixel_payload'})
    return route.abort('blockedbyclient')
  }
  result.externalRequestsDenied.push({host:url.hostname,path:url.pathname.slice(0,100),
    reason:'outside_qa_allowlist'})
  return route.abort('blockedbyclient')
 })
 page.on('response',resp=>{
  const u=new URL(resp.url())
  if(u.hostname==='www.facebook.com'&&u.pathname.startsWith('/tr'))
    result.metaResponseStatus=resp.status()
 })
 await page.goto(SITE+'/',{waitUntil:'domcontentloaded',timeout:30000})
 assert.equal(await page.locator('#fire').isDisabled(),true)
 await page.locator('#agree').check()
 assert.equal(await page.locator('#fire').isEnabled(),true)
 await page.locator('#fire').click()
 await page.waitForTimeout(900)
 result.sdkStateEarly=await sdkState()
 await page.waitForTimeout(5600)
 result.sdkStateLate=await sdkState()
 result.testPageStatus=(await page.locator('#status').innerText()).slice(0,350)
 const match=result.testPageStatus.match(
  /ID:\s*([a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12})/i)
 if(match)result.eventIdentifier=match[1]
 const cookies=(await ctx.cookies()).filter(c=>c.name==='_fbp'||c.name==='_fbc')
 result.cookiesAfterWithdrawal=cookies.map(c=>c.name)
 result.cookieScopeAfterWithdrawal=cookies.map(c=>({
  name:c.name,domain:c.domain,path:c.path,httpOnly:c.httpOnly,
  sameSite:c.sameSite,
 }))
 if(!result.eventIdentifier)result.errors.push('QA page did not expose a valid synthetic event ID')
 if(result.inspectedPixelRequests.length===0)
   result.status='INCONCLUSIVE_NO_PIXEL_NETWORK_REQUEST'
 else if(result.externalRequestsDenied.length>0)
   result.status='REVIEW_REQUIRED_BLOCKED_REMOTE_REQUESTS'
 else if(forwarded!==1)
   result.status='REVIEW_REQUIRED_MISSING_AUTHORIZED_PIXEL_REQUEST'
 else if(result.inspectedPixelRequests[0].eventId!==result.eventIdentifier)
   result.status='REVIEW_REQUIRED_EVENT_ID_MISMATCH'
 else if(result.cookiesAfterWithdrawal.length)
   result.status='REVIEW_REQUIRED_COOKIE_PERSISTENCE'
 else result.status='PIXEL_QA_NETWORK_REQUEST_OBSERVED_NOT_PROVIDER_DEDUP'
 await ctx.close()
}catch(err){
 result.status='INCONCLUSIVE_BROWSER_ERROR'
 result.errors.push(String(err?.message||err).slice(0,350))
 process.exitCode=1
}finally{
 if(browser)await browser.close()
 mkdirSync('artifacts/meta-qa-https',{recursive:true})
 writeFileSync(out,JSON.stringify(result,null,2))
 console.log('PAZO_QA_HTTPS_RESULT '+result.status)
 console.log('PAZO_QA_HTTPS_COUNTS initial='+result.initialMetaRequests+
  ' gpc='+result.gpcMetaRequests+' pixel='+result.inspectedPixelRequests.length+
  ' forwarded='+result.inspectedPixelRequests.filter(x=>x.forwarded).length+
  ' denied='+result.externalRequestsDenied.length+
  ' cookiesAfterWithdrawal='+result.cookiesAfterWithdrawal.length)
}
