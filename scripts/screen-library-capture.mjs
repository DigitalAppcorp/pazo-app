/**
 * PAZO screenshot atlas: public production client, synthetic account network.
 * Zero real credentials; ZERO writes to hosted API. Never capture Administration.
 */
import fs from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'
import { chromium } from 'playwright'

const origin = process.env.PAZO_SCREEN_ORIGIN || 'https://pazo-app.vercel.app'
const version = process.env.PAZO_SCREEN_DATE || new Date().toISOString().slice(0, 10)
const root = path.resolve('docs/screen-library/captures/' + version)
const buildSha = process.env.GITHUB_SHA || 'unknown'
const directory = path.resolve('docs/screen-library')
const items = []
const failures = []
const owner = '97000000-0000-4000-8000-000000000001'
const pet = '97000000-0000-4000-8000-000000000002'
const fixedNow = '2026-10-30T12:00:00.000Z'
const user = { id: owner, aud: 'authenticated', role: 'authenticated', email: 'screen-library@invalid.example',
  created_at: fixedNow, email_confirmed_at: fixedNow,
  app_metadata: { provider: 'email', providers: ['email'], pazo_marketing_qa: true }, user_metadata: {} }
const token = [
  { alg: 'HS256', typ: 'JWT' },
  { sub: owner, role: 'authenticated', aud: 'authenticated', exp: Math.floor(Date.now()/1000)+3600, session_id: 'screen-library-synthetic' },
  'synthetic'
].map(x => Buffer.from(typeof x === 'string' ? x : JSON.stringify(x)).toString('base64url')).join('.')
const session = { access_token: token, refresh_token: 'synthetic', expires_at: Math.floor(Date.now()/1000)+3600,
  expires_in: 3600, token_type: 'bearer', user }
const labels = {
  es: { start: 'Comenzar', login: 'Ya tengo una cuenta', forgot: '¿Olvidaste tu contraseña?', home: 'Inicio',
    communities: 'Comunidades', map: 'Mapa', pet: 'Mi mascota', search: 'Buscar en PAZO',
    messages: 'Mensajes', notifications: 'Notificaciones', create: 'Crear', care: 'Cuidados y Agenda',
    passport: 'Pasaporte y QR', docs: 'Documentos privados', alert: 'Activar Alerta',
    settings: 'Configuración', history: 'Historial', upcoming: 'Próximos',
    newCare: 'Añadir nuevo cuidado', newPost: 'Nueva Publicación', suggest: 'Sugerir un lugar' },
  en: { start: 'Get started', login: 'I already have an account', forgot: 'Forgot your password?', home: 'Home',
    communities: 'Communities', map: 'Map', pet: 'My Pet', search: 'Search PAZO',
    messages: 'Messages', notifications: 'Notifications', create: 'Create', care: 'Care & Agenda',
    passport: 'Passport & QR', docs: 'Private documents', alert: 'Trigger Alert',
    settings: 'Settings', history: 'History', upcoming: 'Upcoming',
    newCare: 'Add care item', newPost: 'New Post', suggest: 'Suggest a place' }
}
const filenameSafe = s => String(s).toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'')
  .replace(/[^a-z0-9-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,95)
const delay = ms => new Promise(resolve => setTimeout(resolve,ms))
function recordFailure(locale, id, err) {
  failures.push({ locale, id, message: String(err?.message || err).slice(0,400) })
}
function response(route, data, status = 200) {
  return route.fulfill({ status, contentType:'application/json',
    headers: { 'content-range': '0-0/0', 'access-control-allow-origin': '*' },
    body: JSON.stringify(data) })
}
async function newContext(browser, lang, width, authenticated) {
  const context = await browser.newContext({ viewport: { width, height: width < 600 ? 844 : 900 },
    locale: lang === 'es' ? 'es-US' : 'en-US', isMobile: width < 600, hasTouch: width < 600,
    reducedMotion:'reduce', serviceWorkers:'block', deviceScaleFactor:1,
    permissions: [] })
  let createdPet = false
  let blockedWrites = 0
  await context.route('**/*', async route => {
    const req = route.request()
    const url = new URL(req.url())
    if (!url.hostname.endsWith('.supabase.co')) return route.continue()
    const method = req.method()
    const table = (url.pathname.match(/\/rest\/v1\/([^/]+)/) || [])[1]
    const rpc = (url.pathname.match(/\/rpc\/([^/]+)/) || [])[1]
    if (url.pathname.startsWith('/auth/v1/user')) return response(route,user)
    if (url.pathname.startsWith('/auth/v1/token')) return response(route,session)
    if (rpc === 'pazo_public_maintenance_status') return response(route, { enabled:false, message_es:'', message_en:'', updated_at:fixedNow })
    if (rpc === 'pazo_is_admin' || rpc === 'f14_is_moderator') return response(route,false)
    if (rpc === 'create_pet_profile') { createdPet = true; return response(route,pet) }
    if (rpc === 'pazo_ensure_my_profile') return response(route,null)
    if (rpc === 'pazo_supporter_public_badges_batch') {
      const body = req.postDataJSON?.() || {}
      return response(route, (body.p_pet_ids || []).map(pet_id => ({ pet_id, badge:false, milestone:0 })))
    }
    if (rpc && /public_token/i.test(rpc)) return response(route,'97000000-0000-4000-8000-000000000003')
    if (rpc) return response(route, [])
    if (table === 'pets') {
      const row = { id:pet,owner_id:owner,name:'Luna',species:'gato',breed:'',age:'',gender:'hembra',
        photo_url:origin+'/pwa-icon-192.png',is_lost:false,created_at:fixedNow }
      return response(route, (req.headers().accept||'').includes('vnd.pgrst.object') ? (createdPet?row:null) : (createdPet?[row]:[]))
    }
    if (table === 'pet_public_links') return response(route,{ public_token:'97000000-0000-4000-8000-000000000003' })
    if (table === 'posts' && method === 'GET') return response(route, createdPet ? [{
      id:'97000000-0000-4000-8000-000000000004',pet_id:pet,pet_name:'Luna',
      pet_species:'gato',pet_avatar:origin+'/pwa-icon-192.png',
      text:lang==='es' ? 'Hoy descubrimos un nuevo rincón del parque.' : 'Today we found a new corner of the park.',
      tags:[],likes:0,created_at:fixedNow
    }]:[])
    if (method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS') {
      blockedWrites++
      return response(route,{ message:'Screen library: remote writes blocked' },403)
    }
    if ((req.headers().accept||'').includes('vnd.pgrst.object')) return response(route,null)
    return response(route,[])
  })
  if (context.routeWebSocket) await context.routeWebSocket('**/*',ws=>ws.close())
  await context.addInitScript(({ lang, session, authenticated }) => {
    localStorage.setItem('pazo_language_preference_v1',lang)
    if (authenticated) localStorage.setItem('sb-mrybvqdebbgcayuvgkkr-auth-token',JSON.stringify(session))
  }, {lang,session,authenticated})
  const page = await context.newPage()
  page.on('dialog',async d => { await d.dismiss() })
  page.on('pageerror', e => recordFailure(lang+'-'+width,'pageerror',e))
  return {context,page, getBlockedWrites:()=>blockedWrites}
}
async function capture(page, lang, width, profile, id, originState) {
  const slug = filenameSafe(id)
  const relative = 'captures/'+version+'/'+lang+'-'+width+'/'+slug+'.png'
  const file = path.join(directory,relative)
  await fs.mkdir(path.dirname(file),{recursive:true})
  await page.evaluate(() => document.fonts.ready).catch(()=>{})
  await delay(300)
  const textLength = await page.locator('body').innerText({timeout:5000}).then(x=>x.trim().length).catch(()=>0)
  if (textLength < 18) throw Error('Blank or nearly empty page: '+textLength+' visible text characters')
  const bytes = await page.screenshot({ path:file, animations:'disabled', caret:'hide', fullPage:false, timeout:20000 })
  const signature = crypto.createHash('sha256').update(bytes).digest('hex')
  const title = await page.title().catch(()=>null)
  const heading = await page.locator('h1,h2,[role="dialog"] h3').first().innerText({timeout:1500}).catch(()=>null)
  items.push({ id:slug,language:lang,width,height:width<600?844:900,profile,
    state:originState,path:'docs/screen-library/'+relative,origin,source_commit:buildSha,
    hash_sha256:signature,bytes:bytes.length,heading,title,captured_at:new Date().toISOString(),
    synthetic_data:profile==='authenticated-synthetic',admin:false })
}
async function screenshotSafely(page,lang,width,profile,id,state) {
  try { await capture(page,lang,width,profile,id,state); return true }
  catch(e){ recordFailure(lang+'-'+width,id,e); return false }
}
async function maybeClick(locator, timeout=3000) {
  try {
    if (!await locator.first().count()) return false
    await locator.first().click({timeout})
    await delay(180)
    return true
  } catch { return false }
}
async function navTo(page, lang, key) {
  const nav=page.getByRole('navigation',{name:'Navegación de PAZO'})
  await nav.waitFor({timeout:14000})
  const label=labels[lang][key]
  if (!await maybeClick(nav.getByRole('button',{name:label,exact:true}),6000)) throw Error('Navigation unavailable: '+label)
}
async function gotoWelcome(page,lang) {
  await page.goto(origin,{waitUntil:'domcontentloaded',timeout:90000})
  await page.getByRole('button',{name:labels[lang].start,exact:true}).waitFor({timeout:20000})
}
async function publicSuite(browser,lang,width) {
  const {context,page}=await newContext(browser,lang,width,false)
  const tag='public'
  const L=labels[lang]
  try {
    await gotoWelcome(page,lang)
    await screenshotSafely(page,lang,width,tag,'access-welcome','welcome')
    if (await maybeClick(page.getByRole('button',{name:lang==='es'?'Conoce a los Amigos de PAZO':'Meet the PAZO Friends'}))) {
      await screenshotSafely(page,lang,width,tag,'access-friends-wall','gratitude')
    }
    await gotoWelcome(page,lang)
    if (await maybeClick(page.getByRole('button',{name:L.start,exact:true}))) {
      await screenshotSafely(page,lang,width,tag,'access-signup','signup')
    }
    await gotoWelcome(page,lang)
    if (await maybeClick(page.getByRole('button',{name:L.login,exact:true}))) {
      await screenshotSafely(page,lang,width,tag,'access-login','login')
      if (await maybeClick(page.getByRole('button',{name:L.forgot}))) {
        await screenshotSafely(page,lang,width,tag,'access-forgot-password','password-recovery-request')
      }
    }
    await gotoWelcome(page,lang)
    if (!await maybeClick(page.getByRole('button',{name:'Demo',exact:true}))) throw Error('Demo button not found')
    await page.getByRole('navigation',{name:'Navegación de PAZO'}).waitFor({timeout:18000})
    await screenshotSafely(page,lang,width,'demo','demo-home','feed')
    for (const key of ['communities','map','pet','home']) {
      try { await navTo(page,lang,key); await screenshotSafely(page,lang,width,'demo','demo-'+key,key) }
      catch(e) {recordFailure(lang+'-'+width,'demo-'+key,e)}
    }
    if(await maybeClick(page.getByRole('button',{name:L.search,exact:true}))) {
      await screenshotSafely(page,lang,width,'demo','demo-explore','search')
    }
    for(const [key,id] of [['messages','demo-messages'],['notifications','demo-notifications']]) {
      await gotoWelcome(page,lang)
      if (!await maybeClick(page.getByRole('button',{name:'Demo',exact:true}))) continue
      await page.getByRole('navigation',{name:'Navegación de PAZO'}).waitFor({timeout:18000})
      if(await maybeClick(page.getByRole('button',{name:L[key],exact:true}))) await screenshotSafely(page,lang,width,'demo',id,key)
    }
    await gotoWelcome(page,lang)
    await maybeClick(page.getByRole('button',{name:'Demo',exact:true}))
    await navTo(page,lang,'home')
    const nav = page.getByRole('navigation',{name:'Navegación de PAZO'})
    if(await maybeClick(nav.getByRole('button',{name:L.create,exact:true}))) await screenshotSafely(page,lang,width,'demo','demo-create-menu','create-menu')
  } catch(e){recordFailure(lang+'-'+width,'public-suite',e)}
  await context.close()
}
async function authenticSuite(browser,lang,width) {
  const {context,page,getBlockedWrites}=await newContext(browser,lang,width,true)
  const L=labels[lang]
  const tag='authenticated-synthetic'
  async function base(key) {
    await page.goto(origin,{waitUntil:'domcontentloaded',timeout:90000})
    await navTo(page,lang,key)
  }
  async function flow(tab,id,open,subActions=[]) {
    try {
      await base(tab)
      if (!await open()) { recordFailure(lang+'-'+width,id,'Target UI action not found');return }
      await screenshotSafely(page,lang,width,tag,id,'overlay')
      for(const [subId,sub] of subActions) {
        try { if(await sub())await screenshotSafely(page,lang,width,tag,subId,'subview')
              else recordFailure(lang+'-'+width,subId,'Secondary action not found') }
        catch(e){recordFailure(lang+'-'+width,subId,e)}
      }
    } catch(e) {recordFailure(lang+'-'+width,id,e)}
  }
  try {
    await page.goto(origin,{waitUntil:'domcontentloaded',timeout:90000})
    const nameInput=page.getByPlaceholder(lang==='es'?'Ej: Luna, Bruno, Nube...':'E.g. Luna, Bruno, Cloud...')
    if (await nameInput.count()) {
      await screenshotSafely(page,lang,width,tag,'onboarding-first-pet-name','pet-creation')
      await nameInput.fill('Luna')
      if(await maybeClick(page.getByRole('button',{name:lang==='es'?'Continuar':'Continue',exact:true}))) {
        await screenshotSafely(page,lang,width,tag,'onboarding-first-pet-more','pet-creation-details')
        if(await maybeClick(page.getByRole('button',{name:lang==='es'?'Crear perfil y entrar':'Create profile and enter',exact:true}))) {
          await screenshotSafely(page,lang,width,tag,'onboarding-first-use','first-utility-notice')
        }
      }
    }
    await page.getByRole('navigation',{name:'Navegación de PAZO'}).waitFor({timeout:18000})
    for (const key of ['home','communities','map','pet']) {
      await navTo(page,lang,key)
      await screenshotSafely(page,lang,width,tag,'main-'+key,key)
    }
    await flow('home','explore-search',()=>maybeClick(page.getByRole('button',{name:L.search,exact:true})))
    await flow('home','notifications',()=>maybeClick(page.getByRole('button',{name:L.notifications,exact:true})))
    await flow('home','messages',()=>maybeClick(page.getByRole('button',{name:L.messages,exact:true})))
    await flow('pet','pet-settings',()=>maybeClick(page.getByRole('button',{name:L.settings,exact:true})))
    await flow('pet','pet-edit',()=>maybeClick(page.getByRole('button',{name:lang==='es'?'Editar':'Edit',exact:true})))
    await flow('pet','pet-passport',()=>maybeClick(page.getByRole('button',{name:new RegExp(L.passport)})))
    await flow('pet','pet-care',()=>maybeClick(page.getByRole('button',{name:new RegExp(L.care)})),[
      ['pet-care-history',()=>maybeClick(page.getByRole('button',{name:L.history,exact:true}))],
      ['pet-care-upcoming',()=>maybeClick(page.getByRole('button',{name:L.upcoming,exact:true}))],
      ['pet-care-add',()=>maybeClick(page.getByRole('button',{name:new RegExp(L.newCare)}))]
    ])
    await flow('pet','pet-documents',()=>maybeClick(page.getByText(L.docs,{exact:true})))
    await flow('pet','pet-lost-alert',()=>maybeClick(page.getByRole('button',{name:new RegExp(L.alert)})))
    await flow('pet','pet-add-another',()=>maybeClick(page.getByRole('button',{name:lang==='es'?'Añadir mascota':'Add pet'})))
    const nav = () => page.getByRole('navigation',{name:'Navegación de PAZO'})
    await flow('home','create-menu',()=>maybeClick(nav().getByRole('button',{name:L.create,exact:true})))
    await flow('home','create-post',async()=>await maybeClick(nav().getByRole('button',{name:L.create,exact:true}))
      &&await maybeClick(page.getByRole('button',{name:new RegExp(L.newPost)})))
    await flow('home','create-suggest-place',async()=>await maybeClick(nav().getByRole('button',{name:L.create,exact:true}))
      &&await maybeClick(page.getByRole('button',{name:new RegExp(L.suggest)})))
    await flow('home','create-lost-alert',async()=>await maybeClick(nav().getByRole('button',{name:L.create,exact:true}))
      &&await maybeClick(page.getByRole('button',{name:lang==='es'?/Mi mascota está perdida/:/My pet is lost/})))
    await flow('communities','community-create',()=>maybeClick(page.getByRole('button',{name:lang==='es'?/Crear comunidad|Nueva comunidad/i:/Create community|New community/i})))
    await flow('map','places-search',()=>maybeClick(page.getByRole('button',{name:lang==='es'?/Buscar|Explorar/i:/Search|Explore/i})))
  }catch(e){recordFailure(lang+'-'+width,'authenticated-suite',e)}
  if(getBlockedWrites()>0) recordFailure(lang+'-'+width,'blocked-remote-writes','Blocked '+getBlockedWrites()+' attempted writes; no production records were changed')
  await context.close()
}
await fs.mkdir(root,{recursive:true})
const browser=await chromium.launch({headless:true,...(process.env.PAZO_CHROMIUM_PATH?{executablePath:process.env.PAZO_CHROMIUM_PATH}:{})})
try {
  for(const lang of ['es','en'])for(const width of [390,1440]) {
    await publicSuite(browser,lang,width)
    await authenticSuite(browser,lang,width)
  }
}finally{await browser.close()}
const result={schema_version:1, date:version, origin, source_sha:buildSha,
  disclaimer:'Production client captured with mock Supabase API for signed-in journeys; not a proof of real production backend behavior.',
  excludes:'Administration',total:items.length,photos:items,issues:failures,
  complete:false,requires_manual_audit:true}
await fs.writeFile(path.join(root,'manifest.json'),JSON.stringify(result,null,2)+'\n')
const table = items.map(x=>'| '+x.id+' | '+x.language+' | '+x.width+' | '+x.profile+' | ['+x.id+']('+x.language+'-'+x.width+'/'+x.id+'.png) |').join('\n')
const guide='# PAZO — Capturas adicionales '+version+'\n\n'+
  '**Estado: exploración automatizada, cobertura completa NO certificada.**\n\n'+
  'Cliente cargado desde '+origin+'. Las áreas autenticadas usan **datos de cuenta sintéticos** y respuestas API interceptadas, sin credenciales ni escrituras reales.\n\n'+
  'Total: **'+items.length+' capturas**. Incidencias/acciones sin cobertura: **'+failures.length+'**. Revisar manifest.json y verificar cada PNG antes de usar en video.\n\n'+
  '| Estado | Idioma | Ancho | Contexto | Captura |\n|---|---|---:|---|---|\n'+table+'\n\n'+
  'La existencia de un PNG no confirma pantalla funcional completa; quedan recorridos dinámicos, formularios con datos y QA visual. Administración está excluida.\n'
await fs.writeFile(path.join(root,'README.md'),guide)
await fs.writeFile(path.join(root,'issues.json'),JSON.stringify(failures,null,2)+'\n')
console.log(JSON.stringify({root,files:items.length,failures:failures.length,failed:failures.slice(0,12)},null,2))
if(items.length<20) process.exitCode=1
