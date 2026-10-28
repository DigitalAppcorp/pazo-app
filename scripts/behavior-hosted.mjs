// Actual immutable staging assets -> native app/Admin -> disposable PG17 reports.
// All Auth/domain services are intercepted. No remote QA account or event is created.
import './behavior-pg17.mjs'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {createRequire} from 'node:module'
import {hostedAssetTransport} from './hosted-asset-transport.mjs'
import {sql} from './marketing-sql-lab.mjs'
import {createServer} from 'vite'
const localEnabled=process.env.PAZO_BEHAVIOR_ENABLED_TEST==='true'
const origin=localEnabled?'http://127.0.0.1:5359':process.env.PAZO_HOSTED_ORIGIN
if(!localEnabled)assert.match(origin??'',/^https:\/\/pazo-[a-z0-9]+-digitalapp\.vercel\.app$/)
process.env.VITE_SUPABASE_URL='https://mrybvqdebbgcayuvgkkr.supabase.co'
process.env.VITE_SUPABASE_PUBLISHABLE_KEY='sb_publishable_synthetic'
const server=localEnabled?await createServer({server:{host:'127.0.0.1',port:5359,strictPort:true},logLevel:'error'}):null
const hosted=localEnabled?null:hostedAssetTransport(origin),require=createRequire(import.meta.url)
const {chromium}=require(process.env.PAZO_PLAYWRIGHT_MODULE||'../../continuidad/f18-browser-tools/node_modules/playwright')
const out=path.resolve(process.env.PAZO_BEHAVIOR_OUTPUT||(localEnabled?'artifacts/issue150/enabled':'artifacts/issue150/staging'));fs.mkdirSync(out,{recursive:true})
const owner=localEnabled?'96000000-0000-4000-8000-000000000028':'96000000-0000-4000-8000-000000000031',pet='97000000-0000-4000-8000-000000000002',now=new Date().toISOString()
if(localEnabled)sql(`INSERT INTO public.pets VALUES('${pet}','${owner}',now()) ON CONFLICT DO NOTHING`)
const user={id:owner,aud:'authenticated',role:'authenticated',email:'synthetic@invalid.example',created_at:now,email_confirmed_at:now,app_metadata:localEnabled?{}:{pazo_marketing_qa:true},user_metadata:{}}
const token=[{alg:'HS256',typ:'JWT'},{sub:owner,role:'authenticated',aud:'authenticated',aal:'aal2',exp:Math.floor(Date.now()/1000)+3600,session_id:'synthetic'},'synthetic'].map(v=>Buffer.from(typeof v==='string'?v:JSON.stringify(v)).toString('base64url')).join('.')
const session={access_token:token,refresh_token:'synthetic',expires_at:Math.floor(Date.now()/1000)+3600,expires_in:3600,token_type:'bearer',user}
sql("UPDATE marketing_private.acquisition SET creative='qr_es' WHERE owner_id='96000000-0000-4000-8000-000000001000'")
const q=s=>"'"+String(s).replaceAll("'","''")+"'"
const report=args=>JSON.parse(sql(`SET ROLE authenticated;SET "request.jwt.claim.sub"='96000000-0000-4000-8000-000000000031';SET "request.jwt.claims"='{"aal":"aal2"}';SELECT public.pazo_admin_behavior_summary_v1(${args.p_days},${q(args.p_segment)},${q(args.p_creative)})`))
const results=[],errors=[];let browser,newCollectionCalls=0
try{
 await server?.listen()
 browser=await chromium.launch({headless:true,...(process.env.PAZO_CHROMIUM_PATH?{executablePath:process.env.PAZO_CHROMIUM_PATH}:{channel:process.platform==='win32'?'msedge':undefined})})
 const cases=localEnabled?[{lang:'es',width:390,gpc:false},{lang:'en',width:390,gpc:false},{lang:'es',width:390,gpc:true}]:['es','en'].flatMap(lang=>[390,1440].map(width=>({lang,width,gpc:false})))
 for(const {lang,width,gpc} of cases){
  console.log(`CASE ${localEnabled?'enabled':'staging'} ${lang} ${width} GPC=${gpc}`)
  const callsBefore=newCollectionCalls
  let created=false,failReport=false
  const context=await browser.newContext({viewport:{width,height:900},locale:lang==='es'?'es-GT':'en-US',reducedMotion:'reduce',serviceWorkers:'block'})
  await context.route('**/*',async route=>{
   const req=route.request(),url=new URL(req.url())
   if(url.origin===origin){
    if(localEnabled&&url.pathname==='/src/features/marketing/behaviorRuntime.ts'){
     const r=await route.fetch(),source=await r.text();assert.match(source,/const BEHAVIOR_COLLECTION_ENABLED = false/)
     return route.fulfill({response:r,body:source.replace('const BEHAVIOR_COLLECTION_ENABLED = false','const BEHAVIOR_COLLECTION_ENABLED = true')})
    }
    return hosted?route.fulfill({status:200,...await hosted(url.href)}):route.continue()
   }
   if(['fonts.googleapis.com','fonts.gstatic.com'].includes(url.hostname))return route.continue()
   if(url.hostname!=='mrybvqdebbgcayuvgkkr.supabase.co')return route.abort()
   const respond=(data,status=200)=>route.fulfill({status,contentType:'application/json',headers:{'content-range':'0-0/0'},body:JSON.stringify(data)})
   const rpc=url.pathname.split('/rpc/')[1],table=url.pathname.split('/rest/v1/')[1]
   if(url.pathname.startsWith('/auth/v1/user'))return respond(user)
   if(url.pathname.startsWith('/auth/v1/token'))return respond(session)
   if(rpc){
    if(localEnabled&&rpc==='pazo_behavior_withdraw_v1')return respond(sql(`SET ROLE authenticated;SET "request.jwt.claim.sub"='${owner}';SELECT public.pazo_behavior_withdraw_v1()`)==='t')
    if(['pazo_admin_overview','pazo_admin_users','pazo_admin_experiments'].includes(rpc))return respond({code:'ISOLATED_OTHER_SECTION_OUTAGE'},503)
    if(rpc==='pazo_admin_behavior_summary_v1')return failReport?respond({code:'SYNTHETIC_DOWNTIME'},503):respond(report(JSON.parse(req.postData())))
    if(rpc==='pazo_behavior_record_v1'){
     newCollectionCalls++;if(!localEnabled)return respond(false)
     assert.equal(req.headers().authorization,'Bearer '+token)
     const a=JSON.parse(req.postData());assert.ok(!('p_owner' in a));const accepted=sql(`SET ROLE authenticated;SET "request.jwt.claim.sub"='${owner}';SELECT public.pazo_behavior_record_v1(${q(a.p_session)},${Number(a.p_seq)},${q(a.p_screen)},${q(a.p_event)},${q(a.p_category)})`)==='t'
     return respond(accepted)
    }
    if(rpc==='pazo_is_admin')return respond(true)
    if(['f14_is_moderator','pazo_marketing_record_utility_v1'].includes(rpc))return respond(false)
    if(rpc==='pazo_public_maintenance_status')return respond({enabled:false,message_es:'',message_en:'',updated_at:now})
    if(rpc==='pazo_supporter_public_badges_batch')return respond(JSON.parse(req.postData()).p_pet_ids.map(pet_id=>({pet_id,badge:false,milestone:0})))
    if(rpc==='create_pet_profile'){created=true;return respond(pet)}
    if(rpc==='pazo_ensure_my_profile')return respond(null)
    return respond([])
   }
   if(table==='pets'){
    const row={id:pet,owner_id:owner,name:'Luna',species:'gato',breed:'',age:'',gender:'hembra',photo_url:origin+'/pwa-icon-192.png',is_lost:false,created_at:now}
    return respond((req.headers().accept||'').includes('vnd.pgrst.object')?(created?row:null):(created?[row]:[]))
   }
   if((req.headers().accept||'').includes('vnd.pgrst.object'))return respond({id:owner,is_founder:false,notifications_enabled:true})
   return respond([])
  })
  await context.addInitScript(({session,lang})=>{localStorage.setItem('sb-mrybvqdebbgcayuvgkkr-auth-token',JSON.stringify(session));localStorage.setItem('pazo_lang_v1',lang)},{session,lang})
  if(gpc)await context.addInitScript(()=>Object.defineProperty(navigator,'globalPrivacyControl',{value:true}))
  const page=await context.newPage();page.setDefaultTimeout(30000);page.on('pageerror',e=>errors.push(e.message))
  await page.goto(origin,{waitUntil:'domcontentloaded',timeout:90000})
  console.log('App document loaded')
  await page.getByPlaceholder(lang==='es'?'Ej: Luna, Bruno, Nube...':'E.g. Luna, Bruno, Cloud...').fill('Luna')
  await page.getByRole('button',{name:lang==='es'?'Continuar':'Continue',exact:true}).click()
  await page.getByRole('button',{name:lang==='es'?'Crear perfil y entrar':'Create profile and enter',exact:true}).click()
  console.log('Native onboarding completed')
  const nav=page.getByRole('navigation',{name:'Navegación de PAZO'});await nav.waitFor();await page.keyboard.press('Escape')
  await nav.getByRole('button',{name:lang==='es'?'Mi mascota':'My Pet',exact:true}).click()
  if(localEnabled&&!gpc){
   for(const [es,en,screen]of [['Inicio','Home','home'],['Comunidades','Communities','communities'],['Mapa','Map','places'],['Mi mascota','My Pet','pet']]){
    console.log(`Observe ${screen}`)
    await Promise.all([page.waitForResponse(r=>r.url().includes('/rpc/pazo_behavior_record_v1')&&JSON.parse(r.request().postData()||'{}').p_screen===screen),nav.getByRole('button',{name:lang==='es'?es:en,exact:true}).click()]).catch(async e=>{await page.screenshot({path:out+'/failure.png',fullPage:true});console.error({screen,newCollectionCalls,errors,body:(await page.locator('body').innerText()).slice(0,1800),debug:await page.evaluate(async()=>({enabled:(await import('/src/features/marketing/behaviorRuntime.ts')).BEHAVIOR_COLLECTION_ENABLED,visibility:document.visibilityState,gpc:navigator.globalPrivacyControl}))});throw e})
   }
   const screens=JSON.parse(sql(`SELECT json_agg(DISTINCT screen) FROM marketing_private.behavior_events e JOIN marketing_private.behavior_sessions s ON s.id=e.session_id WHERE s.owner_id='${owner}'`))
   for(const screen of ['home','communities','places','pet'])assert.ok(screens.includes(screen))
  }
  await page.getByRole('button',{name:lang==='es'?'Centro de control':'Control center',exact:true}).click()
  await page.locator('button:visible').filter({hasText:lang==='es'?/^Comportamiento$/:/^Behavior$/}).first().click().catch(async e=>{await page.screenshot({path:out+'/failure.png',fullPage:true});console.error({errors,body:(await page.locator('body').innerText()).slice(0,3500)});throw e})
  await page.locator('.behavior-coverage').waitFor()
  assert.equal(await page.locator('.behavior-funnel li').count(),4)
  await page.evaluate(lang=>{const e=document.createElement('div');e.textContent=lang==='es'?'QA · Datos sintéticos · Backend aislado':'QA · Synthetic data · Isolated backend';e.style.cssText='position:fixed;bottom:0;right:0;z-index:10000;background:#f8edc9;color:#204e4a;font:600 11px system-ui;padding:6px 10px;pointer-events:none';document.body.append(e)},lang)
  const name=`${lang}-${width}`
  await page.screenshot({path:out+'/'+name+'-overview.png',fullPage:true})
  await page.locator('.behavior-funnel').scrollIntoViewIfNeeded();await page.screenshot({path:out+'/'+name+'-funnel.png',fullPage:true})
  await page.getByRole('button',{name:lang==='es'?'¿Qué usan al volver?':'What do people use on return?',exact:true}).click()
  await page.getByRole('heading',{name:lang==='es'?'Qué usan al regresar':'What people use on return',exact:true}).scrollIntoViewIfNeeded();await page.screenshot({path:out+'/'+name+'-return.png',fullPage:true})
  failReport=true;await page.getByRole('button',{name:lang==='es'?'Actualizar datos':'Refresh data',exact:true}).click();await page.getByRole('alert').waitFor()
  failReport=false;await page.getByRole('button',{name:lang==='es'?'Reintentar informe':'Retry report',exact:true}).click();await page.locator('.behavior-coverage').waitFor()
  if(localEnabled&&!gpc&&lang==='en'){
   assert.equal(await page.evaluate(async()=>{const module=await import('/src/features/marketing/behaviorRuntime.ts');return module.withdrawBehavior()}),true)
   assert.equal(sql(`SELECT count(*) FROM marketing_private.behavior_sessions WHERE owner_id='${owner}'`),'0','actual browser withdrawal deletes active sessions')
  }
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))
  if(gpc)assert.equal(newCollectionCalls,callsBefore,'GPC performs no new collection')
  results.push({lang,width,gpc,status:'PASS',nativeAppAdmin:true,source:origin,backend:'disposable PG17',auth:'synthetic controlled',localRetry:true})
  await context.close();console.log(`PASS hosted ${lang} ${width}`)
 }
 assert.equal(errors.length,0);if(localEnabled)assert.ok(newCollectionCalls>0);else assert.equal(newCollectionCalls,0)
 fs.writeFileSync(out+'/results.json',JSON.stringify({status:'PASS',origin,results,errors,newCollectionCalls,hostedWrites:0,collectionCandidate:localEnabled?'Enabled only by isolated test transport':'OFF'},null,2)+'\n')
 console.log(JSON.stringify({status:'PASS',cases:results.length,errors,newCollectionCalls,hostedWrites:0}))
}finally{await browser?.close();await server?.close()}
