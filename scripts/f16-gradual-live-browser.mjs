// Synthetic intercepted Auth/SQL responses only. No external connection escapes.
import assert from 'node:assert/strict'
import {createRequire} from 'node:module'
import {request} from 'node:http'
import {mkdirSync} from 'node:fs'
import {getPazoLiveOffer} from '../supabase/functions/pazo-paypal-live-checkout/liveOfferRegistry.mjs'
const require=createRequire(import.meta.url),{chromium}=require(process.env.PAZO_PLAYWRIGHT_MODULE||'playwright')
const origin=process.env.PAZO_GRADUAL_LOCAL_ORIGIN||'http://127.0.0.1:5183'
assert.match(origin,/^http:\/\/127\.0\.0\.1:\d+$/)
const out=process.env.PAZO_GRADUAL_SCREENSHOTS||'/tmp/pazo-gradual-ui';mkdirSync(out,{recursive:true})
const owner='82000000-0000-4000-8000-000000000002',other='82000000-0000-4000-8000-000000000003'
const token=id=>`${Buffer.from('{"alg":"HS256"}').toString('base64url')}.${Buffer.from(JSON.stringify({sub:id,role:'authenticated',exp:Math.floor(Date.now()/1000)+3600})).toString('base64url')}.synthetic`
const local=url=>new Promise((resolve,reject)=>{const req=request(url,res=>{const chunks=[];res.on('data',c=>chunks.push(c));res.on('end',()=>resolve({status:res.statusCode,headers:{'content-type':res.headers['content-type']||'text/plain'},body:Buffer.concat(chunks)}))});req.on('error',reject);req.end()})
const browser=await chromium.launch({headless:true,...(process.env.PAZO_CHROMIUM_PATH?{executablePath:process.env.PAZO_CHROMIUM_PATH}:{}),args:['--no-sandbox']})
let assertions=0
const check=(value,message)=>{assert.ok(value,message);assertions++}
try{
 for(const width of [390,1440])for(const lang of ['es','en']){
  const context=await browser.newContext({viewport:{width,height:844},serviceWorkers:'block'})
  let current=owner,state='not_joined',feedback=null,statusReads=0,mutations=0,creates=0,unexpected=0,adminWrites=0
  let hostedGate=false,revision=0,adminState='inactive',legacyOpen=1
  const status=()=>({source:'gradual_owner_v1',pilotStage:'L1_FIRST_REAL',campaignState:'active',revision:1,myState:state,eligible:true,myCanCheckout:state==='slot_granted',benefitsActive:state==='benefits_active',pendingVerification:['paying','payment_verifying','issue'].includes(state),feedback})
  const admin=()=>({source:'gradual_admin_v1',stage:'L1_FIRST_REAL',state:adminState,revision,capacity:1,hostedGateVerified:hostedGate,healthy:true,admitted:0,reserved:0,waiting:0,paying:0,verified:0,abandoned:0,feedbackOk:0,feedbackIssues:0,notificationsPending:0,notificationsDelivered:0,qaExcludedAccounts:8,realEligibleAccounts:0,legacyOpen,realRevenueMinor:0,courtesyIsRevenue:false,workerHealthy:true,incidents:[],audit:[]})
  await context.route('**/*',async route=>{
   const r=route.request(),url=new URL(r.url())
   if(url.origin===origin)return route.fulfill(await local(url.href))
   if(url.hostname!=='mrybvqdebbgcayuvgkkr.supabase.co'){unexpected++;return route.abort()}
   let body={};try{body=r.postDataJSON()||{}}catch{}
   let value={},code=200
   if(url.pathname.endsWith('/auth/v1/token')){current=body.email?.startsWith('switched')?other:owner;value={access_token:token(current),refresh_token:'SYNTHETIC',expires_in:3600,token_type:'bearer',user:{id:current,email:'synthetic@invalid.test',aud:'authenticated',role:'authenticated'}}}
   else if(url.pathname.endsWith('/auth/v1/user'))value={id:current,email:'synthetic@invalid.test',aud:'authenticated',role:'authenticated'}
   else if(url.pathname.endsWith('/rpc/pazo_ensure_my_profile'))value=null
   else if(url.pathname.endsWith('/rpc/pazo_gradual_my_status')){statusReads++;value=status()}
   else if(url.pathname.endsWith('/rpc/pazo_gradual_interest')){mutations++;state=body.p_action==='interest'?'waiting':body.p_action==='decline'?'declined':'withdrawn';value=status()}
   else if(url.pathname.endsWith('/rpc/pazo_gradual_feedback')){mutations++;feedback=body.p_feedback;value=true}
   else if(url.pathname.endsWith('/rpc/pazo_supporter_my_account_status'))value={active:false,milestone:0}
   else if(url.pathname.endsWith('/pazo-paypal-live-account'))value={ok:true,paidThrough:null,accounts:[],acceptances:[]}
   else if(url.pathname.endsWith('/pazo-paypal-live-checkout')){if(r.method()==='POST')creates++;if(state==='slot_granted'){value={code:'live_checkout_ready',ready:true,mayGrantBenefits:false,offer:getPazoLiveOffer(lang)}}else{code=403;value={code:'checkout_admission_denied'}}}
   else if(url.pathname.endsWith('/rpc/pazo_admin_gradual_status'))value=admin()
   else if(url.pathname.endsWith('/pazo-admin-gradual-live')){adminWrites++;revision++;adminState='active';value={code:'updated',revision,mayCharge:false}}
   else{unexpected++;return route.abort()}
   return route.fulfill({status:code,contentType:'application/json',body:JSON.stringify(value)})
  })
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message))
  await page.goto(origin+`/supabase/tests/gradual/browser-harness.html?case=account&lang=${lang}`)
  const join=page.getByRole('button',{name:lang==='es'?'Quiero participar':'I want to participate'})
  await join.waitFor({timeout:12000}).catch(async e=>{await page.screenshot({path:out+'/failure.png',fullPage:true});console.error({errors,body:(await page.locator('body').innerText()).slice(0,4000),unexpected,statusReads});throw e});check(await join.isVisible(),'denied checkout must not hide the interest queue')
  await join.click();await page.locator('[data-pazo-gradual-state="waiting"]').waitFor()
  check(mutations===1&&creates===0,'joining creates interest only')
  state='slot_granted';const before=statusReads;await page.evaluate(()=>window.dispatchEvent(new Event('online')))
  await page.locator('[data-pazo-gradual-state="slot_granted"]').waitFor();check(statusReads>before,'reconnect must read current server state')
  await page.getByRole('checkbox').waitFor();check(creates===0,'grant refreshes checkout terms without starting PayPal')
  await page.screenshot({path:`${out}/${width}-${lang}-account.png`,fullPage:true})
  // Direct component exercises every authoritative state without financial writes.
  for(const next of ['paying','payment_verifying','issue','benefits_active']){
   state=next;await page.goto(origin+`/supabase/tests/gradual/browser-harness.html?lang=${lang}`)
   await page.locator(`[data-pazo-gradual-state="${next}"]`).waitFor()
   check(await page.getByRole('button',{name:lang==='es'?'Quiero participar':'I want to participate'}).count()===0,'pending/paid state cannot invite a new checkout')
  }
  await page.getByRole('button',{name:lang==='es'?'Omitir':'Skip',exact:true}).click()
  await page.getByText(lang==='es'?'Tu respuesta quedó registrada.':'Your response is recorded.',{exact:false}).waitFor();check(creates===0,'feedback never creates or changes a payment')
  state='not_joined';feedback=null;await page.evaluate(()=>window.fixtureSignIn())
  await page.locator('[data-pazo-gradual-state="not_joined"]').waitFor()
  check(await page.getByText(lang==='es'?'Tu pago y tus beneficios están verificados.':'Your payment and benefits are verified.',{exact:true}).count()===0,'account switch clears prior owner benefits')
  await page.goto(origin+`/supabase/tests/gradual/browser-harness.html?case=admin&lang=${lang}`)
  const confirm=page.getByRole('button',{name:lang==='es'?'Confirmar operación':'Confirm operation'})
  await confirm.waitFor();
  for(const [label,count] of [[lang==='es'?'Cuentas QA excluidas':'Excluded QA accounts',8],[lang==='es'?'Cuentas reales elegibles':'Eligible real accounts',0]]){
   const value=await page.locator('dl > div').filter({has:page.getByText(label,{exact:true})}).locator('dd').textContent();check(Number(value)===count,'QA and real counts remain distinct')
  }
  check(await confirm.isDisabled(),'admin gate and fresh MFA required')
  await page.getByRole('button',{name:'Fixture MFA'}).click();check(await confirm.isDisabled(),'MFA alone cannot bypass hosted gate')
  hostedGate=true;await page.getByRole('button',{name:lang==='es'?'Consultar estado autoritativo':'Read authoritative state'}).click()
  check(await confirm.isDisabled(),'hosted gate and MFA cannot bypass unresolved original contract')
  legacyOpen=0;await page.getByRole('button',{name:lang==='es'?'Consultar estado autoritativo':'Read authoritative state'}).click()
  await page.getByRole('checkbox').check();await confirm.click()
  await page.getByText('L1_FIRST_REAL · active',{exact:true}).waitFor();check(adminWrites===1,'one nonce mutation after explicit confirmation')
  check(await page.getByRole('option',{name:/pública|public release/}).count()===0,'public GO hidden before completion')
  check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'mobile layout must fit viewport')
  await page.screenshot({path:`${out}/${width}-${lang}-admin.png`,fullPage:true})
  check(errors.length===0,`runtime errors: ${errors.join(',')}`);check(unexpected===0,'all external traffic must be accounted for');check(creates===0,'browser checks must never CREATE')
  await context.close()
 }
 console.log(`PASS ${assertions} gradual browser assertions: ES/EN, mobile/desktop, full account queue, server recovery, isolation, admin gates; zero payment CREATE`)
}finally{await browser.close()}
