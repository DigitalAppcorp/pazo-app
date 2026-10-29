// Paired controlled real-App navigation. Product benchmark, not a token-saving benchmark.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {createRequire} from 'node:module'
import {createServer} from 'vite'
const require=createRequire(import.meta.url),{chromium}=require(process.env.PAZO_PLAYWRIGHT_MODULE||'../../continuidad/f18-browser-tools/node_modules/playwright')
const pet={id:'82000000-0000-4000-8000-000000000001',name:'Luna',species:'gato',age:'3 años',photoUrl:'/pwa-icon-192.png',isLost:false}
// Reuse existing isolated domain fixture; never contact production.
const fixture=fs.readFileSync('scripts/pr1a-mobile-browser.mjs','utf8').replaceAll('\r\n','\n')
let mock=fixture.slice(fixture.indexOf('const mock=`')+12,fixture.indexOf('`\nconst mocked='))
assert.ok(mock.startsWith('\nconst pet='));mock=mock.replace('${JSON.stringify(pet)}',JSON.stringify(pet))
mock=mock.replace(/rpc:async\(name\)=>\(\{data:\['pazo_is_admin'.*?error:null\}\),functions:/,
 `rpc(name,args){const task=name==='pazo_intelligence_record_v1';if(task){window.__taskCalls=(window.__taskCalls||0)+1;window.__taskBytes=(window.__taskBytes||0)+JSON.stringify(args).length}const result=task?new Promise(r=>setTimeout(()=>r({data:true,error:null}),5000)):Promise.resolve({data:['pazo_is_admin','f14_is_moderator'].includes(name)?false:true,error:null});const q={setHeader(){return q},abortSignal(){return q},then(a,b){return result.then(a,b)}};return q},functions:`)
assert.ok(mock.includes('window.__taskCalls'))
const mocked=new Set(['supabaseClient.ts','petService.ts','careService.ts','documentService.ts','rescueService.ts'])
const results=[],errors=[];let browser
try{
 browser=await chromium.launch({headless:true,...(process.env.PAZO_CHROMIUM_PATH?{executablePath:process.env.PAZO_CHROMIUM_PATH}:{channel:process.platform==='win32'?'msedge':undefined})})
 for(const width of [390,1440])for(const round of [1,2])for(const mode of round===1?['baseline','candidate']:['candidate','baseline']){
  const server=await createServer({logLevel:'error',server:{host:'127.0.0.1',port:5361,strictPort:true},plugins:[{name:'paired-isolated-runtime',enforce:'pre',load(id){
   if(id.endsWith('/src/main.tsx'))return "import React from 'react';import {createRoot} from 'react-dom/client';import App from './App';import './index.css';createRoot(document.getElementById('root')).render(React.createElement(App));"
   if(id.endsWith('/src/context/AuthContext.tsx'))return "export const AuthProvider=({children})=>children;export const useAuth=()=>({user:{id:'owner'},loading:false,isPasswordRecovery:false,recoverySessionVerified:false,signIn:async()=>true,signOut:async()=>{},requestPasswordReset:async()=>true,changePassword:async()=>true,finishPasswordRecovery:async()=>{}})"
   if(mode==='baseline'&&id.endsWith('/src/features/marketing/intelligenceRuntime.ts'))return 'export const observeTask=()=>{},observeAnonymous=()=>{},beginTask=()=>()=>{}'
   if(id.endsWith('/src/features/marketing/intelligenceCatalog.ts'))return fs.readFileSync(id,'utf8').replace('INTELLIGENCE_COLLECTION_ENABLED = false','INTELLIGENCE_COLLECTION_ENABLED = '+(mode==='candidate'))
   if(id.includes('/src/services/')&&mocked.has(path.basename(id)))return mock
  },configureServer(s){s.middlewares.use((req,res,next)=>{if(!req.url.startsWith('/__pr1a_api/'))return next();res.setHeader('content-type','application/json');setTimeout(()=>res.end(JSON.stringify(req.url.endsWith('/feed')?{data:[],error:null}:[])),250)})}}]})
  let context
  try{
   await server.listen();context=await browser.newContext({viewport:{width,height:900},locale:'es-GT',reducedMotion:'reduce',serviceWorkers:'block'})
   await context.route('**/*',r=>new URL(r.request().url()).origin==='http://127.0.0.1:5361'?r.continue():r.abort())
   const page=await context.newPage();page.on('pageerror',e=>errors.push(String(e)));await page.goto('http://127.0.0.1:5361');const nav=page.getByRole('navigation',{name:'Navegación de PAZO'});await nav.waitFor();await page.getByRole('button',{name:'Mi mascota',exact:true}).click();await page.getByText('Todo sobre Luna',{exact:true}).waitFor()
   await page.evaluate(()=>{window.__paints=[];document.querySelector('nav[aria-label="Navegación de PAZO"]').addEventListener('click',()=>{const at=performance.now();requestAnimationFrame(()=>requestAnimationFrame(()=>window.__paints.push(performance.now()-at)))})})
   for(let i=0;i<24;i++){
    const label=['Comunidades','Mapa','Mi mascota'][i%3];await nav.getByRole('button',{name:label,exact:true}).click();await page.waitForFunction(n=>window.__paints.length>=n,i+1)
   }
   const row=await page.evaluate(()=>({paint:window.__paints,taskCalls:window.__taskCalls||0,taskBytes:window.__taskBytes||0}))
   assert.equal(row.paint.length,24);if(mode==='candidate')assert.ok(row.taskCalls>0);else assert.equal(row.taskCalls,0)
   results.push({width,round,mode,...row,serviceLatencyMs:250,optionalTaskLatencyMs:5000,samples:'Trusted click to second requestAnimationFrame, not field INP'})
  }finally{await context?.close();await server.close()}
 }
 assert.deepEqual(errors,[])
 const percentile=(a,p)=>[...a].sort((x,y)=>x-y)[Math.ceil(a.length*p)-1]
 const summary=[390,1440].flatMap(width=>['baseline','candidate'].map(mode=>{const r=results.filter(r=>r.width===width&&r.mode===mode),v=r.flatMap(r=>r.paint.slice(3));return {width,mode,samples:v.length,medianMs:percentile(v,.5),p95Ms:percentile(v,.95),taskCalls:r.reduce((n,r)=>n+r.taskCalls,0),taskBytes:r.reduce((n,r)=>n+r.taskBytes,0)}}))
 fs.mkdirSync('artifacts/issue153',{recursive:true});fs.writeFileSync('artifacts/issue153/performance.json',JSON.stringify({status:'PASS',scope:'Same real App and fixtures. Baseline new instrumentation replaced with noops; candidate enabled only by test loader. Existing #150 active in both. Paired counterbalanced order, warmed 21 samples/run. Not a complete main-build comparison, not INP or a performance-improvement claim.',results,summary,errors,hostedWrites:0},null,2)+'\n')
 console.log(JSON.stringify({status:'PASS',summary,errors,hostedWrites:0}))
}finally{await browser?.close()}

