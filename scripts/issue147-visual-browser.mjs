// Runtime composition audit. Synthetic Auth/data, never hosted writes.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {createRequire} from 'node:module'
import {createServer} from 'vite'
import {hostedAssetTransport} from './hosted-asset-transport.mjs'
const require=createRequire(import.meta.url)
const {chromium}=require(process.env.PAZO_PLAYWRIGHT_MODULE||'../../continuidad/f18-browser-tools/node_modules/playwright')
const version=process.env.PAZO_VISUAL_VERSION||'candidate'
const out=path.resolve(process.env.PAZO_VISUAL_OUTPUT||'artifacts/issue147/'+version)
fs.mkdirSync(out,{recursive:true})
const origin=process.env.PAZO_HOSTED_ORIGIN||'http://127.0.0.1:5357'
const hosted=process.env.PAZO_HOSTED_ORIGIN?hostedAssetTransport(origin):null
process.env.VITE_SUPABASE_URL='https://mrybvqdebbgcayuvgkkr.supabase.co'
process.env.VITE_SUPABASE_PUBLISHABLE_KEY='sb_publishable_synthetic'
const server=hosted?null:await createServer({server:{host:'127.0.0.1',port:5357,strictPort:true}})
const owner='97000000-0000-4000-8000-000000000001',pet='97000000-0000-4000-8000-000000000002'
const now=new Date().toISOString(),user={id:owner,aud:'authenticated',role:'authenticated',email:'qa@invalid.example',created_at:now,email_confirmed_at:now,app_metadata:{provider:'email',providers:['email'],pazo_marketing_qa:true},user_metadata:{}}
const token=[{alg:'HS256',typ:'JWT'},{sub:owner,role:'authenticated',aud:'authenticated',exp:Math.floor(Date.now()/1000)+3600,session_id:'synthetic'},'synthetic'].map(v=>Buffer.from(typeof v==='string'?v:JSON.stringify(v)).toString('base64url')).join('.')
const session={access_token:token,refresh_token:'synthetic',expires_at:Math.floor(Date.now()/1000)+3600,expires_in:3600,token_type:'bearer',user}
const results=[];let browser
const height=Number(process.env.PAZO_VISUAL_HEIGHT||844),smoke=process.env.PAZO_VISUAL_SMOKE==='true'
assert.ok([568,667,844].includes(height))
const settle=page=>page.evaluate(async()=>{
 await document.fonts.ready
 await Promise.all(document.getAnimations().filter(a=>Number.isFinite(a.effect?.getComputedTiming().endTime)).map(a=>a.finished.catch(()=>{})))
})
try{
 await server?.listen();browser=await chromium.launch({headless:true,...(process.env.PAZO_CHROMIUM_PATH?{executablePath:process.env.PAZO_CHROMIUM_PATH}:{channel:process.platform==='win32'?'msedge':undefined})})
 for(const lang of ['es','en'])for(const width of smoke?[320]:[320,390,430])for(const state of smoke?['pending']:['pending','content','empty','error']){
  let created=false,mode=state,releases=[],errors=[],blockedWrites=0
  const context=await browser.newContext({viewport:{width,height},locale:lang==='es'?'es-GT':'en-US',isMobile:true,hasTouch:true,reducedMotion:'reduce',serviceWorkers:'block'})
  await context.route('**/*',async route=>{
   const req=route.request(),url=new URL(req.url())
   if(url.origin===origin)return hosted?route.fulfill({status:200,...await hosted(url.href)}):route.continue()
   // Use real product fonts when reachable, with fallback recorded separately.
   if(['fonts.googleapis.com','fonts.gstatic.com'].includes(url.hostname))return route.continue()
   if(url.hostname!=='mrybvqdebbgcayuvgkkr.supabase.co')return route.abort()
   const respond=(data,status=200)=>route.fulfill({status,contentType:'application/json',headers:{'content-range':'0-0/0'},body:JSON.stringify(data)})
   const rpc=url.pathname.split('/rpc/')[1],table=url.pathname.split('/rest/v1/')[1]
   if(url.pathname.startsWith('/auth/v1/user'))return respond(user)
   if(url.pathname.startsWith('/auth/v1/token'))return respond(session)
   if(rpc){
    if(rpc==='pazo_supporter_public_badges_batch')return respond(JSON.parse(req.postData()).p_pet_ids.map(pet_id=>({pet_id,badge:false,milestone:0})))
    if(rpc==='pazo_public_maintenance_status')return respond({enabled:false,message_es:'',message_en:'',updated_at:now})
    if(rpc==='create_pet_profile'){created=true;return respond(pet)}
    if(rpc==='pazo_ensure_my_profile')return respond(null)
    if(['pazo_is_admin','f14_is_moderator','pazo_marketing_record_utility_v1'].includes(rpc))return respond(false)
    if(rpc.includes('public_token'))return respond('97000000-0000-4000-8000-000000000003')
    return respond([])
   }
   if(table==='pets'){
    const row={id:pet,owner_id:owner,name:'Luna',species:'gato',breed:'',age:'',gender:'hembra',photo_url:origin+'/pwa-icon-192.png',is_lost:false,created_at:now}
    return respond((req.headers().accept||'').includes('vnd.pgrst.object')?(created?row:null):(created?[row]:[]))
   }
   if(table==='pet_public_links')return respond({public_token:'97000000-0000-4000-8000-000000000003'})
   if(table==='follows'){
    if(mode==='pending')await new Promise(resolve=>releases.push(resolve))
    if(mode==='error')return respond({message:'forced isolated network failure'},503)
    return respond([])
   }
   if(table==='posts'&&req.method()==='GET')return respond(mode==='content'?[{id:'97000000-0000-4000-8000-000000000004',pet_id:pet,pet_name:'Luna',pet_species:'gato',pet_avatar:origin+'/pwa-icon-192.png',text:lang==='es'?'Hoy descubrimos un nuevo rincón del parque.':'Today we found a new corner of the park.',tags:[],likes:0,created_at:now}]:[])
   if(req.method()!=='GET'&&req.method()!=='HEAD'){blockedWrites++;return respond({message:'QA hosted write refused'},403)}
   if((req.headers().accept||'').includes('vnd.pgrst.object'))return respond(null)
   return respond([])
  })
  if(context.routeWebSocket)await context.routeWebSocket('**/*',ws=>ws.close())
  await context.addInitScript(({session,lang})=>{localStorage.clear();localStorage.setItem('sb-mrybvqdebbgcayuvgkkr-auth-token',JSON.stringify(session));localStorage.setItem('pazo_language_preference_v1',lang)},{session,lang})
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')console.error('QA console:',m.text())})
  await page.goto(origin)
  await page.getByPlaceholder(lang==='es'?'Ej: Luna, Bruno, Nube...':'E.g. Luna, Bruno, Cloud...').fill('Luna')
  await page.getByRole('button',{name:lang==='es'?'Continuar':'Continue',exact:true}).click()
  await page.getByRole('button',{name:lang==='es'?'Crear perfil y entrar':'Create profile and enter',exact:true}).click()
  const nav=page.getByRole('navigation',{name:'Navegación de PAZO'});await nav.waitFor()
  const toolsEntry=page.getByRole('button',{name:lang==='es'?'Explorar PAZO':'Explore PAZO',exact:true})
  // New tools-first structure: preserve the arrival before exploring Home.
  const onPet=await nav.getByRole('button',{name:lang==='es'?'Mi mascota':'My Pet',exact:true}).getAttribute('aria-current')==='page'
  const arrivalControls=[]
  if(onPet){
   await toolsEntry.waitFor()
   await settle(page)
   if(height!==844)await page.waitForFunction(()=>{
    const care=[...document.querySelectorAll('main button')].find(b=>/Cuidados y Agenda|Care & Agenda/.test(b.textContent))
    return care&&care.getBoundingClientRect().bottom<=innerHeight-103
   })
   const dock=await nav.boundingBox()
   for(const name of [lang==='es'?/^Pasaporte y QR/:/^Passport & QR/,lang==='es'?/^Cuidados y Agenda/:/^Care & Agenda/]){
    const button=page.getByRole('button',{name}),box=await button.boundingBox()
    assert.ok(box.height>=44&&box.width>=44)
    if(height===844)assert.ok(box.y+box.height<dock.y,'first QR/care actions visible above dock')
    arrivalControls.push({name:String(name),...box})
   }
   const edit=await page.getByRole('button',{name:lang==='es'?'Editar':'Edit',exact:true}).boundingBox()
   const title=await page.getByRole('heading',{name:'Luna',exact:true}).last().boundingBox()
   assert.ok(title.x+title.width<=edit.x||title.y>=edit.y+edit.height,'profile identity does not collide with Edit')
   await page.screenshot({path:path.join(out,`${lang}-${width}-${state}-arrival.png`)})
   await toolsEntry.click()
  }
  if(state==='pending')await page.getByText(lang==='es'?'Sincronizando feed...':'Syncing feed...',{exact:true}).waitFor()
  if(state==='error')await page.getByRole('button',{name:lang==='es'?'Reintentar':'Try again',exact:true}).waitFor()
  if(state==='empty')await page.getByText(lang==='es'?'Todavía no hay publicaciones':'No posts yet',{exact:true}).waitFor()
  if(state==='content')await page.getByText(lang==='es'?/Hoy descubrimos un nuevo rincón del parque\./:/Today we found a new corner of the park\./).last().waitFor()
  await settle(page)
  const font=await page.evaluate(()=>({family:getComputedStyle(document.body).fontFamily,faces:[...document.fonts].map(f=>({family:f.family,status:f.status}))}))
  await page.screenshot({path:path.join(out,`${lang}-${width}-${state}-home.png`)})
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false)
  const main=page.locator('main');await main.evaluate(e=>e.scrollTop=e.scrollHeight)
  assert.ok((await nav.boundingBox()).y<height);await main.evaluate(e=>e.scrollTop=0)
  if(state==='error'){
   mode='empty';await page.getByRole('button',{name:lang==='es'?'Reintentar':'Try again',exact:true}).click()
   await page.getByText(lang==='es'?'Todavía no hay publicaciones':'No posts yet',{exact:true}).waitFor()
   await settle(page)
   await page.screenshot({path:path.join(out,`${lang}-${width}-recovered-home.png`)})
  }
  mode='empty';releases.splice(0).forEach(r=>r())
  await nav.getByRole('button',{name:lang==='es'?'Mi mascota':'My Pet',exact:true}).click()
  const qr=page.getByRole('button',{name:lang==='es'?/^Pasaporte y QR/:/^Passport & QR/})
  if(version==='candidate'){await qr.focus();await page.keyboard.press('Enter')}
  else await page.getByText(lang==='es'?'Pasaporte y QR':'Passport & QR',{exact:true}).click()
  await page.getByRole('img',{name:'Pazo · Luna',exact:true}).waitFor()
  await page.getByRole('button',{name:lang==='es'?'Cerrar':'Close',exact:true}).click()
  if(version==='candidate'){await page.getByRole('button',{name:lang==='es'?/^Cuidados y Agenda/:/^Care & Agenda/}).focus();await page.keyboard.press('Enter')}
  else await page.getByText(lang==='es'?'Cuidados y Agenda':'Care & Agenda',{exact:true}).click()
  await page.getByRole('button',{name:lang==='es'?'Cerrar':'Close',exact:true}).click()
  await page.reload();await nav.waitFor()
  if(version==='candidate')assert.equal(await page.getByRole('button',{name:lang==='es'?'Explorar PAZO':'Explore PAZO',exact:true}).count(),0,'returning account does not repeat first-use guidance')
  assert.deepEqual(errors,[])
  results.push({lang,width,height,state,arrival:onPet?'existing-pet-tools':'home',arrivalControls,font,pageErrors:errors.length,overflow:false,qr:'PASS',agenda:'PASS',retry:state==='error'?'PASS':'not needed',blockedWrites,hostedWrites:0})
  await context.close()
 }
 fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({version,origin,frontend:hosted?'immutable Vercel assets via authenticated CLI':'real local App',data:'synthetic controlled Auth/data; all feed states forced; not real hosted traffic',results},null,2))
 console.log(JSON.stringify(results))
}finally{await browser?.close();await server?.close()}
