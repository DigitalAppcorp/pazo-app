// Actual native Administration, source reports from isolated PG17. Never remote writes.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {createRequire} from 'node:module'
import {createServer} from 'vite'
import {sql} from './marketing-sql-lab.mjs'
if(process.env.PAZO_INTELLIGENCE_REUSE_LAB!=='true')await import('./intelligence-pg17.mjs')
const require=createRequire(import.meta.url),{chromium}=require(process.env.PAZO_PLAYWRIGHT_MODULE||'../../continuidad/f18-browser-tools/node_modules/playwright')
const out='artifacts/issue153/browser';fs.mkdirSync(out,{recursive:true})
sql("UPDATE marketing_private.retention_runtime SET last_success_at=now();UPDATE marketing_private.collection_gate SET intelligence_enabled=true,behavior_enabled=true")
for(let n=2;n<20;n++)sql(`SET ROLE authenticated;SET "request.jwt.claim.sub"='97000000-0000-4000-8000-${String(n).padStart(12,'0')}';SELECT public.pazo_intelligence_record_v1('97000000-0000-4000-8000-${String(600+n).padStart(12,'0')}', '[{"seq":1,"task":"care_create","kind":"attempt"},{"seq":2,"task":"care_create","kind":"failure"},{"seq":3,"task":"map_route","kind":"intent"}]')`)
sql("INSERT INTO marketing_private.experience_daily VALUES(current_date,'demo_enter',32),(current_date,'demo_signup',12) ON CONFLICT(day,signal) DO UPDATE SET requests=excluded.requests")
const q=s=>"'"+String(s).replaceAll("'","''")+"'"
const report=(rpc,args)=>JSON.parse(sql(`SET ROLE authenticated;SET "request.jwt.claim.sub"='96000000-0000-4000-8000-000000000031';SET "request.jwt.claims"='{"aal":"aal2"}';SELECT public.${rpc}(${args.p_days},${q(args.p_segment)},${q(args.p_creative)})`))
process.env.VITE_SUPABASE_URL='https://mrybvqdebbgcayuvgkkr.supabase.co';process.env.VITE_SUPABASE_PUBLISHABLE_KEY='sb_publishable_synthetic'
const server=await createServer({server:{host:'127.0.0.1',port:5360,strictPort:true},logLevel:'error'})
const cases=[],errors=[];let checks=0,writes=0,browser
const check=(v,m)=>{assert.ok(v,m);checks++}
try{
 await server.listen();browser=await chromium.launch({headless:true,...(process.env.PAZO_CHROMIUM_PATH?{executablePath:process.env.PAZO_CHROMIUM_PATH}:{channel:process.platform==='win32'?'msedge':undefined})})
 for(const lang of ['es','en'])for(const width of [320,390,1440])for(const state of ['content','paused','protected','error','loading','mfa']){
  let mode=state,releases=[]
  const context=await browser.newContext({viewport:{width,height:900},locale:lang==='es'?'es-GT':'en-US',reducedMotion:'reduce',serviceWorkers:'block'})
  await context.route('**/*',async route=>{
   const url=new URL(route.request().url());if(url.origin==='http://127.0.0.1:5360')return route.continue()
   const reply=(v,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(v)})
   if(url.pathname.includes('/rpc/pazo_admin_intelligence_summary_v1')){
    if(mode==='loading')await new Promise(r=>releases.push(r))
    if(mode==='error')return reply({code:'SYNTHETIC_OUTAGE'},503)
    if(mode==='mfa')return reply({code:'42501'},403)
    const args=JSON.parse(route.request().postData()),r=report('pazo_admin_intelligence_summary_v1',args)
    if(mode==='paused'){r.status='paused';r.tasks=[];r.facts=[];r.anonymous=[];r.coverage_since=null}
    if(mode==='protected'){r.tasks=[];r.facts=[];r.anonymous=[]}
    return reply(r)
   }
   if(url.pathname.includes('/rpc/pazo_admin_behavior_summary_v1'))return reply(report('pazo_admin_behavior_summary_v1',JSON.parse(route.request().postData())))
   if(url.pathname.includes('/rpc/'))return reply(null,503)
   if(route.request().method()!=='GET')writes++
   return reply(null)
  })
  const page=await context.newPage();page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(String(e)))
  await page.goto(`http://127.0.0.1:5360/supabase/tests/marketing/behavior-harness.html?lang=${lang}`)
  await page.getByRole('button',{name:lang==='es'?'Comportamiento':'Behavior',exact:true}).click()
  const panel=page.getByTestId('intelligence-panel')
  await panel.waitFor();const buttons=page.locator('.intelligence-questions button');check(await buttons.count()===5,'five plain-language questions')
  await buttons.nth(1).click()
  if(state==='loading')await panel.getByRole('status').waitFor()
  else if(state==='error')await panel.getByRole('alert').waitFor()
  else if(state==='mfa')await panel.getByText(lang==='es'?'Verifica tu segundo factor para consultar los informes de comportamiento. El servidor comprobará también tu permiso de administrador.':'Verify your second factor to read behavior reports. The server will also check your administrator permission.').waitFor()
  else await panel.locator('.intelligence-coverage').waitFor()
  await page.evaluate(()=>document.fonts.ready)
  check(await panel.evaluate(e=>e.scrollWidth<=e.clientWidth+1),'no panel overflow')
  check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no document overflow')
  const name=`${lang}-${width}-${state}`;await panel.scrollIntoViewIfNeeded();await page.screenshot({path:out+'/'+name+'.png',fullPage:true})
  if(state==='content'){
   check(await panel.innerText().then(t=>t.includes(lang==='es'?'Guardar cuidado':'Save care')),'real task label renders')
   for(let i=0;i<5;i++){
    await buttons.nth(i).click();await panel.locator('.intelligence-coverage').waitFor();check(await panel.evaluate(e=>e.scrollWidth<=e.clientWidth+1),'each question responsive')
    await page.locator('.behavior-intro').scrollIntoViewIfNeeded();await page.screenshot({path:out+'/'+name+`-q${i}-top.png`,fullPage:true})
    await panel.scrollIntoViewIfNeeded();await page.screenshot({path:out+'/'+name+`-q${i}.png`,fullPage:true})
    if(i===3){await panel.locator('.intelligence-proposals').scrollIntoViewIfNeeded();await page.screenshot({path:out+'/'+name+'-proposals.png',fullPage:true})}
   }
   await page.keyboard.press('Tab');check(await page.evaluate(()=>document.activeElement!==document.body),'keyboard navigation works')
   await context.setOffline(true);await page.evaluate(()=>window.dispatchEvent(new Event('offline')));await page.getByText(lang==='es'?'Sin conexión. Comprueba la red y vuelve a actualizar.':'Offline. Check your connection and refresh again.').waitFor();await context.setOffline(false)
  }
  if(state==='error'||state==='loading'){
   mode='content';releases.splice(0).forEach(r=>r())
   if(state==='error')await panel.getByRole('button',{name:lang==='es'?'Reintentar tareas':'Retry tasks'}).click()
   await panel.locator('.intelligence-coverage').waitFor();check((await panel.locator('.behavior-rows li').count())>0,'report recovers without app restart')
  }
  check(!await panel.innerText().then(t=>/97000000|96000000|SYNTHETIC_OUTAGE/.test(t)),'no IDs or raw service diagnostics')
  cases.push({lang,width,state,status:'PASS',capture:name+'.png'});await context.close()
 }
 check(errors.length===0,'zero page errors');check(writes===0,'zero hosted writes')
 fs.writeFileSync(out+'/results.json',JSON.stringify({status:'PASS',checks,cases,errors,hostedWrites:writes,nativeAdmin:true,backend:'Isolated PostgreSQL17 actual RPC; Auth double; paused/protected/error/loading/MFA response scenarios'},null,2)+'\n')
 console.log(JSON.stringify({status:'PASS',checks,cases:cases.length,hostedWrites:writes,errors}))
}finally{await browser?.close();await server.close()}
