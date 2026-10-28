// Actual React/Auth/service code -> intercepted Data API -> disposable PG17.
// No remote Auth, hosted rows, payments or ad traffic.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {createRequire} from 'node:module'
import {createServer} from 'vite'
import {hostedAssetTransport} from './hosted-asset-transport.mjs'
import {prepareMarketingLab,sql,file,runMockCron} from './marketing-sql-lab.mjs'
const require=createRequire(import.meta.url)
const {chromium}=require(process.env.PAZO_PLAYWRIGHT_MODULE||'../../continuidad/f18-browser-tools/node_modules/playwright')
const out=path.resolve(process.env.PAZO_UTILITY_OUTPUT||'artifacts/issue142-utility')
const contextual=process.env.PAZO_CONTEXTUAL_TEST==='true'
fs.mkdirSync(out,{recursive:true})
await prepareMarketingLab()
const careSource=fs.readFileSync('supabase/migrations/20261006054510_care_agenda.sql','utf8')
const careTable=careSource.match(/CREATE TABLE public\.care_items \([\s\S]*?\r?\n\);/)?.[0]
assert.ok(careTable);sql(careTable)
sql(`ALTER TABLE public.care_items ENABLE ROW LEVEL SECURITY;ALTER TABLE public.care_items FORCE ROW LEVEL SECURITY;
 GRANT SELECT,INSERT ON public.care_items TO authenticated;GRANT SELECT,INSERT ON public.pets TO authenticated;
 ALTER TABLE public.pets ENABLE ROW LEVEL SECURITY;ALTER TABLE public.pets FORCE ROW LEVEL SECURITY;
 CREATE POLICY own_pets ON public.pets TO authenticated USING(owner_id=auth.uid()) WITH CHECK(owner_id=auth.uid());
 GRANT USAGE ON SCHEMA auth TO authenticated;GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated;
 CREATE POLICY own_care ON public.care_items TO authenticated USING(EXISTS(SELECT 1 FROM public.pets p WHERE p.id=pet_id AND p.owner_id=auth.uid()))
 WITH CHECK(EXISTS(SELECT 1 FROM public.pets p WHERE p.id=pet_id AND p.owner_id=auth.uid()));`)
file('supabase/migrations/'+fs.readdirSync('supabase/migrations').find(x=>x.endsWith('_pazo_first_utility_outcomes.sql')))
sql("UPDATE marketing_private.collection_gate SET retention_days=14,policy_version='pazo-marketing-attribution-notice-v1'")
file('supabase/tests/marketing/cron-provider-mock.sql');sql('SELECT marketing_private.install_retention_schedule()');runMockCron()
sql("UPDATE marketing_private.collection_gate SET enabled=true,enabled_at=now(),utility_enabled=true,utility_started_at=now()-interval '2 days',utility_notice_version='pazo-first-utility-notice-v1'")
process.env.VITE_SUPABASE_URL='https://mrybvqdebbgcayuvgkkr.supabase.co'
process.env.VITE_SUPABASE_PUBLISHABLE_KEY='sb_publishable_synthetic'
const origin=process.env.PAZO_HOSTED_ORIGIN||'http://127.0.0.1:5352'
const hostedAsset=process.env.PAZO_HOSTED_ORIGIN?hostedAssetTransport(origin):null
const server=hostedAsset?null:await createServer({server:{host:'127.0.0.1',port:5352,strictPort:true}})
const id=n=>'98000000-0000-4000-8000-'+String(n).padStart(12,'0')
const q=v=>v===null||v===undefined?'NULL':"'"+String(v).replaceAll("'","''")+"'"
const now=new Date().toISOString(),admin=id(999)
sql(`INSERT INTO auth.users(id,created_at,email_confirmed_at) VALUES('${admin}',now(),now());INSERT INTO public.profiles(id) VALUES('${admin}');INSERT INTO admin_private.admin_grants VALUES('${admin}')`)
const jwt=owner=>[{alg:'HS256',typ:'JWT'},{sub:owner,role:'authenticated',aud:'authenticated',exp:Math.floor(Date.now()/1000)+3600,iat:Math.floor(Date.now()/1000),session_id:id(998)},'synthetic'].map(x=>Buffer.from(typeof x==='string'?x:JSON.stringify(x)).toString('base64url')).join('.')
let browser;const evidence=[]
try{
 await server?.listen();browser=await chromium.launch({headless:true,...(process.env.PAZO_CHROMIUM_PATH?{executablePath:process.env.PAZO_CHROMIUM_PATH}:{channel:process.platform==='win32'?'msedge':undefined})})
 let number=0
 for(const lang of ['es','en'])for(const width of [320,390,430]){
  const owner=id(++number),pet=id(number+100),registered=new Date().toISOString()
  let petCreated=!contextual
  sql(`INSERT INTO auth.users(id,created_at,email_confirmed_at) VALUES('${owner}',${q(registered)},${q(registered)});INSERT INTO public.profiles(id) VALUES('${owner}');${contextual?'':`INSERT INTO public.pets VALUES('${pet}','${owner}',now())`}`)
  const user={id:owner,aud:'authenticated',role:'authenticated',email:'qa@invalid.example',created_at:registered,email_confirmed_at:registered,app_metadata:{provider:'email',providers:['email']},user_metadata:{}}
  const session={access_token:jwt(owner),refresh_token:'synthetic',expires_at:Math.floor(Date.now()/1000)+3600,token_type:'bearer',expires_in:3600,user}
  let metricRequests=[],shares='cancel',errors=[],feedPending=true,releaseFeed=[],failMetric=false
  const tx=query=>sql(`BEGIN;SET LOCAL ROLE authenticated;SET LOCAL "request.jwt.claim.sub"='${owner}';${query};COMMIT`)
  const json=query=>JSON.parse(tx(query).split('\n').at(-1)||'null')
  const context=await browser.newContext({viewport:{width,height:844},locale:lang==='es'?'es-GT':'en-US',isMobile:true,hasTouch:true,reducedMotion:'reduce',serviceWorkers:'block',acceptDownloads:true})
  await context.route('**/*',async route=>{
   const req=route.request(),url=new URL(req.url())
   if(url.origin===origin)return hostedAsset?route.fulfill({status:200,...await hostedAsset(url.href)}):route.continue()
   if(url.hostname!=='mrybvqdebbgcayuvgkkr.supabase.co')return route.abort()
   const rpc=url.pathname.split('/rpc/')[1],table=url.pathname.split('/rest/v1/')[1]
   const value=req.postData()?JSON.parse(req.postData()):{}
   const respond=(data,status=200)=>route.fulfill({status,contentType:'application/json',headers:{'content-range':'0-0/0'},body:JSON.stringify(data)})
   try{
    if(url.pathname==='/functions/v1/pazo-marketing-attribution'){
     assert.equal(value.utm_source,'meta');assert.equal(value.utm_medium,'paid_social');assert.equal(value.utm_campaign,'pazo_beta_local_202610')
     const accepted=sql(`SET ROLE service_role;SELECT public.pazo_marketing_record_verified_v1('${owner}',${q(value.utm_content)},${q(value.first_touch_at)})`)==='t'
     return respond({status:accepted?'accepted':'ignored'},accepted?202:409)
    }
    if(url.pathname.startsWith('/auth/v1/user'))return respond(user)
    if(url.pathname.startsWith('/auth/v1/token'))return respond(session)
    if(rpc){
     if(rpc==='pazo_public_maintenance_status')return respond({enabled:false,message_es:'',message_en:'',updated_at:now})
     if(rpc==='pazo_ensure_my_profile')return respond(null)
     if(rpc==='create_pet_profile'){
      assert.equal(value.p_name,'Luna');assert.equal(petCreated,false)
      tx(`INSERT INTO public.pets VALUES('${pet}','${owner}',now())`);petCreated=true;return respond(pet)
     }
     if(['pazo_is_admin','f14_is_moderator'].includes(rpc))return respond(false)
     if(rpc==='pazo_marketing_record_utility_v1'){
      metricRequests.push(value.p_event)
      if(failMetric)return respond({message:'synthetic offline metric'},503)
      return respond(json(`SELECT to_json(public.pazo_marketing_record_utility_v1(${q(value.p_pet)},${q(value.p_event)}))`))
     }
     if(rpc.includes('public_token'))return respond(id(997))
     return respond([])
    }
    if(table==='pets'){
     const row={id:pet,owner_id:owner,name:'Luna',species:'gato',breed:'QA',age:'3 años',gender:'hembra',photo_url:origin+'/pwa-icon-192.png',is_lost:false,created_at:now}
     return respond((req.headers().accept||'').includes('vnd.pgrst.object')?(petCreated?row:null):(petCreated?[row]:[]))
    }
    if(table==='pet_public_links')return respond({public_token:id(997)})
    if(table==='follows'){if(feedPending)await new Promise(r=>releaseFeed.push(r));return respond([])}
    if(table==='care_items'){
     if(req.method()==='POST'){
      const columns=['pet_id','title','category','due_date','due_time','timezone','recurrence','reminder_days_before','notes']
      assert.ok(Object.keys(value).every(x=>columns.includes(x)))
      const row=json(`INSERT INTO public.care_items(${columns.join(',')}) VALUES(${columns.map(k=>q(value[k])).join(',')}) RETURNING row_to_json(care_items)`)
      return respond(row)
     }
     return respond(json(`SELECT coalesce(json_agg(c),'[]') FROM public.care_items c WHERE pet_id='${pet}' AND status='active'`))
    }
    if(req.method()!=='GET'&&req.method()!=='HEAD')return respond({message:'unrelated write refused'},403)
    if((req.headers().accept||'').includes('vnd.pgrst.object'))return respond(null)
    return respond([])
   }catch(error){console.error('Isolated backend:',error.message);return respond({message:'isolated backend rejected request'},403)}
  })
  if(context.routeWebSocket)await context.routeWebSocket('**/*',ws=>ws.close())
  await context.addInitScript(({session,lang,contextual,width,owner})=>{
   localStorage.clear();localStorage.setItem('sb-mrybvqdebbgcayuvgkkr-auth-token',JSON.stringify(session));localStorage.setItem('pazo_language_preference_v1',lang)
   window.__shareMode='cancel'
   if(contextual&&width!==320){
    const firstTouchAt=Date.now()
    localStorage.setItem('pazo_marketing_firstparty_v1',JSON.stringify({version:1,attribution:{source:'meta',medium:'paid_social',campaign:'pazo_beta_local_202610',creative:lang==='es'?'qr_es':'qr_en',firstTouchAt},steps:['landing','signup_requested','signup_verified'],signupRequestedAt:firstTouchAt,signupOwnerId:owner}))
   }
   Object.defineProperty(navigator,'share',{configurable:true,value:async()=>{if(window.__shareMode==='cancel')throw new DOMException('cancelled','AbortError')}})
  },{session,lang,contextual,width,owner})
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(origin,{waitUntil:'domcontentloaded',timeout:hostedAsset?90000:30000})
  const nav=page.getByRole('navigation',{name:'Navegación de PAZO'})
  if(contextual){
   await page.getByPlaceholder(lang==='es'?'Ej: Luna, Bruno, Nube...':'E.g. Luna, Bruno, Cloud...').fill('Luna')
   await page.getByRole('button',{name:lang==='es'?'Continuar':'Continue',exact:true}).click()
   await page.getByRole('button',{name:lang==='es'?'Crear perfil y entrar':'Create profile and enter',exact:true}).click()
   const hint=page.getByRole('region',{name:lang==='es'?'Para empezar':'To get started'})
   await hint.waitFor();assert.equal(feedPending,true)
   assert.equal(await nav.getByRole('button',{name:lang==='es'?'Mi mascota':'My Pet',exact:true}).getAttribute('aria-current'),'page')
   assert.equal(sql(`SELECT count(*) FROM public.pets WHERE id='${pet}' AND owner_id='${owner}'`),'1')
   await page.screenshot({path:path.join(out,`${lang}-${width}-first-use.png`)})
   if(width!==320)assert.ok((await hint.innerText()).includes(lang==='es'?'Abre su pasaporte':'Open their passport'))
   for(const b of await hint.getByRole('button').all()){const r=await b.boundingBox();assert.ok(r.height>=44);assert.ok(r.x>=0&&r.x+r.width<=width)}
   if(width===320)await hint.getByRole('button',{name:lang==='es'?'Explorar PAZO':'Explore PAZO',exact:true}).click()
   else await page.getByText(width===390?(lang==='es'?'Pasaporte y QR':'Passport & QR'):(lang==='es'?'Cuidados y Agenda':'Care & Agenda'),{exact:true}).click()
   await hint.waitFor({state:'detached'})
   if(width===390)await page.getByRole('button',{name:lang==='es'?'Cerrar':'Close',exact:true}).click()
   if(width===430)await page.getByRole('button',{name:lang==='es'?'Cerrar':'Close',exact:true}).click()
  }
  await nav.waitFor()
  await nav.getByRole('button',{name:lang==='es'?'Mi mascota':'My Pet',exact:true}).click()
  await page.getByText(lang==='es'?'Pasaporte y QR':'Passport & QR',{exact:true}).click()
  await page.getByRole('img',{name:'Pazo · Luna',exact:true}).waitFor()
  if(contextual){
   const dialog=page.getByRole('dialog',{name:lang==='es'?'Pasaporte de Luna':"Luna's Passport",exact:true})
   const close=dialog.getByRole('button',{name:lang==='es'?'Cerrar':'Close',exact:true})
   const box=await close.boundingBox();assert.ok(box.width>=44&&box.height>=44)
   await close.focus();await page.keyboard.press('Shift+Tab')
   assert.ok(await dialog.evaluate(d=>d.contains(document.activeElement)))
   await page.keyboard.press('Tab');assert.ok(await close.evaluate(b=>document.activeElement===b))
   await page.keyboard.press('Escape');await dialog.waitFor({state:'detached'})
   await page.getByText(lang==='es'?'Pasaporte y QR':'Passport & QR',{exact:true}).click()
   await page.getByRole('img',{name:'Pazo · Luna',exact:true}).waitFor()
  }
  await page.waitForFunction(()=>Boolean(document.querySelector('svg[aria-label="Pazo · Luna"]')))
  await page.waitForTimeout(100)
  assert.ok(metricRequests.includes('qr_visible'))
  await page.getByRole('button',{name:lang==='es'?'Compartir':'Share',exact:true}).click();assert.ok(!metricRequests.includes('qr_share_confirmed'))
  await page.evaluate(()=>window.__shareMode='success')
  await page.getByRole('button',{name:lang==='es'?'Compartir':'Share',exact:true}).click()
  await page.waitForTimeout(100);assert.ok(metricRequests.includes('qr_share_confirmed'))
  failMetric=true
  const download=page.waitForEvent('download');await page.getByRole('button',{name:lang==='es'?'Descargar QR':'Download QR',exact:true}).click();await download
  await page.screenshot({path:path.join(out,`${lang}-${width}-qr.png`)})
  await page.getByRole('heading',{name:lang==='es'?'Pasaporte de Luna':"Luna's Passport",exact:true}).locator('..').locator('..').getByRole('button').click();failMetric=false
  await page.getByText(lang==='es'?'Cuidados y Agenda':'Care & Agenda',{exact:true}).click()
  await page.getByRole('button',{name:lang==='es'?/Añadir nuevo cuidado/:/Add care item/}).click()
  // Labels are read from the real existing form, not replaced by a test UI.
  await (contextual?page.getByLabel(lang==='es'?'Título':'Title',{exact:true}):page.getByPlaceholder(lang==='es'?'Ej: Vacuna anual':'Example: Annual vaccine',{exact:true})).fill('QA persisted care')
  if(contextual)assert.ok(await page.getByRole('dialog').locator('label').evaluateAll(labels=>labels.every(label=>label.htmlFor&&document.getElementById(label.htmlFor))))
  await page.getByRole('button',{name:lang==='es'?'Guardar cuidado':'Save care',exact:true}).click()
  await page.getByText('QA persisted care',{exact:true}).first().waitFor()
  assert.equal(sql(`SELECT count(*) FROM public.care_items WHERE pet_id='${pet}' AND title='QA persisted care'`),'1')
  const outcome=JSON.parse(sql(`SELECT row_to_json(o) FROM marketing_private.utility_outcomes o WHERE owner_id='${owner}'`))
  assert.ok(outcome.care_created_at&&outcome.qr_visible_at&&outcome.qr_share_confirmed_at)
  await page.screenshot({path:path.join(out,`${lang}-${width}-care.png`)})
  assert.deepEqual(errors,[])
  evidence.push({lang,width,firstUse:contextual?'PASS':'not exercised',verifiedQrIntention:contextual&&width!==320?'PASS':'neutral',qrVisible:'PASS',shareCancelledNotCounted:'PASS',nativeShareConfirmed:'PASS',downloadWorksWithMetricOffline:'PASS',carePersistedInPg17:'PASS',backendOutcomesConfirmed:true,pageErrors:0,hostedWrites:0})
  feedPending=false;releaseFeed.splice(0).forEach(r=>r())
  if(contextual){
   await page.getByRole('button',{name:lang==='es'?'Cerrar':'Close',exact:true}).click()
   await page.reload();await nav.waitFor()
   assert.equal(await page.getByRole('region',{name:lang==='es'?'Para empezar':'To get started'}).count(),0,'existing-pet bootstrap never repeats the prompt')
  }
  await context.close()
 }
 fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({environment:hostedAsset?'immutable Vercel frontend, intercepted Auth/data transport, real disposable PostgreSQL/RLS/trigger; no hosted Auth or writes':'local real App, intercepted transport, real disposable PostgreSQL/RLS/trigger; no hosted Auth or writes',origin,evidence},null,2))
 console.log(JSON.stringify(evidence))
}finally{await browser?.close();await server?.close()}
