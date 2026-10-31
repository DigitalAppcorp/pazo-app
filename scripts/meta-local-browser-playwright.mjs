// #169 — Real Chromium + supabase-js and real GoTrue/Edge/SQL via localhost.
// The served page has PAZO's origin but NEVER makes production requests:
// Playwright intercepts the sole synthetic HTML and aborts all remote traffic.
import assert from 'node:assert/strict'
import {randomUUID} from 'node:crypto'
import {createRequire} from 'node:module'
import {build} from 'vite'
import {mkdtempSync,readFileSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join,resolve} from 'node:path'
import {localPsql} from './meta-local-gotrue-sql-lab.mjs'
const {chromium}=createRequire(import.meta.url)('playwright')
const ORIGIN='https://pazo-app.vercel.app'
const UUID4=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
function localOnly(url,port){
 const u=new URL(url)
 assert.equal(u.protocol,'http:')
 assert.ok(['127.0.0.1','localhost'].includes(u.hostname))
 assert.equal(u.port,String(port))
 return u.origin
}
export async function runMetaRealBrowser({api,key,serviceKey,dbUrl}={}){
 const base=localOnly(api,54321)
 assert.ok(typeof key==='string'&&key.length>=16)
 assert.ok(typeof serviceKey==='string'&&serviceKey.length>=16)
 const sql=localPsql(dbUrl)
 // A SECOND synthetic Auth user is needed: the first user deliberately
 // withdrew permanently in the earlier real-JWT/SQL test. Never re-grant.
 const email='pazo-browser-'+randomUUID().slice(0,12)+'@example.invalid'
 const password='PazoBrowser!4'+randomUUID().replaceAll('-','')
 console.log('META_BROWSER_PHASE create_local_synthetic_user')
 const create=await fetch(base+'/auth/v1/admin/users',{
  method:'POST',redirect:'manual',signal:AbortSignal.timeout(12000),
  headers:{apikey:serviceKey,authorization:'Bearer '+serviceKey,
    'content-type':'application/json'},
  body:JSON.stringify({email,password,email_confirm:true}),
 })
 assert.ok([200,201].includes(create.status),'local_admin_synthetic_user_create_failed')
 const data=await create.json()
 console.log('META_BROWSER_PHASE local_auth_created')
 const ownerId=data.user?.id||data.id
 assert.match(String(ownerId),/^[0-9a-f-]{36}$/i)
 assert.ok(data.email_confirmed_at||data.user?.email_confirmed_at,
  'GoTrue must verify confirmed email for browser test')
 const ownerSql="'"+ownerId+"'"
 assert.equal(sql(`INSERT INTO marketing_private.acquisition(owner_id,signup_verified_at)
  SELECT id,email_confirmed_at FROM auth.users WHERE id=${ownerSql}
  RETURNING owner_id::text`),ownerId)
 // Bundle supabase-js into one JS file and serve BOTH HTML and JS only
 // through the intercepted PAZO-origin page. No real PAZO network access.
 console.log('META_BROWSER_PHASE local_sql_attribution_inserted')
 const temp=mkdtempSync(join(tmpdir(),'pazo-meta-chromium-'))
 let browser
 let blocked=0
 try{
  console.log('META_BROWSER_PHASE vite_bundle_begin')
  await build({configFile:false,logLevel:'error',build:{
    outDir:temp,emptyOutDir:true,minify:false,
    rollupOptions:{
      input:resolve('scripts/meta-browser-supabase-client.mjs'),
      output:{entryFileNames:'browser-lab.js',
        chunkFileNames:'chunks/[name]-[hash].js'},
    },
  }})
  const bundled=readFileSync(join(temp,'browser-lab.js'),'utf8')
  assert.ok(bundled.includes('__runPazoMetaBrowserLab'))
  console.log('META_BROWSER_PHASE vite_bundle_loaded')
  console.log('META_BROWSER_PHASE chromium_launch_begin')
  browser=await chromium.launch({headless:true,args:['--no-sandbox']})
  console.log('META_BROWSER_PHASE chromium_launched')
  const context=await browser.newContext({
    viewport:{width:390,height:844},serviceWorkers:'block',
    ignoreHTTPSErrors:false,
  })
  const page=await context.newPage()
  await page.route('**/*',async route=>{
    const u=new URL(route.request().url())
    if(u.origin===ORIGIN&&u.pathname==='/__meta_browser_lab/'){
      return route.fulfill({status:200,contentType:'text/html; charset=utf-8',
        body:'<!doctype html><meta charset="utf-8"><title>local synthetic contract</title><script type="module" src="/__meta_browser_lab/browser-lab.js"></script>'})
    }
    if(u.origin===ORIGIN&&u.pathname==='/__meta_browser_lab/browser-lab.js'){
      return route.fulfill({status:200,contentType:'text/javascript; charset=utf-8',
        body:bundled})
    }
    if(u.origin===ORIGIN&&u.pathname==='/favicon.ico')
      return route.fulfill({status:204,body:''})
    if(u.protocol==='http:'&&u.hostname==='127.0.0.1'
       &&u.port==='54321'&&(
         u.pathname.startsWith('/auth/v1/')
         ||u.pathname.startsWith('/functions/v1/pazo-meta-lab/')))
      return route.continue()
    blocked++
    return route.abort('blockedbyclient')
  })
  await page.goto(ORIGIN+'/__meta_browser_lab/',{waitUntil:'domcontentloaded'})
  console.log('META_BROWSER_PHASE synthetic_page_loaded')
  await page.waitForFunction(()=>typeof window.__runPazoMetaBrowserLab==='function',
    null,{timeout:15000})
  console.log('META_BROWSER_PHASE client_module_loaded')
  const result=await page.evaluate(args=>
    window.__runPazoMetaBrowserLab(args),{api:base,key,email,password})
  console.log('META_BROWSER_PHASE browser_invocation_completed')
  assert.equal(result.status,'REAL_BROWSER_SUPABASE_JS_META_OFF_PASS')
  assert.equal(result.ownerId,ownerId)
  assert.match(result.eventId,UUID4)
  assert.equal(result.datasetId,'1438916858347709')
  assert.equal(result.simulatedPixelCallbacks,1)
  assert.equal(result.first,'queued')
  assert.equal(result.gpcVeto,'suppressed')
  assert.equal(result.withdrawal,'withdrawn')
  assert.ok(result.sdkFunctionInvocations>=3,'supabase-js invoke must reach local Edge')
  assert.equal(blocked,0,'browser attempted forbidden external network')
  assert.equal(sql(`SELECT event_id::text FROM marketing_private.meta_outbox_candidate
    WHERE owner_id=${ownerSql}`),result.eventId)
  assert.equal(sql(`SELECT status FROM marketing_private.meta_outbox_candidate
    WHERE owner_id=${ownerSql}`),'suppressed')
  assert.equal(sql(`SELECT decision FROM marketing_private.meta_purpose_candidate
    WHERE owner_id=${ownerSql}`),'withdrawn')
  console.log('META_BROWSER_PHASE real_chromium_supabase_js_auth_grant_receipt_gpc_withdrawal')
  return {status:result.status,
    actualChromium:true,actualSupabaseJs:true,realGoTrue:true,
    realEdgeHttp:true,persistedSql:true,
    dedupLocallyVerified:true,simulatedPixelCallbacks:1,
    metaRequests:0,productionRequests:0}
 }finally{
  if(browser)await browser.close()
  rmSync(temp,{recursive:true,force:true})
 }
}
