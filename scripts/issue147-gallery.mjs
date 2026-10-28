// Audit contact sheets of unmodified full-frame runtime PNGs, not mockups.
import fs from 'node:fs'
import path from 'node:path'
import {createRequire} from 'node:module'
const require=createRequire(import.meta.url)
const {chromium}=require(process.env.PAZO_PLAYWRIGHT_MODULE||'../../continuidad/f18-browser-tools/node_modules/playwright')
const folder=path.resolve(process.argv[2]);const browser=await chromium.launch({headless:true,...(process.env.PAZO_CHROMIUM_PATH?{executablePath:process.env.PAZO_CHROMIUM_PATH}:{channel:process.platform==='win32'?'msedge':undefined})})
try{
 for(const lang of ['es','en'])for(const width of [320,390,430]){
  const page=await browser.newPage({viewport:{width:width*2+36,height:900},deviceScaleFactor:1})
  await page.route('**/*',r=>r.abort())
  const cells=['pending','content','empty','error'].map(state=>{
   const file=path.join(folder,`${lang}-${width}-${state}-home.png`)
   return `<figure><figcaption>${lang} ${width} — ${state} (forced QA)</figcaption><img width="${width}" src="data:image/png;base64,${fs.readFileSync(file).toString('base64')}"></figure>`
  })
  await page.setContent(`<style>body{margin:12px;background:#dce3df;font:13px system-ui;display:grid;grid-template-columns:repeat(2,${width}px);gap:12px}figure{margin:0}figcaption{height:26px}img{display:block}</style>${cells.join('')}`)
  await page.locator('img').evaluateAll(images=>Promise.all(images.map(i=>i.decode())))
  await page.screenshot({path:path.join(folder,`gallery-${lang}-${width}.png`),fullPage:true})
  await page.close()
 }
 for(const lang of ['es','en'])for(const view of ['arrival','recovery']){
  const widths=[320,390,430]
  const files=widths.map(width=>path.join(folder,`${lang}-${width}-${view==='arrival'?'pending-arrival':'recovered-home'}.png`))
  if(!files.every(file=>fs.existsSync(file)))continue
  const page=await browser.newPage({viewport:{width:1188,height:900},deviceScaleFactor:1})
  await page.route('**/*',r=>r.abort())
  const cells=files.map((file,i)=>`<figure><figcaption>${lang} ${widths[i]} — ${view} (forced QA)</figcaption><img width="${widths[i]}" src="data:image/png;base64,${fs.readFileSync(file).toString('base64')}"></figure>`)
  await page.setContent(`<style>body{margin:12px;background:#dce3df;font:13px system-ui;display:flex;gap:12px;align-items:flex-start}figure{margin:0}figcaption{height:26px}img{display:block}</style>${cells.join('')}`)
  await page.locator('img').evaluateAll(images=>Promise.all(images.map(i=>i.decode())))
  await page.screenshot({path:path.join(folder,`gallery-${view}-${lang}.png`),fullPage:true})
  await page.close()
 }
}finally{await browser.close()}
