// Primary-brand-font recapture of native Administration with isolated real aggregates.
// The shared #150 harness has no index.html font link; add the existing product link.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {createRequire} from 'node:module'
import {createServer} from 'vite'
import {sql} from './marketing-sql-lab.mjs'
const require=createRequire(import.meta.url),{chromium}=require(process.env.PAZO_PLAYWRIGHT_MODULE||'../../continuidad/f18-browser-tools/node_modules/playwright')
const font=fs.readFileSync('index.html','utf8').match(/href="(https:\/\/fonts.googleapis.com\/css2[^" ]+)"/)[1]
const previous=sql('SELECT intelligence_enabled FROM marketing_private.collection_gate')
sql('UPDATE marketing_private.collection_gate SET intelligence_enabled=true;UPDATE marketing_private.retention_runtime SET last_success_at=now()')
for(let n=2;n<20;n++)sql(`SET ROLE authenticated;SET "request.jwt.claim.sub"='97000000-0000-4000-8000-${String(n).padStart(12,'0')}';SELECT public.pazo_intelligence_record_v1('97000000-0000-4000-8000-${String(700+n).padStart(12,'0')}', '[{"seq":1,"task":"care_create","kind":"attempt"},{"seq":2,"task":"care_create","kind":"failure"}]')`)
process.env.VITE_SUPABASE_URL='https://mrybvqdebbgcayuvgkkr.supabase.co';process.env.VITE_SUPABASE_PUBLISHABLE_KEY='sb_publishable_synthetic'
const server=await createServer({logLevel:'error',server:{host:'127.0.0.1',port:5362,strictPort:true}})
const out='artifacts/issue153/visual';fs.mkdirSync(out,{recursive:true});let browser;const cases=[],errors=[]
try{
 await server.listen();browser=await chromium.launch({headless:true,...(process.env.PAZO_CHROMIUM_PATH?{executablePath:process.env.PAZO_CHROMIUM_PATH}:{channel:process.platform==='win32'?'msedge':undefined})})
 for(const [lang,width]of [['es',320],['es',390],['en',1440]]){
  const context=await browser.newContext({viewport:{width,height:900},locale:lang==='es'?'es-GT':'en-US',reducedMotion:'reduce',serviceWorkers:'block'})
  await context.route('**/*',async route=>{
   const url=new URL(route.request().url());if(url.hostname==='127.0.0.1'||['fonts.googleapis.com','fonts.gstatic.com'].includes(url.hostname))return route.continue()
   const rpc=url.pathname.split('/rpc/')[1]
   const reply=(v,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(v)})
   if(['pazo_admin_intelligence_summary_v1','pazo_admin_behavior_summary_v1'].includes(rpc)){
    const a=JSON.parse(route.request().postData());assert.equal(a.p_segment,'all');assert.equal(a.p_creative,'all')
    return reply(JSON.parse(sql(`SET ROLE authenticated;SET "request.jwt.claim.sub"='96000000-0000-4000-8000-000000000031';SET "request.jwt.claims"='{"aal":"aal2"}';SELECT public.${rpc}(${Number(a.p_days)})`)))
   }
   return reply(null,503)
  })
  const page=await context.newPage();page.on('pageerror',e=>errors.push(String(e)));await page.goto(`http://127.0.0.1:5362/supabase/tests/marketing/behavior-harness.html?lang=${lang}`)
  await page.addStyleTag({url:font});await page.evaluate(()=>document.fonts.load('700 16px Quicksand'))
  assert.equal(await page.evaluate(()=>document.fonts.check('700 16px Quicksand')),true)
  if(width<1024)await page.getByRole('combobox',{name:lang==='es'?'Secciones del panel':'Dashboard sections'}).selectOption('behavior');else await page.getByRole('button',{name:lang==='es'?'Comportamiento':'Behavior',exact:true}).click()
  await page.locator('.pa-details').filter({has:page.locator('summary').filter({hasText:lang==='es'?'Explorar tareas':'Explore tasks'})}).locator('summary').first().click();await page.locator('.intelligence-coverage').waitFor()
  const captures=[]
  for(const q of [0,1,2,3,4]){
   await page.locator('.intelligence-questions button').nth(q).click();await page.locator('.behavior-intro').scrollIntoViewIfNeeded();const name=`${lang}-${width}-q${q}.png`;await page.screenshot({path:out+'/'+name,fullPage:true});captures.push(name)
   if(q===3){await page.locator('.intelligence-proposals').scrollIntoViewIfNeeded();const name=`${lang}-${width}-proposals.png`;await page.screenshot({path:out+'/'+name,fullPage:true});captures.push(name)}
   assert.ok(await page.getByTestId('intelligence-panel').evaluate(e=>e.scrollWidth<=e.clientWidth+1))
  }
  cases.push({lang,width,font:'Quicksand loaded from existing product index.html link',captures,status:'PASS'});await context.close()
 }
 assert.deepEqual(errors,[]);fs.writeFileSync(out+'/results.json',JSON.stringify({status:'PASS',cases,errors,hostedWrites:0,source:'Actual native dashboard and isolated PostgreSQL17; Auth double; existing primary font loaded'},null,2)+'\n');console.log(JSON.stringify({status:'PASS',cases:cases.length,errors,hostedWrites:0}))
}finally{await browser?.close();await server.close();sql(`UPDATE marketing_private.collection_gate SET intelligence_enabled=${previous==='t'?'true':'false'}`)}
