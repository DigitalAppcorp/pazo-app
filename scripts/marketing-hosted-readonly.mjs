// Public page only: no Auth, account fixtures, providers, or hosted writes.
import {createRequire} from 'node:module'
import {mkdirSync,writeFileSync} from 'node:fs'
import assert from 'node:assert/strict'
const {chromium}=createRequire(import.meta.url)(process.env.PAZO_PLAYWRIGHT_MODULE||'playwright')
const out=process.env.PAZO_MARKETING_SCREENSHOTS
assert.ok(out,'Explicit local evidence folder required')
mkdirSync(out,{recursive:true})
const browser=await chromium.launch({headless:true,...(process.env.PAZO_CHROMIUM_PATH?{executablePath:process.env.PAZO_CHROMIUM_PATH}:{})})
const cases=[]
try{
 for(const width of [320,390,1440]){
  const context=await browser.newContext({viewport:{width,height:844},serviceWorkers:'block',reducedMotion:'reduce'})
  const errors=[],marketing=[],blocked=[]
  await context.route('**/*',route=>{
   const request=route.request()
   if(!['GET','HEAD','OPTIONS'].includes(request.method())){blocked.push({method:request.method(),host:new URL(request.url()).hostname});return route.abort()}
   if(/pazo-marketing|connect.facebook.net|facebook.com\/tr|challenges.cloudflare.com/.test(request.url()))marketing.push(new URL(request.url()).hostname)
   return route.continue()
  })
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message))
  const response=await page.goto('https://pazo-app.vercel.app/',{waitUntil:'networkidle',timeout:45000})
  await page.getByRole('button').first().waitFor()
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)
  const buttons=await page.getByRole('button').allTextContents()
  await page.screenshot({path:out+`/hosted-${width}.png`,fullPage:true})
  cases.push({width,status:response.status(),overflow,errors,marketing,blocked,buttons:buttons.map(s=>s.trim()).filter(Boolean)})
  assert.equal(response.status(),200);assert.equal(overflow,false);assert.equal(errors.length,0);assert.equal(marketing.length,0)
  await context.close()
 }
}finally{await browser.close();writeFileSync(out+'/hosted-browser.json',JSON.stringify({kind:'HOSTED_PUBLIC_READ_ONLY',authenticated:false,physicalInstalledPwa:false,cases},null,2))}
console.log(JSON.stringify(cases,null,2))
