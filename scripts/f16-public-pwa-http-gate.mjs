// PAZO F16 read-only public HTTPS/PWA gate. Never sends credentials or payments.
// Run explicitly after Product Owner approval of a Preview deployment.
// A successful local Vite build never substitutes for these HTTP observations.
import {fileURLToPath} from 'node:url'
import {resolve} from 'node:path'

// PO-approved canonical production site; do not re-certify the retired preview host.
export const PAZO_BETA_PUBLIC_ORIGIN='https://pazo-app.vercel.app'
const FAKE='PAZO_NONPAYMENT_CALLBACK_PROBE'
const ROUTES=Object.freeze([
  {id:'home',path:'/',type:'html'},
  {id:'paypalReturn',path:'/paypal/return?ba_token='+FAKE,type:'html'},
  {id:'paypalCancel',path:'/paypal/cancel?token='+FAKE,type:'html'},
  {id:'manifest',path:'/manifest.webmanifest',type:'manifest'},
  {id:'serviceWorker',path:'/sw.js',type:'sw'},
  {id:'icon192',path:'/pwa-icon-192.png',type:'png'},
  {id:'icon512',path:'/pwa-icon-512.png',type:'png'}
])
const FAILURE_CODES=new Set([
 'http_unavailable','unexpected_redirect','http_status_not_200',
 'wrong_content_type','unexpected_spa_html','provider_token_reflected',
 'invalid_pwa_manifest','invalid_network_only_worker','invalid_pwa_icon'
])
const getMime=response=>response.headers?.get?.('content-type')||''
const safeBytes=async response=>{
 const size=Number(response.headers?.get?.('content-length'))
 if(Number.isFinite(size)&&size>1024*1024)throw Error('oversized_response')
 const b=new Uint8Array(await response.arrayBuffer())
 if(b.length>1024*1024)throw Error('oversized_response')
 return b
}
const validHtml=s=>/<!doctype html/i.test(s)&&
 /<div\s+id=["']root["']\s*>/i.test(s)&&
 /rel=["']manifest["']/i.test(s)&&
 /\/assets\/[^"'\s]+\.js/.test(s)
const validManifest=s=>{
 let m
 try{m=JSON.parse(s)}catch{return false}
 return m?.display==='standalone'&&m.scope==='/'&&
  m.start_url==='/'&&Array.isArray(m.icons)&&
  m.icons.some(i=>i.src==='/pwa-icon-192.png'&&i.sizes==='192x192')&&
  m.icons.some(i=>i.src==='/pwa-icon-512.png'&&i.sizes==='512x512')
}
const validWorker=s=>s.includes('addEventListener(\'fetch\'')&&
 s.includes("request.mode !== 'navigate'")&&
 s.includes("request.method !== 'GET'")&&
 !/caches\.(?:open|match|delete)|cache\.put|indexedDB|localStorage/.test(s)
const validPng=b=>b.length>=24&&b[0]===137&&b[1]===80&&
 b[2]===78&&b[3]===71&&b[4]===13&&b[5]===10&&b[6]===26&&b[7]===10

export async function auditPazoPublicPwa({
  origin=PAZO_BETA_PUBLIC_ORIGIN,fetchImpl=fetch
}={}){
 if(origin!==PAZO_BETA_PUBLIC_ORIGIN||typeof fetchImpl!=='function')
  throw Error('public_origin_not_approved')
 const checks=[]
 for(const route of ROUTES){
  let code='http_unavailable'
  try{
   const res=await fetchImpl(origin+route.path,{
    method:'GET',redirect:'manual',cache:'no-store',
    credentials:'omit',signal:AbortSignal.timeout(10000),
    headers:{Accept:route.type==='html'?'text/html':'*/*'}
   })
   if(res.status>=300&&res.status<400)code='unexpected_redirect'
   else if(res.status!==200)code='http_status_not_200'
   else{
    const mime=getMime(res).toLowerCase()
    const bytes=await safeBytes(res)
    const text=route.type==='png'?'':new TextDecoder().decode(bytes)
    const typeOk=route.type==='html'?mime.includes('text/html'):
      route.type==='manifest'?/json|manifest/.test(mime):
      route.type==='sw'?/javascript|text\/plain/.test(mime):
      mime.includes('image/png')
    if(!typeOk)code='wrong_content_type'
    else if(route.type==='html'){
     code=text.includes(FAKE)?'provider_token_reflected':
      validHtml(text)?'pass':'unexpected_spa_html'
    }else if(route.type==='manifest')
     code=validManifest(text)?'pass':'invalid_pwa_manifest'
    else if(route.type==='sw')
     code=validWorker(text)?'pass':'invalid_network_only_worker'
    else code=validPng(bytes)?'pass':'invalid_pwa_icon'
   }
  }catch{code='http_unavailable'}
  if(code!=='pass'&&!FAILURE_CODES.has(code))code='http_unavailable'
  checks.push({id:route.id,code})
 }
 return Object.freeze({
  source:'pazo_public_https_pwa_gate_v1',
  origin,ready:checks.every(c=>c.code==='pass'),checks
 })
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const result=await auditPazoPublicPwa()
 // Never print HTML, tokens, cookies or API responses.
 process.stdout.write(JSON.stringify(result,null,2)+'\n')
 if(!result.ready)process.exitCode=1
}
