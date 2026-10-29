// Actual native Admin shell + new React charts + real disposable PG aggregates.
// Auth and HTTP transport are controlled doubles; no hosted PAZO writes.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {createRequire} from 'node:module'
import {createServer} from 'vite'
import {sql,file} from './marketing-sql-lab.mjs'
import {seedVisualFixture,visualReport,visualAdmin} from './admin-visual-fixture.mjs'
import {visualFontCss} from './admin-visual-font.mjs'
const require=createRequire(import.meta.url),{chromium}=require(process.env.PAZO_PLAYWRIGHT_MODULE||'../../continuidad/f18-browser-tools/node_modules/playwright')
if(process.env.PAZO_ADMIN_VISUAL_REUSE_LAB!=='true')await import('./admin-visual-pg17.mjs')
sql('DROP FUNCTION IF EXISTS public.pazo_admin_visual_summary_v1(integer,text,text,text)')
file('supabase/migrations/20261029121000_pazo_admin_visual_summary.sql')
seedVisualFixture()
const cache=new Map(),report=a=>{const k=JSON.stringify(a);if(!cache.has(k))cache.set(k,visualReport(a.p_days,a.p_segment,a.p_creative,a.p_audience));return cache.get(k)}
const font=await visualFontCss()
process.env.VITE_SUPABASE_URL='https://mrybvqdebbgcayuvgkkr.supabase.co';process.env.VITE_SUPABASE_PUBLISHABLE_KEY='sb_publishable_synthetic'
const server=await createServer({logLevel:'error',server:{host:'127.0.0.1',port:5363,strictPort:true}})
const out='artifacts/admin-visual/browser';fs.mkdirSync(out,{recursive:true})
let browser,checks=0;const cases=[],errors=[]
try{
 await server.listen();browser=await chromium.launch({headless:true,...(process.env.PAZO_CHROMIUM_PATH?{executablePath:process.env.PAZO_CHROMIUM_PATH}:{channel:process.platform==='win32'?'msedge':undefined})})
 for(const [lang,width]of [['es',1440],['es',390],['es',320],['en',1440],['en',390]]){
  let mode='content',factorRequests=0,unexpectedWrites=0,holdNext=false,announceHeld,releaseHeld,announceDelivered,authDriven=false
  const ignoreAborts=lang==='es'&&width===390
  const actorId=request=>{if(!authDriven)return '96000000-0000-4000-8000-000000000031';try{return JSON.parse(Buffer.from(request.headers().authorization.split('.')[1],'base64url')).sub}catch{return null}}
  const scaled=value=>Array.isArray(value)?value.map(scaled):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).map(([k,v])=>[k,typeof v==='number'&&!['version','days'].includes(k)?v*10000:scaled(v)])):value
  const context=await browser.newContext({viewport:{width,height:1000},locale:lang==='es'?'es-GT':'en-US',reducedMotion:'reduce',serviceWorkers:'block'})
  await context.route('**/*',async route=>{
   const url=new URL(route.request().url()),reply=(data,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)})
   if(url.hostname==='127.0.0.1'){
    if(ignoreAborts&&url.pathname.endsWith('/visualSummary.ts')){const response=await route.fetch(),body=await response.text();assert.ok(body.includes('.abortSignal(signal)'));return route.fulfill({response,body:body.replace('.abortSignal(signal)','.abortSignal(new AbortController().signal)')})}
    return route.continue()
   }
   if(['fonts.googleapis.com','fonts.gstatic.com'].includes(url.hostname))return route.continue()
   if(url.pathname.includes('/factors'))factorRequests++
   const rpc=url.pathname.split('/rpc/')[1]
   if(authDriven&&url.pathname==='/auth/v1/user')return reply({id:actorId(route.request()),aud:'authenticated',role:'authenticated',email:'synthetic-qa@example.invalid',app_metadata:{provider:'email'},user_metadata:{},created_at:new Date().toISOString()})
   if(authDriven&&url.pathname.includes('/auth/v1/logout'))return reply({})
   if(rpc==='pazo_ensure_my_profile')return reply(true)
   if(rpc==='pazo_admin_visual_summary_v1'){
    if(mode==='error')return reply({code:'SYNTHETIC_OUTAGE'},503)
    if(mode==='access')return reply({code:'42501',message:'admin required'},403)
    if(authDriven&&actorId(route.request())!=='96000000-0000-4000-8000-000000000031'){
     assert.throws(()=>sql(`SET ROLE authenticated;SET "request.jwt.claim.sub"='98000000-0000-4000-8000-000000000001';SELECT public.pazo_admin_visual_summary_v1()`))
     return reply({code:'42501',message:'admin required'},403)
    }
    const args=JSON.parse(route.request().postData())
    let snapshot=report(args)
    if(mode==='protected')snapshot=JSON.parse(fs.readFileSync('artifacts/admin-visual/protected-synthetic.json','utf8'))
    if(mode==='large')snapshot=scaled(structuredClone(snapshot))
    if(mode==='paused'){snapshot=structuredClone(snapshot);snapshot.status='paused';snapshot.totals=null;snapshot.segments=null;snapshot.landing_requests=null;for(const k of ['funnel','moves','last_steps','return_modules','creatives'])snapshot[k]=[];snapshot.trend=snapshot.trend.map(r=>({...r,accounts:null,returning:null}))}
    if(holdNext){holdNext=false;announceHeld?.();await new Promise(resolve=>{releaseHeld=resolve});try{await reply(snapshot)}finally{announceDelivered?.()}return}
    return reply(snapshot)
   }
   if(['pazo_admin_behavior_summary_v1','pazo_admin_intelligence_summary_v1'].includes(rpc)){
    const a=JSON.parse(route.request().postData()),quote=v=>"'"+String(v).replaceAll("'","''")+"'"
    if(authDriven&&actorId(route.request())!=='96000000-0000-4000-8000-000000000031')return reply({code:'42501'},403)
    return reply(JSON.parse(sql(visualAdmin(`SELECT public.${rpc}(${Number(a.p_days)},${quote(a.p_segment)},${quote(a.p_creative)})`))))
   }
   if(rpc&&!['pazo_admin_overview','pazo_admin_users','pazo_admin_experiments'].includes(rpc)&&route.request().method()!=='GET')unexpectedWrites++
   return reply(null,503)
  })
  const page=await context.newPage();page.setDefaultTimeout(20000);page.on('pageerror',e=>errors.push(String(e)))
  await page.goto(`http://127.0.0.1:5363/supabase/tests/marketing/behavior-harness.html?lang=${lang}`)
  await page.addStyleTag({content:font});await page.evaluate(()=>document.fonts.load('700 16px Quicksand'))
  assert.ok(await page.evaluate(()=>Array.from(document.fonts).some(f=>f.family.replaceAll('"','').replaceAll("'",'')==='Quicksand'&&f.status==='loaded')));checks++
  await page.locator('.pa-kpi>strong').first().filter({hasText:'120'}).waitFor()
  assert.deepEqual(await page.locator('.pa-funnel-labels strong').allTextContents(),['80','60','40','20'])
  checks++
  const panel=page.locator('[data-pazo-executive-analytics]')
  assert.ok(await panel.evaluate(e=>e.scrollWidth<=e.clientWidth+1));checks++
  assert.equal(await page.locator('[data-pazo-admin-live-mfa]').count(),0);checks++
  await page.screenshot({path:`${out}/${lang}-${width}-summary.png`,fullPage:true})
  for(const [name,selector]of [['journeys','.pa-journeys-panel'],['creatives','.pa-creatives-panel']]){await page.locator(selector).scrollIntoViewIfNeeded();await page.screenshot({path:`${out}/${lang}-${width}-${name}.png`,fullPage:true})}
  await page.locator('.pa-privacy summary').click()
  const exclusion=page.getByRole('switch',{name:lang==='es'?'Excluir señales de este navegador':'Exclude signals from this browser'})
  await exclusion.focus();await page.keyboard.press('Space');assert.equal(await exclusion.getAttribute('aria-checked'),'true');checks++
  await page.keyboard.press('Space');assert.equal(await exclusion.getAttribute('aria-checked'),'false');checks++
  assert.ok(await page.locator('.pa-exclusion').evaluate(e=>e.scrollWidth<=e.clientWidth+1));checks++
  await page.locator('.pa-privacy summary').click()
  await page.getByRole('button',{name:/^Ads/}).click()
  await page.locator('.pa-kpi>strong').first().filter({hasText:'80'}).waitFor();checks++
  await page.getByRole('button',{name:lang==='es'?/^Orgánico/:/^Organic/}).click()
  assert.ok(await page.getByRole('status').filter({hasText:lang==='es'?'Aún no podemos confirmar':'We cannot yet verify'}).isVisible());checks++
  assert.equal(await page.locator('.pa-kpi>strong').first().textContent(),'80');checks++
  await page.getByRole('button',{name:lang==='es'?/^Recurrentes/:/^Returning/}).click()
  await page.locator('.pa-kpi>strong').first().filter({hasText:'120'}).waitFor();checks++
  await page.screenshot({path:`${out}/${lang}-${width}-returning.png`,fullPage:true})
  await page.getByRole('button',{name:lang==='es'?/^Todos/:/^All/}).click()
  await page.locator('.pa-funnel-labels').waitFor()
  await context.setOffline(true)
  await page.getByRole('alert').filter({hasText:lang==='es'?'Sin conexión':'Offline'}).waitFor();checks++
  assert.equal(await page.locator('.pa-kpi>strong').first().textContent(),'120');checks++
  await page.screenshot({path:`${out}/${lang}-${width}-offline.png`,fullPage:true})
  await context.setOffline(false)
  await page.locator('[data-pazo-executive-analytics][aria-busy="false"]').waitFor()
  mode='error';await page.getByRole('button',{name:lang==='es'?'Actualizar analíticas':'Refresh analytics',exact:true}).click()
  await page.getByRole('alert').filter({hasText:lang==='es'?'No se pudo actualizar':'could not be refreshed'}).waitFor()
  assert.equal(await page.locator('.pa-kpi>strong').first().textContent(),'120');checks++
  mode='content';await page.getByRole('button',{name:lang==='es'?'Reintentar':'Retry',exact:true}).click()
  await page.locator('[data-pazo-executive-analytics][aria-busy="false"]').waitFor();checks++
  if(ignoreAborts){
   const refresh=()=>page.getByRole('button',{name:'Actualizar analíticas',exact:true}).click()
   const ready=()=>page.locator('[data-pazo-executive-analytics][aria-busy="false"]').waitFor()
   const held=new Promise(resolve=>{announceHeld=resolve}),delivered=new Promise(resolve=>{announceDelivered=resolve})
   holdNext=true;await refresh();await held
   await page.getByRole('button',{name:/^Ads/}).click();await page.locator('.pa-kpi>strong').first().filter({hasText:'80'}).waitFor()
   sql("UPDATE marketing_private.landing_daily SET signals=signals+10 WHERE creative='qr_es'");cache.clear()
   await page.getByRole('button',{name:/^Todos/}).click();await page.locator('.pa-kpi>strong').nth(3).filter({hasText:'1,290'}).waitFor()
   releaseHeld();await delivered;await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))))
   assert.equal(await page.locator('.pa-kpi>strong').nth(3).textContent(),'1,290');checks++
   await page.screenshot({path:`${out}/es-390-race-a-b-a.png`,fullPage:true})
   sql("UPDATE marketing_private.landing_daily SET signals=signals-10 WHERE creative='qr_es'");cache.clear()
   for(const state of ['large','paused','protected','access']){
    mode=state;await refresh();await ready()
    if(state==='large'){assert.ok(await panel.evaluate(e=>e.scrollWidth<=e.clientWidth+1));checks++;await page.locator('.pa-method summary').click();assert.ok(await page.locator('.pa-exact-values').innerText().then(t=>t.includes('1,200,000')));checks++;await page.locator('.pa-method summary').click()}
    if(state==='paused'||state==='protected'){assert.equal(await page.locator('.pa-kpi>strong').first().textContent(),'—');checks++;assert.equal(await page.locator('.pa-funnel-labels').count(),0);checks++}
    if(state==='access'){await page.getByRole('alert').filter({hasText:'no tiene acceso'}).waitFor();assert.equal(await page.locator('[data-pazo-admin-live-mfa]').count(),0);assert.deepEqual(await page.locator('.pa-kpi>strong').allTextContents(),['—','—','—','—']);checks+=2}
    await page.screenshot({path:`${out}/es-390-${state}.png`,fullPage:true})
   }
   mode='content';await refresh();await ready()
   // Drive the actual AuthProvider through controlled SDK sessions. No valid
   // production token is used; every Auth endpoint is intercepted above.
   authDriven=true
   const setSession=async id=>{
    const jwt=[Buffer.from('{"alg":"HS256","typ":"JWT"}').toString('base64url'),Buffer.from(JSON.stringify({sub:id,aud:'authenticated',role:'authenticated',aal:'aal1',iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+3600})).toString('base64url'),Buffer.from('synthetic-signature-not-valid').toString('base64url')].join('.')
    await page.evaluate(async({jwt})=>{const {supabase}=await import('/src/services/supabaseClient.ts');const {error}=await supabase.auth.setSession({access_token:jwt,refresh_token:'synthetic-local-only'});if(error)throw Error(error.message)},{jwt})
   }
   await setSession('96000000-0000-4000-8000-000000000031');await page.locator('.pa-kpi>strong').first().filter({hasText:'120'}).waitFor()
   await setSession('98000000-0000-4000-8000-000000000001');await page.getByRole('alert').filter({hasText:'no tiene acceso'}).waitFor();assert.equal(await page.locator('.pa-kpi>strong').first().textContent(),'—');checks++
   await setSession('96000000-0000-4000-8000-000000000031');await page.locator('.pa-kpi>strong').first().filter({hasText:'120'}).waitFor();checks++
   await page.evaluate(async()=>{const {supabase}=await import('/src/services/supabaseClient.ts');await supabase.auth.signOut({scope:'local'})})
   await page.getByRole('alert').filter({hasText:'no tiene acceso'}).waitFor();assert.equal(await page.locator('.pa-kpi>strong').first().textContent(),'—');checks++
  }
  assert.equal(factorRequests,0);checks++
  assert.equal(unexpectedWrites,0);checks++
  cases.push({lang,width,status:'PASS',font:'Quicksand',auth:'controlled double; RPC runs as admin aal1',hostedWrites:0})
  console.log(JSON.stringify({case:lang+'-'+width,status:'PASS',checks}))
  await context.close()
 }
 assert.deepEqual(errors,[])
 fs.writeFileSync(out+'/results.json',JSON.stringify({status:'PASS',checks,cases,errors,hostedWrites:0,limits:['Auth and HTTP transport doubled; actual isolated PostgreSQL aggregates','No real production user session claimed']},null,2)+'\n')
 console.log(JSON.stringify({status:'PASS',checks,cases:cases.length,hostedWrites:0}))
}finally{await browser?.close();await server.close()}
