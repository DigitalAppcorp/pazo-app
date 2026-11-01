// #172 Actual React/Auth code in Chromium. Auth and Data API are intercepted, and
// everything else is aborted, so production and Google are never contacted.
// This proves PAZO's journey, NOT that Google or hosted Supabase work.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {createRequire} from 'node:module'
import {createServer} from 'vite'
const require=createRequire(import.meta.url)
const {chromium}=require(process.env.PAZO_PLAYWRIGHT_MODULE||'../../continuidad/f18-browser-tools/node_modules/playwright')
const out=path.resolve(process.env.PAZO_GOOGLE_OUTPUT||'artifacts/google-auth')
fs.mkdirSync(out,{recursive:true})
const SUPABASE='https://mrybvqdebbgcayuvgkkr.supabase.co'
const PORT=5398,ORIGIN='http://127.0.0.1:'+PORT
const CAMPAIGN='?utm_source=meta&utm_medium=paid_social&utm_campaign=pazo_beta_local_202610&utm_content=perfil_en'
const OWNER='17200000-0000-4000-8000-000000000001'
const OLD='2026-01-01T00:00:00Z'
const jwt=()=>[{alg:'HS256',typ:'JWT'},{sub:OWNER,role:'authenticated',aud:'authenticated',
 exp:Math.floor(Date.now()/1000)+3600,iat:Math.floor(Date.now()/1000),session_id:OWNER},
 'synthetic'].map(x=>Buffer.from(typeof x==='string'?x:JSON.stringify(x)).toString('base64url')).join('.')
const user=({providers=['google'],created=new Date(Date.now()-5000).toISOString(),attested=false}={})=>({
 id:OWNER,aud:'authenticated',role:'authenticated',email:'synthetic@example.invalid',
 created_at:created,email_confirmed_at:created,last_sign_in_at:created,updated_at:created,
 app_metadata:{provider:providers[0],providers},
 user_metadata:{email_verified:true,...(attested?{pazo_adult_attested_at:OLD}:{})},identities:[],
})
const evidence=[]
const pass=name=>{evidence.push({name,status:'PASS'});console.log('GOOGLE_AUTH_PASS '+name)}
async function open(browser,{locale='es-ES',viewport={width:390,height:780},account,oauth='success',start='/'}={}){
 const ctx=await browser.newContext({locale,viewport,serviceWorkers:'block'})
 const page=await ctx.newPage()
 const s={authorize:[],updates:[],profile:0,attribution:0,logout:0,password:0,leaks:[],remote:[],account,token:jwt(),errors:[]}
 page.on('pageerror',e=>s.errors.push(String(e.message).slice(0,160)))
 page.on('request',r=>{
  // Tokens may only travel in the Authorization header to Supabase.
  const blob=r.url()+' '+(r.postData()||'')
  if(blob.includes(s.token)||blob.includes('synthetic-refresh'))s.leaks.push(new URL(r.url()).origin+new URL(r.url()).pathname)
 })
 await ctx.route('**/*',async route=>{
  const req=route.request(),url=new URL(req.url())
  if(url.origin===ORIGIN)return route.continue()
  if(url.origin!==SUPABASE){s.remote.push(url.hostname);return route.abort('blockedbyclient')}
  const cors={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'*'}
  const json=(body,status=200)=>route.fulfill({status,headers:cors,contentType:'application/json',body:JSON.stringify(body)})
  if(req.method()==='OPTIONS')return route.fulfill({status:204,headers:cors})
  if(url.pathname==='/auth/v1/authorize'){
   s.authorize.push(Object.fromEntries(url.searchParams))
   const back=url.searchParams.get('redirect_to')
   const target=oauth==='success'
    ?back+`#access_token=${s.token}&expires_at=${Math.floor(Date.now()/1000)+3600}&expires_in=3600&refresh_token=synthetic-refresh&token_type=bearer`
    :back+`&error=${oauth}&error_description=PROVIDER_SECRET_TEXT`
   return route.fulfill({status:200,contentType:'text/html',body:`<script>location.replace(${JSON.stringify(target)})</script>`})
  }
  if(url.pathname==='/auth/v1/user'&&req.method()==='PUT'){
   const body=req.postDataJSON()
   s.updates.push(body)
   s.account={...s.account,user_metadata:{...s.account.user_metadata,...body.data}}
   return json(s.account)
  }
  if(url.pathname==='/auth/v1/user')return json(s.account)
  if(url.pathname==='/auth/v1/logout'){s.logout++;return route.fulfill({status:204,headers:cors})}
  if(url.pathname==='/auth/v1/token'){
   s.password++
   return json({access_token:s.token,refresh_token:'synthetic-refresh',token_type:'bearer',expires_in:3600,
    expires_at:Math.floor(Date.now()/1000)+3600,user:s.account})
  }
  if(url.pathname==='/rest/v1/rpc/pazo_ensure_my_profile'){s.profile++;return json(null)}
  if(url.pathname==='/rest/v1/rpc/pazo_meta_consent_available')return json(s.metaAvailable??true)
  if(url.pathname==='/functions/v1/pazo-marketing-attribution'){s.attribution++;return json({status:'accepted'},202)}
  if(url.pathname==='/functions/v1/pazo-meta-grant'){s.grants=(s.grants||0)+1;return json({status:'granted'})}
  if(url.pathname==='/functions/v1/pazo-meta-receipt'){s.receipts=(s.receipts||0)+1;return json({status:'ready',eventId:'11111111-2222-4333-8444-555555555555',datasetId:'1438916858347709',eventTime:Math.floor(Date.now()/1000)})}
  if(url.pathname==='/functions/v1/pazo-meta-consent'){s.withdraws=(s.withdraws||0)+1;return json({status:'withdrawn'})}
  if(url.pathname.startsWith('/functions/v1/'))return json({status:'accepted'},202)
  return json([])
 })
 await page.goto(ORIGIN+start,{waitUntil:'domcontentloaded'})
 return {ctx,page,s}
}
const finish=async({ctx,s})=>{
 assert.deepEqual(s.leaks,[],'tokens must never appear in a URL or request body')
 assert.ok(!s.remote.some(h=>/accounts.google|facebook/.test(h)),'no Google or Meta traffic')
 assert.deepEqual(s.errors,[],'no page exceptions')
 await ctx.close()
}
const signupScreen=async(page,lang='es')=>{
 await page.getByRole('button',{name:lang==='es'?'Comenzar':'Get started'}).click()
 await page.getByText(lang==='es'?'Comencemos.':'Let’s get started.').waitFor()
}
const loginScreen=async(page,lang='es')=>{
 await page.getByRole('button',{name:lang==='es'?'Ya tengo una cuenta':'I already have an account'}).click()
 await page.locator('#pazo-login-email').waitFor()
}
const google=(page,lang='es')=>page.getByRole('button',{name:lang==='es'?'Continuar con Google':'Continue with Google'})
const cleanUrl=page=>{const u=new URL(page.url());assert.equal(u.search+u.hash,'','URL must be clean after return')}
const gateHeading=page=>page.getByRole('heading',{name:/Una última confirmación|One last confirmation/})
const until=async(check,message)=>{
 for(let i=0;i<40;i++){if(check())return;await new Promise(r=>setTimeout(r,100))}
 assert.fail(message)
}
const noOverflow=async(page,name)=>assert.equal(await page.evaluate(()=>
 document.documentElement.scrollWidth>document.documentElement.clientWidth),false,name+': horizontal overflow')
const zeroOutline=async(locator,name)=>{
 await locator.focus()
 const style=await locator.evaluate(el=>{const c=getComputedStyle(el);return {border:c.borderTopWidth,outline:c.outlineStyle}})
 assert.equal(style.border,'0px',name+' border')
 assert.equal(style.outline,'none',name+' outline')
}

process.env.VITE_SUPABASE_URL=SUPABASE
process.env.VITE_SUPABASE_PUBLISHABLE_KEY='sb_publishable_synthetic'
let browser,server
try{
 browser=await chromium.launch({headless:true,args:['--no-sandbox']})
 // Build OFF: today's public behavior stays exactly as it is.
 process.env.VITE_PAZO_GOOGLE_AUTH_ENABLED='false'
 server=await createServer({server:{host:'127.0.0.1',port:PORT,strictPort:true},logLevel:'error'});await server.listen()
 {const v=await open(browser,{account:user()})
  await signupScreen(v.page)
  await v.page.getByText('Google · próximamente').waitFor()
  assert.equal(await google(v.page).count(),0)
  await v.page.getByText('Apple · próximamente').waitFor()
  await v.ctx.close()
  const w=await open(browser,{account:user()})
  await loginScreen(w.page)
  assert.equal(await google(w.page).count(),0)
  await w.ctx.close()
  pass('off_build_keeps_coming_soon_and_no_login_cta')}
 await server.close()

 process.env.VITE_PAZO_META_ENABLED='true'
 process.env.VITE_PAZO_GOOGLE_AUTH_ENABLED='true'
 server=await createServer({server:{host:'127.0.0.1',port:PORT,strictPort:true},logLevel:'error'});await server.listen()

 {const v=await open(browser,{account:user()})
  await signupScreen(v.page)
  await google(v.page).click()
  const ageAlert=v.page.getByRole('alert').filter({hasText:'18 años'})
  await ageAlert.waitFor()
  assert.equal(v.s.authorize.length,0,'no redirect before confirming 18+')
  // A quiet line under the button read as a broken button: the checkbox itself must change.
  const ageFeedback=await ageAlert.evaluate(alert=>{
   const label=alert.previousElementSibling,box=alert.getBoundingClientRect()
   return {adjacent:!!label?.querySelector('input[type=checkbox]'),
    surface:getComputedStyle(label).backgroundColor,
    inView:box.top>=0&&box.bottom<=innerHeight}
  })
  assert.deepEqual(ageFeedback,{adjacent:true,surface:'rgb(225, 229, 63)',inView:true})
  await v.page.getByRole('checkbox').check()
  assert.equal(await ageAlert.count(),0,'the message clears once confirmed')
  await v.page.getByRole('checkbox').uncheck()
  await v.page.getByText('Apple · próximamente').waitFor()
  await finish(v);pass('signup_requires_18_before_leaving_pazo')}

 {const v=await open(browser,{account:user(),start:'/'+CAMPAIGN})
  await signupScreen(v.page)
  await v.page.getByRole('checkbox').check()
  await google(v.page).click()
  await until(()=>v.s.updates.length===1,'attestation from the signup screen must be saved')
  const a=v.s.authorize[0]
  assert.equal(a.provider,'google')
  assert.equal(a.redirect_to,ORIGIN+'/?auth=google')
  assert.equal(a.prompt,'select_account')
  assert.deepEqual(Object.keys(v.s.updates[0].data),['pazo_adult_attested_at'])
  await v.page.getByRole('heading',{name:'¿Quién te acompaña?'}).waitFor()
  cleanUrl(v.page)
  assert.equal(await gateHeading(v.page).count(),0)
  assert.equal(v.s.profile>=1,true,'new account must initialize its profile')
  await until(()=>v.s.attribution===1,'a new campaign signup must submit attribution once')
  assert.equal(await v.page.evaluate(()=>/access_token|refresh_token/.test(location.href+history.state)),false)
  await v.page.screenshot({animations:'disabled',path:path.join(out,'new-google-account-first-pet-es-390.png')})
  await finish(v);pass('new_signup_saves_18_cleans_url_reaches_first_pet_and_attributes_once')}

 {const v=await open(browser,{account:user(),start:'/'+CAMPAIGN})
  await loginScreen(v.page)
  await google(v.page).click()
  await gateHeading(v.page).waitFor()
  cleanUrl(v.page)
  assert.equal(await v.page.evaluate(()=>document.activeElement?.getAttribute('type')),'checkbox','focus moves to the confirmation')
  const go=v.page.getByRole('button',{name:'Continuar',exact:true})
  assert.equal(await go.isDisabled(),true)
  assert.equal(v.s.profile,0,'no profile before 18+')
  assert.equal(v.s.attribution,0,'no attribution before 18+')
  assert.equal(v.s.updates.length,0)
  await v.page.getByRole('button',{name:/No tengo 18/}).click()
  await until(()=>v.s.logout===1,'declining must sign out')
  await v.page.getByRole('button',{name:'Comenzar'}).waitFor()
  assert.equal(v.s.profile,0);assert.equal(v.s.attribution,0)
  await finish(v);pass('login_path_new_account_gate_decline_signs_out_without_profile_or_attribution')}

 {const v=await open(browser,{account:user(),start:'/'+CAMPAIGN})
  await loginScreen(v.page)
  await google(v.page).click()
  await gateHeading(v.page).waitFor()
  await v.page.getByRole('checkbox').check()
  await v.page.getByRole('button',{name:'Continuar',exact:true}).click()
  await v.page.getByRole('heading',{name:'¿Quién te acompaña?'}).waitFor()
  assert.equal(v.s.updates.length,1)
  await until(()=>v.s.attribution===1,'attribution follows the confirmation')
  await finish(v);pass('login_path_new_account_gate_confirm_continues')}

 for(const [name,account] of [
  ['existing_google_account',user({created:OLD,attested:true})],
  ['linked_email_account',user({created:OLD,providers:['email','google']})],
 ]){
  const v=await open(browser,{account,start:'/'+CAMPAIGN})
  await loginScreen(v.page)
  await google(v.page).click()
  await until(()=>v.s.profile>=1,'existing account must reach its profile')
  await v.page.waitForTimeout(500)
  assert.equal(await gateHeading(v.page).count(),0,name+' has no gate')
  assert.equal(v.s.updates.length,0,name+' metadata unchanged')
  assert.equal(v.s.attribution,0,name+' is not a new signup')
  assert.equal(await v.page.evaluate(()=>{const raw=Object.keys(localStorage).filter(k=>/market/i.test(k)).map(k=>localStorage[k]).join();return raw.includes('signup_requested')}),false,name+' no funnel step')
  cleanUrl(v.page)
  await finish(v);pass(name+'_is_login_not_conversion')
 }

 for(const [oauth,text,label] of [
  ['access_denied','Cancelaste el acceso','cancelled'],['server_error','No pudimos continuar','failed'],
 ]){
  const v=await open(browser,{account:user(),oauth})
  await loginScreen(v.page)
  await google(v.page).click()
  await v.page.getByRole('alert').filter({hasText:text}).waitFor()
  cleanUrl(v.page)
  assert.equal((await v.page.content()).includes('PROVIDER_SECRET_TEXT'),false,'provider text is not shown')
  assert.equal(v.s.profile,0)
  await google(v.page).click()
  await until(()=>v.s.authorize.length===2,'retry must start again')
  await finish(v);pass('oauth_'+label+'_shows_message_clean_url_and_retry')
 }

 {const v=await open(browser,{account:user({created:OLD,providers:['email']})})
  await loginScreen(v.page)
  await v.page.locator('#pazo-login-email').fill('synthetic@example.invalid')
  await v.page.locator('#pazo-login-password').fill('Synthetic1234')
  await v.page.getByRole('button',{name:'Iniciar Sesión',exact:true}).click()
  await until(()=>v.s.password===1&&v.s.profile>=1,'email login must still work')
  assert.equal(v.s.authorize.length,0)
  assert.equal(await gateHeading(v.page).count(),0)
  await finish(v);pass('email_password_login_unchanged')}

 // Meta consent: only for a new ad signup, and never loads the SDK with Pixel off.
 {const v=await open(browser,{account:user(),start:'/'+CAMPAIGN})
  await signupScreen(v.page);await v.page.getByRole('checkbox').check();await google(v.page).click()
  const dialog=v.page.getByRole('dialog').filter({hasText:'decides'})
  await dialog.waitFor()
  assert.equal(await dialog.getByRole('checkbox').isChecked(),false,'never pre-checked')
  await v.page.getByRole('button',{name:/Cómo se usarían/}).focus();await v.page.keyboard.press('Tab');await v.page.keyboard.press('Shift+Tab');await v.page.waitForTimeout(300)
  const focus=await v.page.evaluate(()=>{const c=getComputedStyle(document.activeElement);return {bg:c.backgroundColor,shadow:c.boxShadow,outline:c.outlineStyle}})
  assert.notEqual(focus.bg,'rgba(0, 0, 0, 0)','focus changes the surface');assert.equal(focus.shadow,'none');assert.equal(focus.outline,'none')
  await v.page.screenshot({animations:'disabled',path:path.join(out,'meta-consent-es-390.png')})
  await dialog.getByRole('button',{name:'Continuar sin permitirlo'}).click()
  await dialog.waitFor({state:'detached'})
  assert.equal(v.s.grants||0,0,'declining sends nothing')
  assert.ok(!v.s.remote.includes('connect.facebook.net'));await finish(v)}
 {const v=await open(browser,{account:user(),start:'/'+CAMPAIGN})
  await signupScreen(v.page);await v.page.getByRole('checkbox').check();await google(v.page).click()
  const dialog=v.page.getByRole('dialog').filter({hasText:'decides'})
  await dialog.waitFor()
  await dialog.getByRole('checkbox').check()
  await dialog.getByRole('button',{name:'Permitir medición'}).click()
  await until(()=>v.s.grants===1&&v.s.receipts===1,'consent reaches grant and receipt')
  await dialog.waitFor({state:'detached'})
  assert.ok(!v.s.remote.some(h=>/facebook/.test(h)),'Pixel off: no browser traffic to Meta')
  await finish(v)}
 // Meta suspended: the same new ad signup is never offered an acceptance.
 {const v=await open(browser,{account:user(),start:'/'+CAMPAIGN})
  v.s.metaAvailable=false
  await signupScreen(v.page);await v.page.getByRole('checkbox').check();await google(v.page).click()
  await until(()=>v.s.attribution===1,'attribution still accepted');await v.page.waitForTimeout(800)
  assert.equal(await v.page.getByText('Tú decides').count(),0,'suspended Meta asks nothing')
  assert.equal(v.s.grants||0,0);await finish(v)}
 for(const [name,account,start] of [['organic',user(),'/'],['existing',user({created:OLD,attested:true}),'/'+CAMPAIGN]]){
  const v=await open(browser,{account,start})
  await loginScreen(v.page);await google(v.page).click()
  if(name==='organic'){await gateHeading(v.page).waitFor();await v.page.getByRole('checkbox').check();await v.page.getByRole('button',{name:'Continuar',exact:true}).click()}
  await until(()=>v.s.profile>=1,'reaches profile');await v.page.waitForTimeout(800)
  assert.equal(await v.page.getByText('Tú decides').count(),0,name+' is never asked')
  assert.equal(v.s.grants||0,0);await finish(v)
 }
 pass('meta_consent_only_new_ad_signup_decline_grant_no_pixel')

 // Public legal pages: same text as the app, and nothing else loads.
 for(const [kind,lang,heading] of [['privacy','es','Privacidad en PAZO'],['privacy','en','Privacy at PAZO'],['terms','es','Reglas de uso de PAZO'],['terms','en','PAZO Community Rules']]){
  const v=await open(browser,{account:user(),start:'/'+kind+'?lang='+lang,viewport:{width:320,height:640},locale:lang==='es'?'en-US':'es-ES'})
  await v.page.getByRole('heading',{name:heading,level:1}).waitFor()
  assert.equal(await v.page.evaluate(()=>document.documentElement.lang),lang)
  assert.equal(await v.page.evaluate(()=>localStorage.getItem('pazo_language_preference_v1')),null,'a link never changes the preference')
  assert.deepEqual([v.s.profile,v.s.attribution,v.s.authorize.length],[0,0,0])
  await noOverflow(v.page,kind+lang)
  assert.equal(await v.page.title(),heading+' · PAZO')
  await v.page.screenshot({animations:'disabled',path:path.join(out,`legal-${kind}-${lang}-320.png`)})
  await finish(v)
 }
 {const supabase=[]
  const ctx=await browser.newContext({serviceWorkers:'block'});const page=await ctx.newPage()
  page.on('request',r=>{if(new URL(r.url()).origin!==ORIGIN)supabase.push(new URL(r.url()).hostname)})
  await page.goto(ORIGIN+'/privacy?lang=en');await page.getByRole('heading',{level:1}).waitFor();await page.waitForTimeout(800)
  assert.equal(supabase.includes(new URL(SUPABASE).hostname),false,'no database or Auth traffic')
  await page.getByRole('link',{name:'Español'}).click()
  await page.getByRole('heading',{name:'Privacidad en PAZO',level:1}).waitFor()
  await page.getByRole('link',{name:'Términos de uso'}).click()
  await page.getByRole('heading',{name:'Reglas de uso de PAZO',level:1}).waitFor()
  await ctx.close()}
 pass('public_legal_pages_es_en_without_auth_or_database')

 // Runtime screenshots and layout at the widths the issue requires.
 for(const [locale,lang] of [['es-ES','es'],['en-US','en']])for(const width of [320,390,430]){
  const viewport={width,height:width===320?640:780}
  const a=await open(browser,{locale,viewport,account:user()})
  await signupScreen(a.page,lang)
  await zeroOutline(google(a.page,lang),'signup CTA')
  await noOverflow(a.page,'signup '+lang+width)
  await a.page.screenshot({animations:'disabled',path:path.join(out,`signup-${lang}-${width}.png`)})
  await a.ctx.close()
  const b=await open(browser,{locale,viewport,account:user()})
  await loginScreen(b.page,lang)
  await zeroOutline(google(b.page,lang),'login CTA')
  await noOverflow(b.page,'login '+lang+width)
  await b.page.screenshot({animations:'disabled',path:path.join(out,`login-${lang}-${width}.png`)})
  await google(b.page,lang).click()
  await gateHeading(b.page).waitFor()
  await noOverflow(b.page,'gate '+lang+width)
  await b.page.getByRole('button',{name:/No tengo 18|under 18/}).scrollIntoViewIfNeeded()
  await b.page.screenshot({animations:'disabled',path:path.join(out,`gate-${lang}-${width}.png`)})
  await b.ctx.close()
 }
 pass('layout_es_en_320_390_430_no_overflow_no_outline')
 fs.writeFileSync(path.join(out,'OBSERVATIONS.json'),JSON.stringify({status:'PASS',real:false,
  limits:['Auth and Data API intercepted; no Google, no hosted Supabase','Provider return simulated by a page, so a real referrer is not exercised','Installed PWA not exercised'],evidence},null,1))
 console.log('GOOGLE_AUTH_BROWSER_PASS '+evidence.length)
}catch(error){
 console.error('GOOGLE_AUTH_BROWSER_FAIL '+String(error?.message||error).slice(0,400))
 process.exitCode=1
}finally{
 if(browser)await browser.close()
 if(server)await server.close()
}
