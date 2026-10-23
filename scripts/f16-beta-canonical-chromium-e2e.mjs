// PAZO beta: real, read-only Chromium smoke against deployed canonical HTTPS.
// Public signup is inspected without submission. Synthetic PayPal return tokens
// never hit a provider API, no account/payment/secret is created or logged.
import {createRequire} from 'node:module'
import {mkdir} from 'node:fs/promises'
const require=createRequire(import.meta.url)
const {chromium}=require(process.env.PAZO_PLAYWRIGHT_MODULE||'playwright')

const ORIGIN='https://pazo-app.vercel.app'
const SENTINEL='PAZO_NONPAYMENT_CALLBACK_PROBE'
const checks=[]
const failures=[]
function check(id,ok){
 checks.push({id,code:ok?'pass':'fail'})
 if(!ok)failures.push(id)
}
const invalidProviderSideEffect=url=>
 /paypal\.com\/v1\/|\/billing\/subscriptions(?:\/|\?|$)/i.test(url)
async function waitForWelcome(page){
 await page.goto(ORIGIN+'/',{waitUntil:'domcontentloaded',timeout:30000})
 await page.getByRole('button',{name:/^(Comenzar|Get started)$/}).waitFor({state:'visible',timeout:30000})
 await page.waitForLoadState('networkidle',{timeout:12000}).catch(()=>{})
}
const output=process.env.PAZO_CANONICAL_SCREENSHOTS
if(output)await mkdir(output,{recursive:true})
const browser=await chromium.launch({headless:true,args:['--no-sandbox'],
 ...(process.env.PAZO_CHROMIUM_PATH?{executablePath:process.env.PAZO_CHROMIUM_PATH}:{}),
 ...(process.env.HTTPS_PROXY?{proxy:{server:process.env.HTTPS_PROXY}}:{})})
try{
 for(const [sizeName,size] of Object.entries({mobile:{width:390,height:844},desktop:{width:1440,height:900}}))for(const lang of ['es','en']){
  const kind=sizeName+'_'+lang
  const context=await browser.newContext({viewport:size,deviceScaleFactor:sizeName==='mobile'?2:1,
   isMobile:sizeName==='mobile',hasTouch:sizeName==='mobile',locale:'es-US',
   serviceWorkers:'allow'})
  const page=await context.newPage()
  const pageErrors=[]
  const unwantedPost=[]
  page.on('pageerror',err=>pageErrors.push(err.name||'pageerror'))
  page.on('request',request=>{
   if(request.method()!=='GET'&&request.method()!=='HEAD'&&
      invalidProviderSideEffect(request.url()))unwantedPost.push('provider_write')
  })
  try{
   await waitForWelcome(page)
   if(lang==='en'){await page.getByRole('button',{name:'Cambiar a inglés',exact:true}).click();await page.getByRole('button',{name:'Get started',exact:true}).waitFor()}
   if(output)await page.screenshot({path:output+'/'+kind+'-welcome.png',fullPage:true})
   check(kind+'_react_welcome',Boolean(await page.locator('#root').textContent())&&
    await page.getByRole('button',{name:/^(Comenzar|Get started)$/}).count()===1)
   const layout=await page.evaluate(()=>({document:document.documentElement.scrollWidth,
    viewport:document.documentElement.clientWidth}))
   check(kind+'_no_horizontal_overflow',layout.document<=layout.viewport+5)
   await page.getByRole('button',{name:/^(Comenzar|Get started)$/}).click()
   await page.getByRole('button',{name:/^(Crear cuenta|Create account)$/}).waitFor({timeout:10000})
   const age=page.getByRole('checkbox',{name:/18 (años|or older)/i})
   check(kind+'_age_consent_unchecked',await age.count()===1&&!(await age.isChecked()))
   check(kind+'_signup_email_available',await page.locator('input[type="email"]').count()===1)
   // On PR branches Chromium visits the already-deployed (older) production
   // build. Enforce the accessible input after that updated build is deployed.
   if(process.env.PAZO_E2E_AUTH_LABELS_DEPLOYED==='true')
    check(kind+'_signup_email_accessible_name',
     await page.getByRole('textbox',{name:/Correo electrónico|Email/i}).count()===1)
   // No form submit, age toggle, login, password or user data.
   const legal=page.getByRole('button',{name:/Política de privacidad|Privacy policy/})
   check(kind+'_legal_discoverable',await legal.count()>=1)
   await page.getByRole('button',{name:/Ya tienes cuenta\? Iniciar sesión|Already have an account\? Sign in/i}).click()
   await page.getByRole('heading',{name:/Iniciar Sesión|Log in to Pazo/i}).waitFor({state:'visible',timeout:10000})
   if(process.env.PAZO_E2E_AUTH_LABELS_DEPLOYED==='true'){
    check(kind+'_login_email_accessible_name',
     await page.getByRole('textbox',{name:/Correo electrónico|Email address/i}).count()===1)
    check(kind+'_login_password_accessible_name',
     await page.getByLabel(/Contraseña|Password/i).count()===1)
   }
   await page.getByRole('button',{name:/Olvidaste tu contraseña\?|Forgot your password\?/i}).click()
   check(kind+'_password_recovery_discoverable',
    await page.getByRole('heading',{name:/Recuperar contraseña|Reset your password/i}).count()===1)
   check(kind+'_no_js_crashes',pageErrors.length===0)
   check(kind+'_no_paypal_write',unwantedPost.length===0)
  }catch(e){check(kind+'_runtime',false)}
  finally{await context.close()}
 }
 // Inspect return/cancel in fresh unauthenticated contexts without a live token.
 for(const path of ['/paypal/return?ba_token='+SENTINEL,
   '/paypal/cancel?token='+SENTINEL]){
  const key=path.includes('cancel')?'cancel':'return'
  const context=await browser.newContext({viewport:{width:390,height:844},
   isMobile:true,hasTouch:true,serviceWorkers:'allow'})
  const page=await context.newPage()
  const errors=[]
  page.on('pageerror',err=>errors.push(err.name||'pageerror'))
  try{
   const response=await page.goto(ORIGIN+path,{waitUntil:'domcontentloaded',timeout:30000})
   await page.getByRole('button',{name:/^(Comenzar|Get started|Iniciar Sesión|Log in)$/}).first().waitFor({state:'visible',timeout:30000})
   await page.waitForFunction(v=>!window.location.href.includes(v),SENTINEL,{timeout:12000})
   check('callback_'+key+'_sanitizes_url',!page.url().includes(SENTINEL))
   check('callback_'+key+'_spa_hydrates',response?.status()===200&&
    (await page.locator('#root').textContent())?.length>0)
   check('callback_'+key+'_no_js_crashes',errors.length===0)
  }catch(e){check('callback_'+key+'_runtime',false)}
  finally{await context.close()}
 }
 // A network-only service worker is not the same as installing to a phone;
 // verify browser registration as a separate, narrowly-scoped gate.
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,
  hasTouch:true,serviceWorkers:'allow'})
 try{
  const page=await context.newPage()
  await waitForWelcome(page)
  const pwa=await page.evaluate(async()=>{
   if(!('serviceWorker' in navigator))return false
   try{
    const registration=await Promise.race([navigator.serviceWorker.ready,
      new Promise((_,reject)=>setTimeout(()=>reject(Error('sw_timeout')),12000))])
    const all=await navigator.serviceWorker.getRegistrations()
    const stores=await caches.keys()
    return registration.scope===window.location.origin+'/'&&all.length>=1&&stores.length===0
   }catch{return false}
  })
  check('real_chromium_network_only_sw_registered',pwa)
 }catch{check('real_chromium_pwa_runtime',false)}
 finally{await context.close()}
}finally{await browser.close()}
const result={source:'pazo_beta_canonical_chromium_e2e_v1',origin:ORIGIN,
 ready:failures.length===0,checks,failed:failures}
process.stdout.write(JSON.stringify(result,null,2)+'\n')
if(!result.ready)process.exitCode=1
