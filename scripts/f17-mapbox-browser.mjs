// Live Mapbox regression: local public-data fixture, actual source components,
// actual provider resources. This does not certify physical Android/PWA install.
// Start Vite with the existing public VITE_MAPBOX_ACCESS_TOKEN, then run:
// PAZO_PLAYWRIGHT_MODULE=/path/to/playwright PAZO_CHROMIUM_PATH=/usr/bin/chromium \
//   node --use-env-proxy scripts/f17-mapbox-browser.mjs
import assert from 'node:assert/strict'
import {createRequire} from 'node:module'
import {mkdir,writeFile} from 'node:fs/promises'
import {resolve} from 'node:path'

const require=createRequire(import.meta.url)
const {chromium}=require(process.env.PAZO_PLAYWRIGHT_MODULE||'playwright')
const origin=process.env.PAZO_F17_LOCAL_ORIGIN||'http://127.0.0.1:5173'
assert.match(origin,/^http:\/\/127\.0\.0\.1:\d+$/)
const output=resolve(process.env.PAZO_F17_MAP_EVIDENCE||'/tmp/pazo-map-evidence/live-component')
await mkdir(output,{recursive:true})
const sanitize=value=>String(value)
 .replace(/(?:pk|sk|tk)\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,'[REDACTED]')
 .replace(/([?&](?:access_token|sku)=)[^&\s"']*/g,'$1[REDACTED]')
const requests=[],errors=[],failures=[],checks=[]
const recoveryOnly=process.env.PAZO_F17_MAP_CASE==='recovery'
let denyTiles=recoveryOnly,scenario=recoveryOnly?'forced-tile-denial':'normal'
const providerResource=path=>path.startsWith('/3dtiles/')?'provider-model'
 :path.startsWith('/v4/')?'tile'
 :path.startsWith('/fonts/')?'font'
 :path.startsWith('/styles/')?'style-or-sprite':'library-or-events'
const browser=await chromium.launch({
 headless:true,
 ...(process.env.PAZO_CHROMIUM_PATH?{executablePath:process.env.PAZO_CHROMIUM_PATH}:{}),
 ...(process.env.HTTPS_PROXY?{proxy:{server:process.env.HTTPS_PROXY}}:{}),
 args:['--no-sandbox','--ignore-certificate-errors','--enable-unsafe-swiftshader','--use-angle=swiftshader'],
})
const context=await browser.newContext({viewport:{width:390,height:844},locale:'es-GT',serviceWorkers:'block'})
const check=(condition,message)=>{assert.ok(condition,message);checks.push(message)}
const page=await context.newPage()
const state=()=>page.evaluate(()=>{
 const map=window.fixtureMap
 if(!map)return null
 const features=map.queryRenderedFeatures()
 const basemap=features.filter(feature=>!String(feature.source||'').startsWith('pazo-'))
 return {
  styleName:map.getStyle()?.name,styleImports:map.getStyle()?.imports?.map(item=>item.url)||[],
  configuredStyle:document.querySelector('[data-pazo-map-style]')?.dataset.pazoMapStyle,
  uiState:document.querySelector('[data-pazo-map-state]')?.dataset.pazoMapState,
  zoom:map.getZoom(),pitch:map.getPitch(),bearing:map.getBearing(),
  center:map.getCenter().toArray(),canvas:[map.getCanvas().width,map.getCanvas().height],
  basemapFeatures:basemap.length,
  roadFeatures:basemap.filter(feature=>/road|street/i.test(String(feature.sourceLayer)+' '+feature.layer?.id)).length,
  basemapLayers:[...new Set(basemap.map(feature=>feature.layer?.id))].slice(0,15),
  basemapSamples:basemap.slice(0,3).map(feature=>({keys:Object.keys(feature),source:feature.source,sourceLayer:feature.sourceLayer,layer:feature.layer,featureset:feature.featureset,properties:feature.properties})),
  elementSizes:[document.documentElement,document.body,document.getElementById('root'),document.querySelector('[data-pazo-map-state]'),map.getContainer(),map.getCanvas()].map(element=>({tag:element?.tagName,width:element?.getBoundingClientRect().width,height:element?.getBoundingClientRect().height})),
  markers:[...document.querySelectorAll('.mapboxgl-marker')].map(element=>({role:element.getAttribute('role'),label:element.getAttribute('aria-label'),title:element.getAttribute('title')})),
  pazoModelLayer:Boolean(map.getLayer('pazo-place-models')),
  pazoModelFeatures:map.getLayer('pazo-place-models')?map.queryRenderedFeatures({layers:['pazo-place-models']}).length:0,
  terrain:map.getTerrain(),mapCount:window.fixtureMapCount,
 }
})
let result={source:'f17_live_mapbox_source_components',case:recoveryOnly?'recovery':'all',physicalAndroid:false,installedPwa:false}
let overview,close
try {
 await context.route('**/*',async route=>{
  const request=route.request(),url=new URL(request.url())
  if(url.origin===origin){
   // The cloud browser's HTTP proxy rejects loopback. Fetch only this local
   // Vite origin in Node and fulfill it; remote Mapbox requests stay untouched.
   const response=await fetch(url,{method:request.method()})
   return route.fulfill({status:response.status,headers:{'content-type':response.headers.get('content-type')||'application/octet-stream'},body:Buffer.from(await response.arrayBuffer())})
  }
  if(url.hostname==='api.mapbox.com'||url.hostname==='events.mapbox.com'){
   if(denyTiles&&(url.pathname.startsWith('/v4/')||url.pathname.startsWith('/3dtiles/'))){
    return route.fulfill({status:403,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:'{"message":"Forbidden"}'})
   }
   return route.continue()
  }
  if(request.resourceType()==='image'&&/^(?:(?:upload|commons)\.)?wikimedia\.org$/.test(url.hostname))return route.continue()
  if(url.protocol==='data:'||url.protocol==='blob:')return route.continue()
  failures.push({scenario,host:url.host,path:url.pathname,reason:'unexpected_remote_request'})
  return route.abort()
 })
 page.on('response',response=>{
  const url=new URL(response.url())
  if(url.hostname.endsWith('mapbox.com')||url.pathname.startsWith('/models/places/'))requests.push({
   scenario,host:url.host,path:url.pathname,status:response.status(),
   resource:url.pathname.startsWith('/models/places/')?'pazo-model':providerResource(url.pathname),
  })
 })
 page.on('pageerror',error=>errors.push({scenario,message:sanitize(error.message)}))
 page.on('requestfailed',request=>{
  const url=new URL(request.url())
  if(url.hostname.endsWith('mapbox.com'))failures.push({scenario,host:url.host,path:url.pathname,reason:sanitize(request.failure()?.errorText)})
 })
 await page.goto(origin+'/supabase/tests/f17/mapbox-browser-harness.html',{waitUntil:'domcontentloaded'})
 if(!recoveryOnly){
 await page.waitForFunction(()=>window.fixtureMap?.getLayer('pazo-place-models'),null,{timeout:90000})
 await page.waitForFunction(()=>{
  try{return Boolean(window.fixtureMap?.isStyleLoaded())&&window.fixtureMap.queryRenderedFeatures().some(feature=>!String(feature.source||'').startsWith('pazo-'))}
  catch{return false}
 },null,{timeout:90000})
 await page.screenshot({path:resolve(output,'overview.png')})
 overview=await state()
 console.log(JSON.stringify({milestone:'overview',markers:overview.markers,canvas:overview.canvas}))
 check(overview.configuredStyle==='mapbox://styles/mapbox/standard','official Standard style retained')
 check(overview.elementSizes[4].height>=740&&overview.canvas[1]>=740,'Mapbox container and canvas occupy mobile viewport')
 check(overview.basemapFeatures>0,'actual imported Standard basemap features rendered')
 check(overview.markers.length===6&&overview.markers.every(marker=>marker.role==='button'),'Mapbox custom markers retain accessible button roles')
 check(await page.locator('.pazo-place-card').count()===6,'six public catalogue cards retained')
 check(requests.some(item=>item.resource==='tile'&&item.status===200),'actual provider tiles HTTP200')
 check(!requests.some(item=>item.status===401||item.status===403),'normal Mapbox requests authorized')
 check(await page.locator('[data-pazo-place-photo="true"]').count()>0,'existing place photography retained')

 const beforeDrag=await state()
 await page.mouse.move(130,260);await page.mouse.down()
 await page.mouse.move(210,310,{steps:12});await page.mouse.up()
 await page.waitForTimeout(500)
 const afterDrag=await state()
 check(Math.abs(afterDrag.center[0]-beforeDrag.center[0])>0.00001,'map canvas drag moves camera')
 await page.mouse.move(140,260);await page.mouse.wheel(0,-520)
 await page.waitForTimeout(1300)
 check((await state()).zoom>afterDrag.zoom,'map wheel zoom increases camera zoom')
 const pitchBefore=(await state()).pitch
 await page.mouse.move(140,270);await page.mouse.down({button:'right'})
 await page.mouse.move(170,330,{steps:12});await page.mouse.up({button:'right'})
 await page.waitForTimeout(500)
 check(Math.abs((await state()).pitch-pitchBefore)>1,'map right drag adjusts pitch')

 await page.getByRole('button',{name:'Centrar mapa en Silver Lake Dog Park',exact:true}).getByText('Silver Lake Dog Park',{exact:true}).click()
 await page.waitForFunction(()=>window.fixtureMap.getZoom()>=16&&window.fixtureMap.getPitch()>=55,null,{timeout:20000})
 await page.waitForFunction(()=>window.fixtureMap.getLayer('pazo-place-models')&&window.fixtureMap
  .queryRenderedFeatures({layers:['pazo-place-models']}).length>0,null,{timeout:90000})
 await page.waitForTimeout(1200)
 await page.screenshot({path:resolve(output,'pazo-native-model-close.png')})
 close=await state()
 console.log(JSON.stringify({milestone:'native-model',features:close.pazoModelFeatures}))
 check(close.pazoModelLayer&&close.pazoModelFeatures>0,'native PAZO glTF layer renders place features up close')
 check(requests.some(item=>item.resource==='pazo-model'&&item.path.endsWith('.gltf')&&item.status===200),'original PAZO glTF loaded HTTP200')
 check(await page.getByTestId('map-selection').getAttribute('data-place-id')==='public-catalogue-0','carousel card selects and focuses real map')
 const marker=page.getByRole('button',{name:'Abrir lugar: Silver Lake Dog Park',exact:true})
 await page.evaluate(()=>window.fixtureClearSelection())
 await marker.click()
 check(await page.getByTestId('map-selection').getAttribute('data-place-id')==='public-catalogue-0','accessible map marker selects place')
 const carousel=page.getByRole('region',{name:'Carrusel horizontal de lugares'})
 await carousel.evaluate(element=>{element.scrollLeft=element.scrollWidth})
 await page.waitForFunction(()=>document.querySelector('[aria-label="Carrusel horizontal de lugares"]').scrollLeft>0)
 check(await carousel.evaluate(element=>element.scrollLeft)>0,'horizontal place carousel scrolls')
 console.log(JSON.stringify({milestone:'interactions',checks:checks.length}))
 }

 // Reproduce the original failure while leaving style/fonts reachable. The UI
 // must report tile authorization, keep Standard, and recover through Retry.
 scenario='forced-tile-denial';denyTiles=true
 if(!recoveryOnly){
  // GL persists authorized tiles across reloads independently of the PWA SW.
  // Clear the fixture context's cache so this scenario reaches real requests.
  await page.evaluate(()=>new Promise(resolve=>mapboxgl.clearStorage(()=>resolve())))
  await page.reload({waitUntil:'domcontentloaded'})
 }
 await page.getByText('Mapbox no autorizó la cartografía (HTTP 401/403). Revisa el token y los dominios permitidos.',{exact:true}).waitFor({timeout:90000})
 await page.waitForTimeout(1200)
 check(await page.locator('[data-pazo-map-state]').getAttribute('data-pazo-map-state')==='error','tile403 remains a truthful visible error')
 check((await state()).configuredStyle==='mapbox://styles/mapbox/standard','tile403 never switches to a fallback basemap')
 check(await page.locator('.pazo-place-card').count()===6,'cards remain available during tile denial')
 await page.screenshot({path:resolve(output,'tile-denial.png')})
 console.log(JSON.stringify({milestone:'tile-denial',checks:checks.length}))
 const denied=await state()
 scenario='retry-recovery';denyTiles=false
 const count=denied.mapCount
 await page.getByRole('button',{name:'Reintentar mapa',exact:true}).click()
 await page.waitForFunction(previous=>window.fixtureMapCount>previous,count,{timeout:20000})
 await page.waitForFunction(()=>{
  try{return Boolean(window.fixtureMap?.isStyleLoaded())&&window.fixtureMap.queryRenderedFeatures().some(feature=>!String(feature.source||'').startsWith('pazo-'))}
  catch{return false}
 },null,{timeout:90000})
 await page.locator('[data-pazo-map-state="ready"]').waitFor()
 check(await page.locator('[data-pazo-map-state]').getAttribute('data-pazo-map-state')==='ready','retry restores Standard streets and clears error')
 await page.screenshot({path:resolve(output,'retry-recovered.png')})
 check(errors.length===0,'no browser JavaScript exceptions')
 check(!failures.some(item=>item.reason==='unexpected_remote_request'),'no unexpected remote services or database requests')
 result={...result,result:'PASS',checks,overview,close,denied,recovered:await state()}
} catch(error){
 result={...result,result:'FAIL',checks,error:sanitize(error.message),state:await state().catch(()=>null)}
 await page.screenshot({path:resolve(output,'failure.png')}).catch(()=>{})
 process.exitCode=1
} finally {
 await writeFile(resolve(output,'result.json'),JSON.stringify({...result,requests,errors,failures},null,2))
 console.log(JSON.stringify({result:result.result,checks:checks.length,evidence:output,...(result.error?{error:result.error}:{})}))
 await browser.close()
}
