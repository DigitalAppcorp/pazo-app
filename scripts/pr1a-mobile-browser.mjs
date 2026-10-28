// Real App, navigation, views and modals; synthetic Auth/data on localhost only.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {createRequire} from 'node:module'
import {createServer} from 'vite'
const require=createRequire(import.meta.url)
const {chromium}=require(process.env.PAZO_PLAYWRIGHT_MODULE || '../../continuidad/f18-browser-tools/node_modules/playwright')
const out=path.resolve(process.env.PAZO_PR1A_OUTPUT || 'artifacts/pr1a')
fs.mkdirSync(out,{recursive:true})
let feed='pending',careFail=true,pending=[],counts={}
const pet={id:'82000000-0000-4000-8000-000000000001',name:'Luna',species:'gato',breed:'Europeo',age:'3 años',gender:'hembra',weight:'4 kg',bio:'QA local',photoUrl:'/pwa-icon-192.png',qrId:'PAZO-LOCAL-QA',isLost:false}
const mock=`
const pet=${JSON.stringify(pet)};
async function read(kind){const r=await fetch('/__pr1a_api/'+kind);if(!r.ok)throw Error('offline '+kind);return r.json()}
export const supabase={
 auth:{onAuthStateChange(){return {data:{subscription:{unsubscribe(){}}}}},getUser:async()=>({data:{user:{id:'owner'}}}),getSession:async()=>({data:{session:{user:{id:'owner'},access_token:'synthetic'}}}),signOut:async()=>({error:null})},
 from(table){let single=false;const q=new Proxy({}, {get(_,key){if(key==='then')return (a,b)=>(table==='follows'?read('feed'):Promise.resolve({data:single?null:[],error:null,count:0})).then(a,b);return ()=>{if(key==='single'||key==='maybeSingle')single=true;if(['insert','update','upsert','delete'].includes(key))throw Error('QA read-only');return q}}});return q},
 rpc:async(name)=>({data:['pazo_is_admin','f14_is_moderator'].includes(name)?false:[],error:null}),functions:{invoke:async()=>({data:null,error:null})},storage:{from:()=>({getPublicUrl:()=>({data:{publicUrl:''}})})},
 channel(){return {on(){return this},subscribe(){return this},unsubscribe(){}}},removeChannel(){}}
export const fetchOwnedPets=async()=>[pet];
export const fetchOwnedPet=async()=>pet,createPetProfile=async()=>{throw Error('QA read-only')},updatePetProfile=async()=>{throw Error('QA read-only')},uploadPetAvatar=async()=>{throw Error('QA read-only')},removePetAvatar=async()=>{throw Error('QA read-only')};
export const getPetPublicToken=async()=> '82000000-0000-4000-8000-000000000002',buildPublicRescueUrl=(token)=>location.origin+'/#/rescue/'+token;
export const rotatePetPublicToken=async()=>{throw Error('QA read-only')},fetchPublicRescueProfile=async()=>null,submitPublicSighting=async()=>{throw Error('QA read-only')},fetchActiveLostPetAlert=async()=>null,activateLostPetAlert=async()=>{throw Error('QA read-only')},resolveLostPetAlert=async()=>{throw Error('QA read-only')},fetchSightingDetail=async()=>null;
export const CARE_HISTORY_PAGE_SIZE=2,DOCUMENTS_PAGE_SIZE=2;
export const fetchActiveCareItems=()=>read('care'),fetchCareHistory=async()=>[],fetchCareReminderCandidates=async()=>[];
export const fetchPetDocumentsPage=async()=>({items:[],total:0}),recoverPetDocumentOperations=async()=>{};
export const archiveCareItem=async()=>{},completeCareItem=async()=>{},createCareItem=async()=>{},undoCareCompletion=async()=>{},updateCareItem=async()=>{};
export const deletePetDocument=async()=>{},downloadPetDocumentBlob=async()=>{},updatePetDocumentMetadata=async()=>{},uploadPetDocument=async()=>{};
export const fetchLatestUnreadSightingNotification=async()=>null,fetchNotifications=async()=>[],fetchUnreadNotificationCount=async()=>0,markNotificationRead=async()=>{};
`
const mocked=new Set(['supabaseClient.ts','petService.ts','careService.ts','documentService.ts','rescueService.ts'])
const server=await createServer({server:{host:'127.0.0.1',port:5351,strictPort:true},plugins:[{
 name:'pr1a-local-isolation',enforce:'pre',
 load(id){
  if(id.endsWith('/src/main.tsx'))return `import React from 'react';import {createRoot} from 'react-dom/client';import App from './App';import './index.css';createRoot(document.getElementById('root')).render(React.createElement(React.StrictMode,null,React.createElement(App)));`
  if(id.endsWith('/src/context/AuthContext.tsx'))return `export const AuthProvider=({children})=>children;export const useAuth=()=>({user:{id:'owner'},loading:false,isPasswordRecovery:false,recoverySessionVerified:false,signIn:async()=>true,signOut:async()=>{},requestPasswordReset:async()=>true,changePassword:async()=>true,finishPasswordRecovery:async()=>{}});`
  if(id.includes('/src/services/')&&mocked.has(path.basename(id)))return mock
 },
 configureServer(s){s.middlewares.use((req,res,next)=>{
  if(!req.url.startsWith('/__pr1a_api/'))return next()
  const kind=req.url.split('/').at(-1);counts[kind]=(counts[kind]||0)+1
  const send=()=>{res.setHeader('content-type','application/json');res.statusCode=(kind==='feed'&&feed==='error')||(kind==='care'&&careFail)?503:200;res.end(JSON.stringify(kind==='feed'?{data:[],error:null}:[]))}
  if(kind==='feed'&&feed==='pending')pending.push(send);else send()
 })}
}]})
let browser
const evidence=[]
try{
 await server.listen()
 browser=await chromium.launch({headless:true,
  ...(process.env.PAZO_CHROMIUM_PATH?{executablePath:process.env.PAZO_CHROMIUM_PATH}:
   {channel:process.env.PAZO_BROWSER_CHANNEL || (process.platform==='win32'?'msedge':undefined)})})
 for(const width of [320,390,430]){
  feed='pending';careFail=true;pending=[];counts={}
  const context=await browser.newContext({viewport:{width,height:844},locale:'es-ES',isMobile:true,hasTouch:true,reducedMotion:'reduce'})
  let external=0;const errors=[]
  await context.route('**/*',route=>{const url=new URL(route.request().url());if(url.hostname==='127.0.0.1')return route.continue();external++;return route.abort()})
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message))
  await page.goto('http://127.0.0.1:5351/')
  const nav=page.getByRole('navigation',{name:'Navegación de PAZO'})
  try {await nav.waitFor();await page.getByText('Sincronizando feed...',{exact:true}).waitFor()}
  catch(e){console.error('Fixture diagnostics:',errors,await page.locator('body').innerText());throw e}
  for(const label of ['Comunidades','Mapa','Mi mascota']){
   await nav.getByRole('button',{name:label,exact:true}).click()
   await page.waitForFunction(()=>!document.querySelector('main')?.textContent.includes('Sincronizando feed'))
   assert.equal(await nav.getByRole('button',{name:label,exact:true}).getAttribute('aria-current'),'page')
   await page.getByText({'Comunidades':'Todavía no hay comunidades.','Mapa':'Lugares disponibles','Mi mascota':'Todo sobre Luna'}[label],{exact:true}).waitFor()
   await page.screenshot({path:path.join(out,`${width}-${label.replaceAll(' ','-')}-pending.png`)})
   assert.equal(feed,'pending')
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false)
  }
  // Force the pending feed request to fail, then recover only that service.
  feed='error';pending.splice(0).forEach(fn=>fn())
  await nav.getByRole('button',{name:'Inicio',exact:true}).click()
  await page.getByText('No pudimos cargar las publicaciones',{exact:true}).waitFor()
  await context.setOffline(true)
  await nav.getByRole('button',{name:'Mi mascota',exact:true}).click()
  await page.getByText('Luna',{exact:true}).first().waitFor()
  await nav.getByRole('button',{name:'Comunidades',exact:true}).click()
  await nav.getByRole('button',{name:'Mapa',exact:true}).click()
  assert.equal(await nav.getByRole('button',{name:'Mapa',exact:true}).getAttribute('aria-current'),'page')
  await context.setOffline(false);feed='success';careFail=false
  await nav.getByRole('button',{name:'Inicio',exact:true}).click()
  await page.getByRole('button',{name:'Reintentar',exact:true}).click()
  await page.waitForFunction(()=>!document.querySelector('main')?.textContent.includes('No pudimos cargar las publicaciones')&&!document.querySelector('main')?.textContent.includes('Sincronizando feed'))
  await nav.getByRole('button',{name:'Mi mascota',exact:true}).click()
  // Passport remains accessible while unrelated services failed earlier.
  const passport=page.getByText('Pasaporte y QR',{exact:true})
  await passport.click()
  await page.getByRole('img',{name:'Pazo · Luna',exact:true}).waitFor()
  await page.screenshot({path:path.join(out,`${width}-passport.png`)})
  assert.deepEqual(errors,[])
  evidence.push({width,viewsWhileFeedPending:3,offlineNavigation:'PASS',feedErrorRetry:'PASS',passportQrRendered:'PASS',overflow:false,pageErrors:errors.length,blockedExternalRequests:external,localServiceRequests:counts,mapTiles:'not tested; missing public Mapbox token uses existing fallback'})
  await context.close()
 }
 fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({isolation:'real React views, synthetic Auth/services, external requests blocked; no hosted writes or payments',cases:evidence},null,2))
 console.log(JSON.stringify(evidence,null,2))
}finally{await browser?.close();pending.splice(0).forEach(fn=>fn());await server.close()}
