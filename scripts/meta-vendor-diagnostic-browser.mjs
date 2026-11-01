// PAZO #169 — why does the authentic Pixel SDK emit no /tr in CI?
// Matrix of bootstrap and browser variants. Every page is fulfilled locally on
// the QA hostname, so Vercel is never contacted. Only official static SDK files
// may be downloaded; every event, beacon and unknown request is ABORTED.
// No PAZO site, user data, secrets, Graph API or delivered event.
import {mkdirSync,writeFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {createRequire} from 'node:module'
const {chromium}=createRequire(import.meta.url)('playwright')
const SITE='https://pazo-meta-qa-20261031.vercel.app'
const DATASET='1090116830295088'
const EVENT='11111111-2222-4333-8444-555555555555'
const SDK='https://connect.facebook.net/en_US/fbevents.js'
const OUT='artifacts/meta-vendor-diagnostic'
const WAIT_MS=6000
const UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36'
const bootstraps={
 // Vendor documented order: queued init + queued event, consent untouched.
 official_track_queued:{commands:[['init',DATASET],
  ['track','CompleteRegistration',{},{eventID:EVENT}]],after:[]},
 official_tracksingle_queued:{commands:[['init',DATASET],
  ['trackSingle',DATASET,'CompleteRegistration',{},{eventID:EVENT}]],after:[]},
 official_tracksingle_after_load:{commands:[['init',DATASET]],
  after:[['trackSingle',DATASET,'CompleteRegistration',{},{eventID:EVENT}]]},
 autoconfig_off:{commands:[['set','autoConfig',false,DATASET],['init',DATASET]],
  after:[['trackSingle',DATASET,'CompleteRegistration',{},{eventID:EVENT}]]},
 // Revoke + grant around the event, without autoConfig.
 consent_cycle:{commands:[['consent','revoke'],['init',DATASET]],
  after:[['consent','grant'],
   ['trackSingle',DATASET,'CompleteRegistration',{},{eventID:EVENT}]]},
 // The candidate loader's order.
 candidate_order:{commands:[['consent','revoke'],
  ['set','autoConfig',false,DATASET],['init',DATASET]],disablePushState:true,
  after:[['consent','grant'],
   ['trackSingle',DATASET,'CompleteRegistration',{},{eventID:EVENT}]]},
 // Candidate order, but allow the dataset config to arrive before the event.
 candidate_delayed_event:{commands:[['consent','revoke'],
  ['set','autoConfig',false,DATASET],['init',DATASET]],disablePushState:true,
  after:[['consent','grant']],delayed:[
   ['trackSingle',DATASET,'CompleteRegistration',{},{eventID:EVENT}]]},
}
const browsers={
 headless_default:{launch:{headless:true,args:['--no-sandbox']},context:{}},
 automation_flag_off:{launch:{headless:true,
  args:['--no-sandbox','--disable-blink-features=AutomationControlled']},
  context:{userAgent:UA},hideWebdriver:true},
}
const page=(spec)=>`<!doctype html><html><head><meta charset="utf-8"><title>PAZO QA</title></head><body><h1>PAZO QA synthetic</h1><script>
(async()=>{
 const spec=${JSON.stringify(spec)};
 const stub=function(){stub.callMethod?stub.callMethod.apply(stub,arguments):stub.queue.push(arguments)};
 stub.queue=[];stub.loaded=true;stub.version='2.0';stub.push=stub;
 if(spec.disablePushState)stub.disablePushState=true;
 window.fbq=stub;window._fbq=stub;
 for(const c of spec.commands)stub(...c);
 await new Promise((ok,no)=>{const s=document.createElement('script');s.async=true;
  s.src=${JSON.stringify(SDK)};s.onload=ok;s.onerror=no;document.head.appendChild(s)});
 for(const c of spec.after)stub(...c);
 window.__after=true;
 if(spec.delayed){await new Promise(r=>setTimeout(r,2500));for(const c of spec.delayed)stub(...c)}
 window.__done=true;
})().catch(()=>{window.__failed=true});
</script></body></html>`
const result={status:'NOT_RUN',eventsDelivered:0,variants:[],sdkFiles:[],
 limits:['All event requests were aborted; nothing reached Meta',
  'A request attempt is not provider reception or deduplication',
  'CI runner only; no real browser, IP or user involved']}
const saved=new Map()
let browser
try{
 mkdirSync(OUT+'/sdk',{recursive:true})
 for(const [browserName,profile] of Object.entries(browsers)){
  browser=await chromium.launch(profile.launch)
  for(const [name,spec] of Object.entries(bootstraps)){
   const ctx=await browser.newContext({serviceWorkers:'block',...profile.context})
   if(profile.hideWebdriver)await ctx.addInitScript(()=>
    Object.defineProperty(navigator,'webdriver',{configurable:true,get:()=>undefined}))
   const tab=await ctx.newPage()
   const variant={browser:browserName,bootstrap:name,eventAttempts:[],otherAttempts:[],
    sdkAssets:[],consoleErrors:[],pageErrors:0}
   tab.on('pageerror',()=>{variant.pageErrors++})
   tab.on('console',m=>{if(m.type()==='error'&&variant.consoleErrors.length<6)
    variant.consoleErrors.push(m.text().slice(0,160).replace(/https?:\S+/g,'<url>'))})
   await tab.route('**/*',async route=>{
    const req=route.request(),url=new URL(req.url())
    if(url.origin===SITE&&url.pathname==='/')return route.fulfill({status:200,
     contentType:'text/html; charset=utf-8',body:page(spec)})
    if(url.hostname==='connect.facebook.net'&&req.resourceType()==='script'
     &&(url.pathname==='/en_US/fbevents.js'||/^\/signals\/(config|plugins)\//.test(url.pathname))){
     try{
      const res=await route.fetch({timeout:15000,maxRedirects:0})
      const body=await res.body()
      const sha=createHash('sha256').update(body).digest('hex')
      variant.sdkAssets.push({path:url.pathname.slice(0,80),status:res.status(),bytes:body.length})
      if(!saved.has(url.pathname)){
       const file=url.pathname.replace(/[^a-zA-Z0-9.]+/g,'_')
       saved.set(url.pathname,{file,sha256:sha,bytes:body.length,query:[...url.searchParams.keys()].sort()})
       writeFileSync(OUT+'/sdk/'+file,body)
      }
      return route.fulfill({response:res})
     }catch{return route.abort('blockedbyclient')}
    }
    const entry={host:url.hostname,path:url.pathname.slice(0,80),type:req.resourceType(),
     method:req.method(),queryKeys:[...url.searchParams.keys()].sort().slice(0,40)}
    if(url.hostname.endsWith('facebook.com')&&url.pathname.startsWith('/tr')){
     entry.ev=(url.searchParams.get('ev')||'').slice(0,40)
     entry.datasetMatches=url.searchParams.get('id')===DATASET
     entry.eidMatches=url.searchParams.get('eid')===EVENT
     variant.eventAttempts.push(entry)
    }else variant.otherAttempts.push(entry)
    return route.abort('blockedbyclient')
   })
   await tab.goto(SITE+'/',{waitUntil:'domcontentloaded',timeout:30000})
   await tab.waitForTimeout(WAIT_MS)
   variant.state=await tab.evaluate(()=>({
    done:window.__done===true,failed:window.__failed===true,
    callMethod:typeof window.fbq?.callMethod,
    webdriver:navigator.webdriver===true,
    cookies:document.cookie.split(';').map(x=>x.trim().split('=')[0]).filter(Boolean).sort(),
    pixels:(()=>{try{return window.fbq.getState().pixels.map(p=>({
     idMatches:p.id==='1090116830295088',eventCount:p.eventCount,
     autoConfig:p.autoConfig ?? null,userDataKeys:Object.keys(p.userData||{})}))}
     catch{return 'unavailable'}})(),
    pluginsLoaded:(()=>{try{return Object.keys(window.fbq.getState().pluginConfig||{})}catch{return null}})(),
   }))
   variant.completeRegistrationAttempts=variant.eventAttempts.filter(x=>x.ev==='CompleteRegistration').length
   result.variants.push(variant)
   await ctx.close()
  }
  await browser.close();browser=null
 }
 result.sdkFiles=[...saved.values()]
 const hit=result.variants.filter(v=>v.completeRegistrationAttempts>0)
 result.status=hit.length===0?'NO_VARIANT_EMITTED':
  hit.length===result.variants.length?'ALL_VARIANTS_EMITTED':'VARIANT_DEPENDENT'
}catch(error){
 result.status='DIAGNOSTIC_ERROR'
 result.error=String(error?.message||error).slice(0,300)
 process.exitCode=1
}finally{
 if(browser)await browser.close()
 mkdirSync(OUT,{recursive:true})
 writeFileSync(OUT+'/OBSERVATIONS.json',JSON.stringify(result,null,2))
 console.log('META_VENDOR_DIAGNOSTIC '+result.status)
 for(const v of result.variants)console.log(['META_VENDOR_VARIANT',v.browser,v.bootstrap,
  'cr='+v.completeRegistrationAttempts,'tr='+v.eventAttempts.length,
  'other='+v.otherAttempts.length,'assets='+v.sdkAssets.length,
  'done='+v.state?.done,'cookies='+(v.state?.cookies||[]).join('+')].join(' '))
}
