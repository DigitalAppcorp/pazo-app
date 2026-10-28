// Contact sheets of original screenshots; no product mockups or image edits.
import fs from 'node:fs'
import path from 'node:path'
import {createRequire} from 'node:module'
const require=createRequire(import.meta.url),{chromium}=require(process.env.PAZO_PLAYWRIGHT_MODULE||'../../continuidad/f18-browser-tools/node_modules/playwright')
const folder=path.resolve(process.argv[2]||'artifacts/issue150/browser')
const browser=await chromium.launch({headless:true,...(process.env.PAZO_CHROMIUM_PATH?{executablePath:process.env.PAZO_CHROMIUM_PATH}:{channel:process.platform==='win32'?'msedge':undefined})})
try{for(const lang of ['es','en'])for(const width of [320,390,430,1440]){
 const display=width===1440?720:width,page=await browser.newPage({viewport:{width:display*2+36,height:1000}})
 await page.route('**/*',r=>r.abort())
 const cells=['content','paused','insufficient','error','loading','mfa'].map(state=>`<figure><figcaption>${lang} ${width} · ${state} · synthetic QA</figcaption><img width="${display}" src="data:image/png;base64,${fs.readFileSync(path.join(folder,`${lang}-${width}-${state}.png`)).toString('base64')}"></figure>`)
 await page.setContent(`<style>body{margin:12px;background:#dce3df;font:12px system-ui;display:grid;grid-template-columns:repeat(2,${display}px);gap:12px}figure{margin:0}figcaption{height:24px}img{display:block}</style>${cells.join('')}`)
 await page.locator('img').evaluateAll(images=>Promise.all(images.map(i=>i.decode())))
 await page.screenshot({path:path.join(folder,`gallery-${lang}-${width}.png`),fullPage:true});await page.close()
}}finally{await browser.close()}
