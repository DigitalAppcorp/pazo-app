// Real browser modules on the production hostname through a local proxy. Provider, Edge and Auth are doubles; no hosted request leaves.
import assert from 'node:assert/strict'
import {createRequire} from 'node:module'
import {createServer} from 'vite'
const require=createRequire(import.meta.url),{chromium}=require(process.env.PAZO_PLAYWRIGHT_MODULE||'../../continuidad/f18-browser-tools/node_modules/playwright')
Object.assign(process.env,{VITE_SUPABASE_URL:'https://mrybvqdebbgcayuvgkkr.supabase.co',VITE_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_synthetic',VITE_PAZO_MARKETING_TURNSTILE_SITE_KEY:'synthetic_site_key_only_0001',VITE_PAZO_EXPERIENCE_DETAILS_ENABLED:'true',VITE_PAZO_CAMPAIGN_EXPERIENCE_ENABLED:'true'})
const server=await createServer({logLevel:'error',server:{host:'127.0.0.1',port:5372,strictPort:true}})
await server.listen()
const browser=await chromium.launch({headless:true,...(process.env.PAZO_CHROMIUM_PATH?{executablePath:process.env.PAZO_CHROMIUM_PATH}:{channel:process.platform==='win32'?'msedge':undefined})})
const escaped=[];let checks=0;const check=(ok,name)=>{assert.ok(ok,name);checks++}
const open=async({path='/blank',referer,gpc=false}={})=>{
 const context=await browser.newContext({serviceWorkers:'block'}),sent=[]
 await context.addInitScript(({gpc})=>{
  Object.defineProperty(navigator,'webdriver',{get:()=>false})
  Object.defineProperty(navigator,'globalPrivacyControl',{get:()=>gpc})
  window.turnstile={render:(el,o)=>{window.__cb=o.callback;return 'id'},execute:()=>window.__cb('synthetic-token'),remove:()=>{}}
 },{gpc})
 await context.route('**/*',async route=>{
  const url=new URL(route.request().url())
  if(url.pathname.endsWith('/functions/v1/pazo-marketing-landing')){if(route.request().method()==='POST')sent.push({body:JSON.parse(route.request().postData()),keepalive:route.request().headers()['x-pazo-challenge']});return route.fulfill({status:202,headers:{'access-control-allow-origin':'*','access-control-allow-headers':'*'},contentType:'application/json',body:'{"status":"aggregated"}'})}
  if(url.hostname==='pazo-app.vercel.app'){
   if(url.pathname==='/blank')return route.fulfill({contentType:'text/html',body:'<!doctype html><title>QA</title><body></body>'})
   const response=await route.fetch({url:'http://127.0.0.1:5372'+url.pathname+url.search});return route.fulfill({response})
  }
  if(url.hostname!=='127.0.0.1'&&url.hostname!=='www.google.com'){escaped.push(url.hostname);return route.abort()}
  if(url.hostname==='www.google.com')return route.fulfill({contentType:'text/html',body:'<a id="go" href="https://pazo-app.vercel.app/blank">go</a>'})
  return route.continue()
 })
 const page=await context.newPage()
 if(referer){await page.goto(referer);await page.click('#go');await page.waitForURL('https://pazo-app.vercel.app/blank')}else await page.goto('https://pazo-app.vercel.app'+path)
 return {context,page,sent,load:()=>page.evaluate(()=>import('/src/features/marketing/experienceDetails.ts').then(m=>{window.__d=m}))}
}
const settle=page=>page.waitForTimeout(600)
try{
 { // Signup reason, closed category, only once.
  const {context,page,sent,load}=await open();await load()
  await page.evaluate(()=>{__d.observeSignupFailure('age_required');__d.observeSignupFailure('age_required');__d.observeSignupFailureCode('user_already_exists');__d.observeDetail('signup_failure','mi correo a@b.c')});await settle(page)
  check(sent.length===2,'one per category, free text never sent')
  check(sent.some(x=>x.body.detail_value==='age_required')&&sent.some(x=>x.body.detail_value==='email_taken'),'closed reasons sent')
  check(sent.every(x=>Object.keys(x.body).sort().join()==='detail_kind,detail_value'),'body holds only the category')
  await context.close()
 }
 { // Ad comes along only when validated.
  const {context,page,sent,load}=await open({path:'/blank?utm_source=meta&utm_medium=paid_social&utm_campaign=pazo_la_en_202611&utm_content=qr_v2_en'});await load()
  await page.evaluate(()=>__d.observeSignupFailure('network'));await settle(page)
  check(sent[0].body.utm_content==='qr_v2_en','validated ad included')
  await context.close()
  const forged=await open({path:'/blank?utm_source=meta&utm_medium=paid_social&utm_campaign=x&utm_content=hack'});await forged.load()
  await forged.page.evaluate(()=>__d.observeSignupFailure('network'));await settle(forged.page)
  check(Object.keys(forged.sent[0].body).length===2,'forged ad dropped')
  await forged.context.close()
 }
 { // Tab sent to background reports the last Demo screen once, with a token already in hand.
  const {context,page,sent,load}=await open();await load()
  await page.evaluate(()=>{__d.trackDemoScreen('home');__d.trackDemoScreen('pet')});await settle(page)
  check(sent.length===0,'nothing sent while using the Demo')
  await page.evaluate(()=>{Object.defineProperty(document,'visibilityState',{configurable:true,get:()=>'hidden'});document.dispatchEvent(new Event('visibilitychange'));document.dispatchEvent(new Event('visibilitychange'))});await settle(page)
  check(sent.length===1&&sent[0].body.detail_value==='pet'&&sent[0].body.detail_kind==='demo_last_screen','last screen sent once')
  check(sent[0].keepalive==='synthetic-token','prepared token used')
  await context.close()
 }
 { // Explicit exit reports it too and stops listening.
  const {context,page,sent,load}=await open();await load()
  await page.evaluate(()=>__d.trackDemoScreen('places'));await settle(page)
  await page.evaluate(()=>__d.finishDemoTracking());await settle(page)
  check(sent.length===1&&sent[0].body.detail_value==='places','explicit exit counted')
  await page.evaluate(()=>{Object.defineProperty(document,'visibilityState',{configurable:true,get:()=>'hidden'});document.dispatchEvent(new Event('visibilitychange'))});await settle(page)
  check(sent.length===1,'no second report after exit')
  await context.close()
 }
 { // Referrer becomes a category, once per tab.
  const {context,page,sent,load}=await open({referer:'https://www.google.com/search?q=mi+perro'});await load()
  await page.evaluate(()=>{__d.observeArrivalSource();__d.observeArrivalSource()});await settle(page)
  check(sent.length===1&&sent[0].body.detail_value==='search','referrer reduced to search')
  check(!JSON.stringify(sent).includes('google')&&!JSON.stringify(sent).includes('perro'),'address never sent')
  await context.close()
  const direct=await open();await direct.load()
  await direct.page.evaluate(()=>__d.observeArrivalSource());await settle(direct.page)
  check(direct.sent[0].body.detail_value==='direct','no referrer is direct')
  await direct.context.close()
 }
 { // GPC and the local exclusion stop everything.
  const {context,page,sent,load}=await open({gpc:true});await load()
  await page.evaluate(()=>{__d.observeSignupFailure('network');__d.observeArrivalSource();__d.trackDemoScreen('home');__d.finishDemoTracking()});await settle(page)
  check(sent.length===0,'GPC sends nothing')
  await context.close()
  const excluded=await open();await excluded.load()
  await excluded.page.evaluate(()=>import('/src/features/marketing/analyticsPreference.ts').then(m=>m.setAnalyticsExcluded?.(true)??localStorage.setItem('pazo_analytics_excluded_v1','1')))
  await excluded.page.reload();await excluded.load()
  await excluded.page.evaluate(()=>{__d.observeSignupFailure('network');__d.observeArrivalSource()});await settle(excluded.page)
  check(excluded.sent.length===0,'local exclusion sends nothing')
  await excluded.context.close()
 }
 check(escaped.length===0,'no other host contacted: '+escaped.join())
 console.log(JSON.stringify({status:'PASS',checks,hostedRequests:escaped.length,doubles:'Turnstile, Edge'}))
}finally{await browser.close();await server.close()}
