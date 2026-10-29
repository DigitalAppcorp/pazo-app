// Native Administration -> actual aggregate RPC in isolated PG17. Auth is a controlled double.
import './behavior-pg17.mjs'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {createRequire} from 'node:module'
import {createServer} from 'vite'
import {sql} from './marketing-sql-lab.mjs'
const require=createRequire(import.meta.url)
const {chromium}=require(process.env.PAZO_PLAYWRIGHT_MODULE||'../../continuidad/f18-browser-tools/node_modules/playwright')
const out=path.resolve(process.env.PAZO_BEHAVIOR_OUTPUT||'artifacts/issue150/browser');fs.mkdirSync(out,{recursive:true})
if(fs.existsSync(out+'/results.json'))fs.unlinkSync(out+'/results.json')
const q=s=>"'"+String(s).replaceAll("'","''")+"'"
sql("UPDATE marketing_private.acquisition SET creative='qr_es' WHERE owner_id='96000000-0000-4000-8000-000000001000'")
const report=(period,segment,creative)=>JSON.parse(sql(`SET ROLE authenticated;SET "request.jwt.claim.sub"='96000000-0000-4000-8000-000000000031';SET "request.jwt.claims"='{"aal":"aal2"}';SELECT public.pazo_admin_behavior_summary_v1(${period},${q(segment)},${q(creative)})`))
process.env.VITE_SUPABASE_URL='https://mrybvqdebbgcayuvgkkr.supabase.co'
process.env.VITE_SUPABASE_PUBLISHABLE_KEY='sb_publishable_synthetic'
const server=await createServer({server:{host:'127.0.0.1',port:5358,strictPort:true},logLevel:'error'})
const cases=[],errors=[];let checks=0,hostedWrites=0
const check=(value,message)=>{assert.ok(value,message);checks++}
let browser
try{
 await server.listen();browser=await chromium.launch({headless:true,...(process.env.PAZO_CHROMIUM_PATH?{executablePath:process.env.PAZO_CHROMIUM_PATH}:{channel:process.platform==='win32'?'msedge':undefined})})
 for(const lang of ['es','en'])for(const width of [320,390,430,1440])for(const state of ['content','paused','insufficient','error','loading','access']){
  let mode=state,releases=[],calls=0
  const context=await browser.newContext({viewport:{width,height:900},locale:lang==='es'?'es-GT':'en-US',reducedMotion:'reduce',serviceWorkers:'block'})
  await context.route('**/*',async route=>{
   const url=new URL(route.request().url())
   if(url.origin==='http://127.0.0.1:5358')return route.continue()
   if(['fonts.googleapis.com','fonts.gstatic.com'].includes(url.hostname))return route.continue()
   if(url.hostname!=='mrybvqdebbgcayuvgkkr.supabase.co')return route.abort()
   const respond=(data,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)})
   if(url.pathname==='/auth/v1/user')return respond(null,401)
   if(url.pathname.includes('/rpc/pazo_admin_behavior_summary_v1')){
    calls++;const args=JSON.parse(route.request().postData())
    if(mode==='loading')await new Promise(r=>releases.push(r))
    if(mode==='error')return respond({code:'SYNTHETIC_OUTAGE'},503)
    if(mode==='access')return respond({code:'42501',message:'admin_required'},403)
    if(mode==='paused'){
     sql('UPDATE marketing_private.collection_gate SET behavior_enabled=false');const r=report(args.p_days,args.p_segment,args.p_creative);sql('UPDATE marketing_private.collection_gate SET behavior_enabled=true');return respond(r)
    }
    return respond(report(args.p_days,args.p_segment,mode==='insufficient'?'perfil_es':args.p_creative))
   }
   // Other queries intentionally fail: new panel must remain independent.
   if(url.pathname.includes('/rpc/'))return respond({code:'ISOLATED_OTHER_SECTION'},503)
   if(route.request().method()!=='GET')hostedWrites++
   return respond(null)
  })
  const page=await context.newPage();page.setDefaultTimeout(15000);page.on('pageerror',e=>{errors.push(String(e));console.error(String(e))})
  await page.goto(`http://127.0.0.1:5358/supabase/tests/marketing/behavior-harness.html?lang=${lang}`)
  if(width<1024)await page.getByRole('combobox',{name:lang==='es'?'Secciones del panel':'Dashboard sections'}).selectOption('behavior');else await page.getByRole('button',{name:lang==='es'?'Comportamiento':'Behavior',exact:true}).click()
  await page.locator('.pa-details').filter({has:page.locator('summary').filter({hasText:lang==='es'?'Explorar tareas':'Explore tasks'})}).locator('summary').first().click()
  await page.getByTestId('behavior-panel').waitFor()
  if(state==='loading')await page.getByRole('status').filter({hasText:lang==='es'?'Consultando recorridos':'Loading aggregate'}).waitFor()
  else if(state==='error')await page.getByRole('alert').filter({hasText:lang==='es'?'No pudimos consultar este informe':'This report could not be loaded'}).waitFor()
  else if(state==='access'){await page.getByRole('alert').filter({hasText:lang==='es'?'No pudimos consultar este informe':'This report could not be loaded'}).waitFor();check(await page.locator('[data-pazo-admin-live-mfa]').count()===0,'admin denial never starts an authenticator challenge')}
  else await page.locator('.behavior-coverage').waitFor()
  await page.evaluate(()=>document.fonts.ready)
  check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no document overflow')
  check(await page.locator('.behavior-panel').evaluate(e=>e.scrollWidth<=e.clientWidth+1),'no panel overflow')
  if(state==='content'){
   check(await page.locator('.behavior-funnel li').count()===4,'four coherent funnel stages')
   check(await page.locator('.behavior-panel').innerText().then(t=>!t.includes('96000000')),'no identities rendered')
  }
  const name=`${lang}-${width}-${state}`;await page.screenshot({path:out+'/'+name+'.png',fullPage:true})
  if(state==='content'){
   await page.locator('.behavior-funnel').scrollIntoViewIfNeeded();await page.screenshot({path:out+'/'+name+'-funnel.png',fullPage:true})
   await page.locator('.behavior-rows').first().scrollIntoViewIfNeeded();await page.screenshot({path:out+'/'+name+'-paths.png',fullPage:true})
   await page.getByRole('button',{name:lang==='es'?'¿Qué usan al volver?':'What do people use on return?',exact:true}).click()
   check(await page.locator('.behavior-funnel').count()===0,'plain-language views separate acquisition and return')
   await page.getByRole('heading',{name:lang==='es'?'Qué usan al regresar':'What people use on return',exact:true}).scrollIntoViewIfNeeded()
   await page.screenshot({path:out+'/'+name+'-return.png',fullPage:true})
   await page.getByRole('button',{name:lang==='es'?'¿Hasta dónde llegan los anuncios?':'How far do ad arrivals get?',exact:true}).click()
  }
  // Scrollable native admin main is captured separately for complete lower sections.
  const scroll=page.locator('[role="dialog"]').first()
  const target=await page.locator('.behavior-footnote').count()
  if(target){await page.locator('.behavior-footnote').scrollIntoViewIfNeeded();await page.screenshot({path:out+'/'+name+'-lower.png',fullPage:true})}
  if(state==='error'||state==='loading'){
   mode='content';releases.splice(0).forEach(r=>r())
   if(state==='error')await page.getByRole('button',{name:lang==='es'?'Reintentar informe':'Retry report'}).click()
   await page.locator('.behavior-coverage').waitFor();check(await page.locator('.behavior-funnel li').count()===4,'local recovery without restarting Administration')
  }
  if(width===390&&state==='content'){
   await page.locator('.behavior-filter-disclosure summary').click()
   const source=page.getByLabel(lang==='es'?'Origen de cuenta':'Account source');await source.selectOption('unknown');await page.locator('.behavior-coverage').waitFor();check(await page.locator('.behavior-funnel li').count()===0,'unknown source never paid funnel')
   await source.selectOption('paid_attributed');await page.locator('.behavior-coverage').waitFor();check(await page.locator('.behavior-funnel li').count()===4,'source filter refresh')
   await page.keyboard.press('Tab');check(await page.evaluate(()=>document.activeElement?.tagName==='SELECT'||document.activeElement?.tagName==='BUTTON'||document.activeElement?.tagName==='A'),'keyboard focus remains actionable')
  }
  cases.push({lang,width,state,calls,status:'PASS',data:'synthetic isolated PG17, Auth double',capture:name+'.png'})
  if(state==='access')console.log(`PASS ${lang} ${width}: six states`)
  await context.close()
 }
 check(errors.length===0,'zero page errors');check(hostedWrites===0,'zero hosted writes')
 fs.writeFileSync(out+'/results.json',JSON.stringify({status:'PASS',checks,cases,errors,hostedWrites,nativeAdmin:true,backend:'disposable PG17 real aggregate RPC'},null,2)+'\n')
 console.log(JSON.stringify({status:'PASS',checks,cases:cases.length,errors,hostedWrites,output:out}))
}finally{await browser?.close();await server.close()}
