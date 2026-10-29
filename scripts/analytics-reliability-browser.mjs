// Actual App/AuthProvider/login form/Admin on an intercepted official-shaped
// origin. ALL requests are routed locally before navigation. Auth, domain data
// and challenge provider are disclosed doubles; Edge handlers and PG are real.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {createRequire} from 'node:module'
import {createServer} from 'vite'
import {sql} from './marketing-sql-lab.mjs'
import {visualReport} from './admin-visual-fixture.mjs'
import {visualFontCss} from './admin-visual-font.mjs'
import {createMarketingLandingHandler} from '../supabase/functions/pazo-marketing-landing/landingCore.mjs'
import {createMarketingIntakeHandler} from '../supabase/functions/pazo-marketing-attribution/intakeCore.mjs'
const require=createRequire(import.meta.url),{chromium}=require(process.env.PAZO_PLAYWRIGHT_MODULE||'../../continuidad/f18-browser-tools/node_modules/playwright')
const origin='https://pazo-app.vercel.app',local='http://127.0.0.1:5365',project='https://mrybvqdebbgcayuvgkkr.supabase.co',font=await visualFontCss()
process.env.VITE_SUPABASE_URL=project;process.env.VITE_SUPABASE_PUBLISHABLE_KEY='sb_publishable_synthetic'
const server=await createServer({logLevel:'error',server:{host:'127.0.0.1',port:5365,strictPort:true},plugins:[{
 name:'isolated-challenge-double',enforce:'pre',transform(_source,id){if(id.endsWith('/src/features/marketing/landingChallenge.ts'))return "export async function requestLandingChallenge(){return 'synthetic-'+crypto.randomUUID()}"},
 transformIndexHtml:html=>html.replace('</head>','<style>'+font+'</style></head>')
}]})
const out='artifacts/admin-visual/issue161/browser';fs.mkdirSync(out,{recursive:true})
const owner='96000000-0000-4000-8000-000000000031',pet='97000000-0000-4000-8000-000000000002',now=new Date().toISOString()
const user={id:owner,aud:'authenticated',role:'authenticated',email:'operator@synthetic.invalid',created_at:'2020-01-01T00:00:00Z',email_confirmed_at:'2020-01-01T00:00:00Z',app_metadata:{pazo_marketing_qa:true},user_metadata:{}}
const token=[{alg:'HS256',typ:'JWT'},{sub:owner,role:'authenticated',aud:'authenticated',aal:'aal1',exp:Math.floor(Date.now()/1000)+3600},'invalid-synthetic-signature'].map(v=>Buffer.from(typeof v==='string'?v:JSON.stringify(v)).toString('base64url')).join('.')
const session={access_token:token,refresh_token:'synthetic',expires_at:Math.floor(Date.now()/1000)+3600,expires_in:3600,token_type:'bearer',user}
const q=v=>"'"+String(v).replaceAll("'","''")+"'"
const privileged=statement=>sql(`SET ROLE service_role;${statement}`)==='t'
const counter=()=>JSON.parse(sql("SELECT jsonb_build_object('acquisitions',(SELECT count(*) FROM marketing_private.acquisition),'login_open',(SELECT coalesce(sum(requests),0) FROM marketing_private.experience_daily WHERE signal='login_open'),'login_attempt',(SELECT coalesce(sum(requests),0) FROM marketing_private.experience_daily WHERE signal='login_attempt'))"))
let browser,currentPage,checks=0;const results=[],errors=[]
try{
 await server.listen();browser=await chromium.launch({headless:true,...(process.env.PAZO_CHROMIUM_PATH?{executablePath:process.env.PAZO_CHROMIUM_PATH}:{channel:process.platform==='win32'?'msedge':undefined})})
 for(const [lang,width]of [['es',390],['en',390],['es',1440]]){
  let created=false,signedIn=true,edgeCalls=0,passwordSubmissions=0,reportReads=0,unknownWrites=0,attributionCalls=0,telemetryRpcCalls=0
  const challenges=new Set(),accepted=[]
  const landing=createMarketingLandingHandler({released:true,preregReleased:true,experienceReleased:true,
   verifyChallenge:async t=>{if(!t?.startsWith('synthetic-')||challenges.has(t))return false;challenges.add(t);return true},
   submit:async c=>privileged(`SELECT public.pazo_marketing_record_landing_v1(${q(c)})`),
   submitPrereg:async(c,s)=>privileged(`SELECT public.pazo_marketing_prereg_signal_v1(${q(c)},${q(s)})`),
   submitExperience:async s=>{const ok=privileged(`SELECT public.pazo_intelligence_experience_v1(${q(s)})`);if(ok)accepted.push(s);return ok}
  })
  const intake=createMarketingIntakeHandler({released:true,authenticate:async()=>signedIn?user:null,submit:async p=>privileged(`SELECT public.pazo_marketing_record_verified_v1(${q(p.ownerId)},${q(p.creative)},${q(p.firstTouchAt)})`)})
  const context=await browser.newContext({viewport:{width,height:1000},locale:lang==='es'?'es-GT':'en-US',serviceWorkers:'block',reducedMotion:'reduce'})
  await context.routeWebSocket('**/*',socket=>socket.close())
  await context.addInitScript(({session,lang})=>{
   // Exercise the human-only path deliberately; webdriver's veto is tested separately.
   Object.defineProperty(navigator,'webdriver',{value:false})
   if(!sessionStorage.getItem('synthetic-seeded')){localStorage.setItem('sb-mrybvqdebbgcayuvgkkr-auth-token',JSON.stringify(session));sessionStorage.setItem('synthetic-seeded','1')}
   localStorage.setItem('pazo_lang_v1',lang)
  },{session,lang})
  await context.route('**/*',async route=>{
   const req=route.request(),url=new URL(req.url()),reply=(data,status=200)=>route.fulfill({status,contentType:'application/json',headers:{'content-range':'0-0/0'},body:JSON.stringify(data)})
   if(url.origin===origin){const r=await route.fetch({url:local+url.pathname+url.search});return route.fulfill({response:r})}
   if(url.origin!==project)return route.abort()
   if(url.pathname.startsWith('/auth/v1/logout')){signedIn=false;return reply({})}
   if(url.pathname.startsWith('/auth/v1/token')){if(url.searchParams.get('grant_type')==='password')passwordSubmissions++;signedIn=true;return reply(session)}
   if(url.pathname.startsWith('/auth/v1/user'))return signedIn?reply(user):reply({message:'no session'},401)
   if(url.pathname.includes('/functions/v1/')){
    const name=url.pathname.split('/functions/v1/')[1]
    if(!['pazo-marketing-landing','pazo-marketing-attribution'].includes(name)){unknownWrites++;return reply({code:'ISOLATED_UNSUPPORTED'},503)}
    edgeCalls++;if(name==='pazo-marketing-attribution')attributionCalls++;const h=name==='pazo-marketing-landing'?landing:intake
    const r=await h(new Request('https://isolated.invalid',{method:'POST',headers:{...req.headers(),origin,'content-type':'application/json'},body:req.postData()}))
    return route.fulfill({status:r.status,contentType:'application/json',body:await r.text()})
   }
   const rpc=url.pathname.split('/rpc/')[1]
   if(rpc){
    if(rpc==='pazo_admin_visual_summary_v1'){reportReads++;const a=JSON.parse(req.postData());return reply(visualReport(a.p_days,a.p_segment,a.p_creative,a.p_audience))}
    if(rpc==='pazo_is_admin')return reply(signedIn)
    if(rpc==='create_pet_profile'){created=true;return reply(pet)}
    if(rpc==='pazo_public_maintenance_status')return reply({enabled:false,message_es:'',message_en:'',updated_at:now})
    if(rpc==='pazo_supporter_public_badges_batch')return reply(JSON.parse(req.postData()).p_pet_ids.map(pet_id=>({pet_id,badge:false,milestone:0})))
    if(['pazo_behavior_record_v1','pazo_intelligence_record_v1','pazo_marketing_record_utility_v1'].includes(rpc)){telemetryRpcCalls++;return reply(false)}
    if(['pazo_admin_overview','pazo_admin_users','pazo_admin_experiments'].includes(rpc))return reply({code:'ISOLATED_OTHER_REPORT'},503)
    return reply([])
   }
   const table=url.pathname.split('/rest/v1/')[1]
   if(table==='pets'){const row={id:pet,owner_id:owner,name:'Luna',species:'gato',breed:'',age:'',gender:'hembra',photo_url:origin+'/pwa-icon-192.png',is_lost:false,created_at:now};return reply((req.headers().accept||'').includes('vnd.pgrst.object')?(created?row:null):(created?[row]:[]))}
   if((req.headers().accept||'').includes('vnd.pgrst.object'))return reply({id:owner,is_founder:false,notifications_enabled:true})
   return reply([])
  })
  const page=await context.newPage();currentPage=page;page.setDefaultTimeout(25000);page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept())
  const openAdmin=async()=>{await page.keyboard.press('Escape');await page.getByRole('navigation',{name:'Navegación de PAZO'}).getByRole('button',{name:lang==='es'?'Mi mascota':'My Pet',exact:true}).click();await page.getByRole('button',{name:lang==='es'?'Centro de control':'Control center',exact:true}).click();await page.locator('.pa-kpi>strong').first().filter({hasText:'120'}).waitFor();await page.locator('.pa-privacy summary').click()}
  const back=()=>page.getByRole('button',{name:lang==='es'?(width<1024?'Volver':'Volver a PAZO'):(width<1024?'Back':'Back to PAZO'),exact:true}).click()
  const logout=async()=>{await page.getByRole('navigation',{name:'Navegación de PAZO'}).getByRole('button',{name:lang==='es'?'Mi mascota':'My Pet',exact:true}).click();await page.getByRole('button',{name:lang==='es'?'Cerrar sesión':'Log out',exact:true}).click();await page.getByRole('button',{name:lang==='es'?'Ya tengo una cuenta':'I already have an account',exact:true}).waitFor()}
  const login=async()=>{await page.getByRole('button',{name:lang==='es'?'Ya tengo una cuenta':'I already have an account',exact:true}).click();await page.locator('#pazo-login-email').fill(user.email);await page.locator('#pazo-login-password').fill('SyntheticOnly123!');await page.getByRole('button',{name:lang==='es'?'Iniciar Sesión':'Log in',exact:true}).click();await page.getByRole('navigation',{name:'Navegación de PAZO'}).waitFor()}
  await page.goto(origin+'/?utm_source=meta&utm_medium=paid_social&utm_campaign=pazo_beta_local_202610&utm_content=perfil_es',{waitUntil:'domcontentloaded'});await page.getByPlaceholder(lang==='es'?'Ej: Luna, Bruno, Nube...':'E.g. Luna, Bruno, Cloud...').fill('Luna');await page.getByRole('button',{name:lang==='es'?'Continuar':'Continue',exact:true}).click();await page.getByRole('button',{name:lang==='es'?'Crear perfil y entrar':'Create profile and enter',exact:true}).click()
  await page.getByRole('navigation',{name:'Navegación de PAZO'}).getByRole('button',{name:lang==='es'?'Mi mascota':'My Pet',exact:true}).click();await page.keyboard.press('Escape');await openAdmin()
  const toggle=page.getByRole('switch',{name:lang==='es'?'Excluir señales de este navegador':'Exclude signals from this browser'})
  assert.equal(await toggle.getAttribute('aria-checked'),'false');await toggle.click();assert.equal(await toggle.getAttribute('aria-checked'),'true');checks+=2
  const before=counter(),beforeCalls=edgeCalls,beforeRpcCalls=telemetryRpcCalls
  await page.getByRole('button',{name:lang==='es'?'Actualizar analíticas':'Refresh analytics',exact:true}).click();await page.locator('[data-pazo-executive-analytics][aria-busy="false"]').waitFor();assert.ok(reportReads>=2);checks++
  await page.evaluate(()=>{const b=document.createElement('div');b.textContent='QA · Datos sintéticos · Auth/challenge controlados · PG aislado';b.style.cssText='position:fixed;bottom:0;right:0;z-index:10000;background:#f8edc9;color:#204e4a;font:600 11px system-ui;padding:6px 10px;pointer-events:none';document.body.append(b)})
  await toggle.scrollIntoViewIfNeeded();await page.screenshot({path:`${out}/${lang}-${width}-exclusion.png`,fullPage:true})
  if(lang==='es'&&width===390){const tab=await context.newPage();await tab.goto(origin);await tab.getByRole('navigation',{name:'Navegación de PAZO'}).waitFor();assert.equal(await tab.evaluate(()=>localStorage.getItem('pazo_analytics_excluded_v1')),'1');await tab.close();checks++}
  await back();await logout();await page.getByRole('button',{name:'Demo',exact:true}).click();await page.getByRole('navigation',{name:'Navegación de PAZO'}).getByRole('button',{name:lang==='es'?'Mi mascota':'My Pet',exact:true}).click();await page.getByRole('button',{name:lang==='es'?'Salir de demo':'Exit demo',exact:true}).click();await login();assert.equal(passwordSubmissions,1);assert.equal(edgeCalls,beforeCalls);assert.equal(telemetryRpcCalls,beforeRpcCalls);assert.deepEqual(counter(),before);checks+=4
  assert.equal(await page.evaluate(()=>localStorage.getItem('pazo_analytics_excluded_v1')),'1');checks++
  await openAdmin();assert.equal(await toggle.getAttribute('aria-checked'),'true');checks++
  await toggle.click();assert.equal(await toggle.getAttribute('aria-checked'),'false');checks++
  const seenRequests=Promise.all(['login_open','login_attempt'].map(signal=>page.waitForResponse(r=>r.url().includes('/functions/v1/pazo-marketing-landing')&&JSON.parse(r.request().postData()||'{}').experience===signal)))
  await back();await logout();await page.getByRole('button',{name:'Demo',exact:true}).click();await page.getByRole('navigation',{name:'Navegación de PAZO'}).getByRole('button',{name:lang==='es'?'Mi mascota':'My Pet',exact:true}).click();await page.getByRole('button',{name:lang==='es'?'Salir de demo':'Exit demo',exact:true}).click();await login();await seenRequests
  await page.waitForFunction(()=>localStorage.getItem('pazo_analytics_excluded_v1')===null)
  assert.ok(accepted.includes('login_open')&&accepted.includes('login_attempt'));assert.equal(counter().acquisitions,before.acquisitions);assert.equal(passwordSubmissions,2);checks+=3
  assert.equal(unknownWrites,0);assert.equal(attributionCalls,0);assert.ok(accepted.includes('demo_enter')&&accepted.includes('demo_exit'));checks+=3
  results.push({lang,width,status:'PASS',adminLogoutLoginExcluded:true,explicitRevocationRestoresAnonymousRequests:true,falseAdConversions:0,hostedWrites:0,auth:'controlled double',challenge:'single-use controlled double',edge:'actual handlers',database:'isolated PostgreSQL17'})
  await context.close();console.log(`PASS actual App exclusion ${lang} ${width}`)
 }
 assert.deepEqual(errors,[])
 fs.writeFileSync(out+'/results.json',JSON.stringify({status:'PASS',checks,results,errors,hostedWrites:0,limits:['Official-shaped browser origin fully intercepted; no production HTTP','Controlled Auth/domain/challenge provider; actual login form, App, Edge and isolated SQL']},null,2)+'\n')
 console.log(JSON.stringify({status:'PASS',checks,cases:results.length,hostedWrites:0}))
}catch(error){if(currentPage&&!currentPage.isClosed()){await currentPage.screenshot({path:out+'/failure.png',fullPage:true});console.error((await currentPage.locator('body').innerText()).slice(0,2400))}throw error}finally{await browser?.close();await server.close()}
