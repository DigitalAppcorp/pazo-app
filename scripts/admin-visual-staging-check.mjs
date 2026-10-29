import assert from 'node:assert/strict'
import fs from 'node:fs'
import {createRequire} from 'node:module'
const require=createRequire(import.meta.url),{chromium}=require(process.env.PAZO_PLAYWRIGHT_MODULE||'../../continuidad/f18-browser-tools/node_modules/playwright')
const origin='http://127.0.0.1:5364',browser=await chromium.launch({headless:true,...(process.env.PAZO_CHROMIUM_PATH?{executablePath:process.env.PAZO_CHROMIUM_PATH}:{channel:process.platform==='win32'?'msedge':undefined})}),page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[]
page.on('pageerror',e=>errors.push(e.message))
await page.goto(origin+'/supabase/tests/marketing/behavior-harness.html?lang=es')
await page.locator('.pa-kpi>strong').first().filter({hasText:'120'}).waitFor()
await page.getByRole('button',{name:/^Ads/}).click();await page.locator('.pa-kpi>strong').first().filter({hasText:'80'}).waitFor()
await page.getByRole('button',{name:/^Todos/}).click();await page.locator('.pa-kpi>strong').first().filter({hasText:'120'}).waitFor()
const denied=await fetch(origin+'/rest/v1/rpc/create_pet_profile',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})
assert.equal(denied.status,503)
assert.equal(await page.locator('[data-pazo-admin-live-mfa]').count(),0);assert.deepEqual(errors,[])
await page.screenshot({path:'artifacts/admin-visual/interactive-staging.png',fullPage:true})
fs.writeFileSync('artifacts/admin-visual/interactive-staging.json',JSON.stringify({status:'PASS',url:origin+'/supabase/tests/marketing/behavior-harness.html?lang=es',transport:'actual HTTP to isolated PG17',auth:'disclosed QA double',checks:['120 accounts','Ads80','All120','non-allowlisted write RPC503','no MFA widget','no runtime errors'],hostedWrites:0},null,2))
await browser.close();console.log('PASS interactive HTTP staging')
