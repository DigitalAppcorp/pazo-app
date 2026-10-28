// Immutable Vercel frontend + synthetic intercepted Auth/data. No hosted writes.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {createRequire} from 'node:module'
import {execFile} from 'node:child_process'
import {promisify} from 'node:util'
const require=createRequire(import.meta.url)
const {chromium}=require(process.env.PAZO_PLAYWRIGHT_MODULE||'../../continuidad/f18-browser-tools/node_modules/playwright')
const origin=process.env.PAZO_HOSTED_ORIGIN
assert.ok(origin&&/^https:\/\/pazo-[a-z0-9]+-digitalapp\.vercel\.app$/.test(origin),'exact staging origin required')
const out=path.resolve(process.env.PAZO_HOSTED_OUTPUT||'artifacts/issue142-1a')
fs.mkdirSync(out,{recursive:true})
// Use the authenticated CLI transport when this project's custom Trusted
// Sources rejects a development OIDC token. Never change its access rules.
const execute=promisify(execFile),remoteCache=new Map()
const cli=process.env.PAZO_VERCEL_CLI_ENTRY||path.join(process.env.APPDATA,'npm/node_modules/vercel/dist/index.js')
async function hostedAsset(url){
 if(!remoteCache.has(url))remoteCache.set(url,(async()=>{
  const {stdout}=await execute(process.execPath,[cli,'curl',url,'--scope','digitalapp','--','--silent','--show-error','--include'],{encoding:'buffer',maxBuffer:12e6,timeout:90000})
  let body=stdout,header=''
  while(body.subarray(0,5).toString()==='HTTP/'){
   const end=body.indexOf('\r\n\r\n');assert.ok(end>=0);header=body.subarray(0,end).toString();body=body.subarray(end+4)
  }
  const status=Number(header.match(/^HTTP\/\S+ (\d+)/)?.[1]);assert.equal(status,200,'authenticated hosted asset response')
  return {body,contentType:header.match(/content-type:\s*([^\r\n]+)/i)?.[1]||'application/octet-stream'}
 })())
 return remoteCache.get(url)
}
const owner='82000000-0000-4000-8000-000000000111'
const pets=['Luna','Bruno'].map((name,i)=>({id:`82000000-0000-4000-8000-00000000011${i+2}`,owner_id:owner,name,species:'perro',breed:'QA',age:'2 años',gender:'macho',photo_url:origin+'/pwa-icon-192.png',is_lost:false,created_at:new Date().toISOString()}))
const user={id:owner,aud:'authenticated',role:'authenticated',email:'qa@invalid.example',created_at:new Date().toISOString(),email_confirmed_at:new Date().toISOString(),app_metadata:{provider:'email',providers:['email'],pazo_marketing_qa:true},user_metadata:{}}
const token=[{alg:'HS256',typ:'JWT'},{sub:owner,role:'authenticated',aud:'authenticated',exp:Math.floor(Date.now()/1000)+3600,iat:Math.floor(Date.now()/1000),session_id:'82000000-0000-4000-8000-000000000119'},'synthetic'].map(v=>Buffer.from(typeof v==='string'?v:JSON.stringify(v)).toString('base64url')).join('.')
const session={access_token:token,refresh_token:'synthetic-never-valid',expires_at:Math.floor(Date.now()/1000)+3600,expires_in:3600,token_type:'bearer',user}
const results=[]
const browser=await chromium.launch({headless:true,...(process.env.PAZO_CHROMIUM_PATH?{executablePath:process.env.PAZO_CHROMIUM_PATH}:{channel:process.platform==='win32'?'msedge':undefined})})
try{
 for(const lang of ['es','en'])for(const width of [320,390,430]){
  let feed='pending',releases=[],backend=0,external=0,blockedExistingMetricWrites=0,unexpectedWrites=[],errors=[]
  const context=await browser.newContext({viewport:{width,height:844},locale:lang==='es'?'es-GT':'en-US',isMobile:true,hasTouch:true,reducedMotion:'reduce',serviceWorkers:'block'})
  await context.route('**/*',async route=>{
   const req=route.request(),url=new URL(req.url())
   if(url.origin===origin){const asset=await hostedAsset(url.href);return route.fulfill({status:200,...asset})}
   if(url.hostname!=='mrybvqdebbgcayuvgkkr.supabase.co'){external++;return route.abort()}
   backend++
   const respond=(data,status=200)=>route.fulfill({status,contentType:'application/json',headers:{'content-range':'0-0/0'},body:JSON.stringify(data)})
   const rpc=url.pathname.split('/rpc/')[1],table=url.pathname.split('/rest/v1/')[1]?.split('?')[0]
   if(url.pathname.startsWith('/auth/v1/user'))return respond(user)
   if(url.pathname.startsWith('/auth/v1/token'))return respond(session)
   if(rpc){
    if(rpc==='pazo_public_maintenance_status')return respond({enabled:false,message_es:'',message_en:'',updated_at:new Date().toISOString()})
    if(rpc==='pazo_ensure_my_profile')return respond(null)
    if(['pazo_is_admin','f14_is_moderator','pazo_marketing_record_utility_v1'].includes(rpc))return respond(false)
    if(rpc.includes('public_token'))return respond('82000000-0000-4000-8000-000000000118')
    // Existing write-like RPCs are synthetic only; no request leaves interception.
    return respond([])
   }
   if(req.method()!=='GET'&&req.method()!=='HEAD'){
    if(table==='place_usage_events')blockedExistingMetricWrites++;else unexpectedWrites.push(url.pathname)
    return respond({error:'QA_WRITE_REFUSED'},403)
   }
   if(table==='pets')return respond(pets)
   if(table==='pet_public_links')return respond({public_token:'82000000-0000-4000-8000-000000000118'})
   if(table==='follows'){
    if(feed==='pending')await new Promise(resolve=>releases.push(resolve))
    return respond(feed==='error'?{message:'synthetic slow/offline feed'}:[],feed==='error'?503:200)
   }
   if(/maybeSingle|single/.test(req.headers().accept||'')||(req.headers().accept||'').includes('vnd.pgrst.object'))return respond(null)
   return respond([])
  })
  if(context.routeWebSocket)await context.routeWebSocket('**/*',ws=>ws.close())
  await context.addInitScript(({session,lang,owner,pet})=>{
   localStorage.clear();localStorage.setItem('sb-mrybvqdebbgcayuvgkkr-auth-token',JSON.stringify(session));localStorage.setItem('pazo_language',lang);localStorage.setItem('active_pet_'+owner,pet)
  },{session,lang,owner,pet:pets[0].id})
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message))
  await page.goto(origin,{waitUntil:'domcontentloaded'})
  const nav=page.getByRole('navigation',{name:'Navegación de PAZO'})
  try{await nav.waitFor({timeout:20000})}catch(e){console.error({lang,width,errors,body:await page.locator('body').innerText()});throw e}
  for(const label of lang==='es'?['Comunidades','Mapa','Mi mascota']:['Communities','Map','My Pet']){
   await nav.getByRole('button',{name:label,exact:true}).click()
   assert.equal(await nav.getByRole('button',{name:label,exact:true}).getAttribute('aria-current'),'page')
   assert.equal(await page.locator('main').getByText('Sincronizando feed...',{exact:true}).count(),0)
   await page.screenshot({path:path.join(out,`${lang}-${width}-${label.replaceAll(' ','-')}.png`)})
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false)
  }
  await page.getByRole('button',{name:lang==='es'?/^Cambiar\s*▾$/:/^Switch\s*▾$/}).click()
  await page.getByRole('button',{name:/Bruno/}).click()
  await page.getByRole('button',{name:lang==='es'?/^Cambiar\s*▾$/:/^Switch\s*▾$/}).click()
  await page.getByRole('button',{name:/Luna/}).click()
  feed='error';releases.splice(0).forEach(fn=>fn())
  await nav.getByRole('button',{name:lang==='es'?'Inicio':'Home',exact:true}).click()
  await page.getByText(lang==='es'?'No pudimos cargar las publicaciones':'Could not load posts',{exact:true}).waitFor()
  await context.setOffline(true)
  await nav.getByRole('button',{name:lang==='es'?'Mi mascota':'My Pet',exact:true}).click()
  await nav.getByRole('button',{name:lang==='es'?'Comunidades':'Communities',exact:true}).click()
  await nav.getByRole('button',{name:lang==='es'?'Mapa':'Map',exact:true}).click()
  await context.setOffline(false)
  feed='success'
  await nav.getByRole('button',{name:lang==='es'?'Inicio':'Home',exact:true}).click()
  await page.getByRole('button',{name:lang==='es'?'Reintentar':'Try again',exact:true}).click()
  await page.waitForFunction(()=>!document.querySelector('main')?.textContent.includes('Sincronizando feed')&&!document.querySelector('main')?.textContent.includes('Could not load posts')&&!document.querySelector('main')?.textContent.includes('No pudimos cargar'))
  assert.deepEqual(errors,[]);assert.deepEqual(unexpectedWrites,[])
  results.push({lang,width,viewsWhileFeedPending:3,feedErrorRetry:'PASS',petABA:'PASS',offlineNavigation:'PASS',overflow:false,pageErrors:0,backendRequestsIntercepted:backend,externalBlocked:external,blockedExistingMetricWrites,hostedWrites:0})
  await context.close()
 }
 fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({origin,frontend:'immutable Vercel staging',backend:'synthetic intercepted Auth/data; not a real hosted Auth/DB test',results},null,2))
 console.log(JSON.stringify(results))
}finally{await browser.close()}
