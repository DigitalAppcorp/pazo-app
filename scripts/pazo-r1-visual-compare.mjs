// R1 composition approval evidence: compares the ORIGINAL main source against
// the proposed R1 source with EXACTLY the same fixture file and synthetic data.
// GitHub Actions runs both development servers on loopback; no hosted services.
// A successful screenshot is not visual acceptance; review the before/after gallery.
import {createRequire} from 'node:module'
import {mkdirSync,writeFileSync} from 'node:fs'
import {resolve,join} from 'node:path'
import assert from 'node:assert/strict'

const require=createRequire(import.meta.url)
const {chromium}=require(process.env.PAZO_PLAYWRIGHT_MODULE||'playwright')
const urls={baseline:new URL(process.env.PAZO_R1_BASELINE||'http://127.0.0.1:5188'),
  proposal:new URL(process.env.PAZO_R1_PROPOSAL||'http://127.0.0.1:5189')}
for(const url of Object.values(urls)){
  assert.equal(url.protocol,'http:')
  assert.ok(['127.0.0.1','localhost'].includes(url.hostname))
}
const cases=['welcome','signup','pet-form','feed','communities-empty','invitation']
const dimensions=[[320,568],[390,844],[430,932],[768,1024],[1440,900]]
const languages=['es','en']
const output=resolve(process.env.PAZO_R1_OUTPUT||'artifacts/r1-visual-comparison')
mkdirSync(output,{recursive:true})
const report={schema:'pazo.r1.visual.comparison.v1',
  baseline_sha:process.env.PAZO_R1_BASELINE_SHA||'UNKNOWN',
  proposal_sha:process.env.PAZO_R1_PROPOSAL_SHA||'UNKNOWN',
  comparison:'same fixture and synthetic data; browser render evidence, not a product release or WCAG certificate',
  captured:0,errors:[],pairs:[]}
const browser=await chromium.launch({headless:true,args:['--no-sandbox'],
  ...(process.env.PAZO_CHROMIUM_PATH?{executablePath:process.env.PAZO_CHROMIUM_PATH}:{})})
try {
for(const scene of cases)for(const [width,height]of dimensions)for(const lang of languages){
 const id=scene+'-'+width+'-'+lang, pair={id,scene,viewport:{width,height},lang,renders:{},delta:null}
 for(const [version,origin]of Object.entries(urls)){
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,
    locale:lang==='es'?'es-US':'en-US',reducedMotion:'reduce',serviceWorkers:'block',permissions:[]})
  const page=await context.newPage()
  const telemetry={errors:[],blocked_external:0,blocked_non_get:0,ready:false,screenshot:null}
  page.on('pageerror',e=>telemetry.errors.push(String(e.message).slice(0,220)))
  page.on('dialog',async d=>{telemetry.errors.push('Unexpected dialog: '+d.type());await d.dismiss()})
  await context.route('**/*',async route=>{
    const req=route.request(),target=new URL(req.url())
    if(target.origin===origin.origin&&['GET','HEAD'].includes(req.method()))
      return route.continue()
    if(target.origin===origin.origin)telemetry.blocked_non_get++
    else telemetry.blocked_external++
    return route.abort('blockedbyclient')
  })
  try{
    const url=origin.origin+'/supabase/tests/r1/visual-comparison.html?scene='+scene+'&lang='+lang
    const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:24000})
    if(response?.status()!==200)throw Error('Expected fixture HTTP 200, got '+response?.status())
    await page.locator('[data-r1-scene="'+scene+'"]').waitFor({state:'attached',timeout:12000})
    await page.waitForTimeout(300)
    const metrics=await page.evaluate(()=>{
      const root=document.querySelector('[data-r1-scene]')
      const text=(root?.textContent||document.querySelector('[role=dialog]')?.textContent||'').trim()
      const sel=[...document.querySelectorAll('h1,h2,h3,p,label')].filter(e=>{
        const st=getComputedStyle(e),box=e.getBoundingClientRect()
        return st.display!=='none'&&box.height>0
      }).slice(0,28)
      const elements=sel.map(e=>{
        const box=e.getBoundingClientRect(),styles=getComputedStyle(e)
        return {tag:e.tagName.toLowerCase(),text:e.textContent?.trim().slice(0,55),
          x:Math.round(box.x),y:Math.round(box.y),w:Math.round(box.width),h:Math.round(box.height),
          marginTop:styles.marginTop,marginBottom:styles.marginBottom,fontSize:styles.fontSize}
      })
      const scrollRegions=[...document.querySelectorAll('*')].filter(e=>{
        const st=getComputedStyle(e)
        return /(auto|scroll)/.test(st.overflowY)&&e.scrollHeight>e.clientHeight+10
      }).length
      return {textLength:text.length,
        documentWidth:document.documentElement.scrollWidth,
        viewportWidth:document.documentElement.clientWidth,
        overflowX:document.documentElement.scrollWidth>document.documentElement.clientWidth+2,
        scrollRegions,elements}
    })
    if(metrics.textLength<10)throw Error('Fixture produced insufficient text')
    if(telemetry.errors.length||telemetry.blocked_non_get)throw Error('Unexpected JS error or local mutation')
    const relative='screenshots/'+version+'/'+id+'.png'
    mkdirSync(join(output,'screenshots',version),{recursive:true})
    await page.screenshot({path:join(output,relative),fullPage:true,animations:'disabled'})
    Object.assign(telemetry,{ready:true,screenshot:relative,metrics})
  }catch(error){telemetry.errors.push(String(error.message||error).slice(0,380))}
  finally {pair.renders[version]=telemetry;await context.close()}
 }
 const b=pair.renders.baseline,p=pair.renders.proposal
 if(b.ready&&p.ready){
  pair.delta={overflowBefore:b.metrics.overflowX,overflowAfter:p.metrics.overflowX,
    scrollBefore:b.metrics.scrollRegions,scrollAfter:p.metrics.scrollRegions,
    textElementsBefore:b.metrics.elements.length,textElementsAfter:p.metrics.elements.length,
    positionsChanged:p.metrics.elements.filter((e,i)=>!b.metrics.elements[i]||
      ['x','y','w','h','marginTop','marginBottom','fontSize'].some(k=>e[k]!==b.metrics.elements[i][k])).length}
  report.captured+=2
 }else report.errors.push({id,baseline:b.errors,proposal:p.errors})
 report.pairs.push(pair)
 process.stdout.write(JSON.stringify({id,captured:b.ready&&p.ready,
   overflowBaseline:pair.delta?.overflowBefore,overflowR1:pair.delta?.overflowAfter,
   elementsChanged:pair.delta?.positionsChanged})+'\n')
}
}finally {await browser.close()}
writeFileSync(join(output,'manifest.json'),JSON.stringify(report,null,2)+'\n')
const cards=report.pairs.map(pair=>{
 const b=pair.renders.baseline,p=pair.renders.proposal
 const figure=(v,side)=>v.screenshot?'<figure><figcaption>'+side+'</figcaption><a href="'+v.screenshot+'"><img loading="lazy" src="'+v.screenshot+'"></a></figure>':'<p>CAPTURE FAILED: '+v.errors.join('; ')+'</p>'
 return '<article><h2>'+pair.id+'</h2><p>Changed measured elements: '+(pair.delta?.positionsChanged??'?')+
 ', overflow before/after: '+(pair.delta?.overflowBefore??'?')+'/'+(pair.delta?.overflowAfter??'?')+'</p><div class="compare">'+
 figure(b,'BASELINE main')+figure(p,'PROPOSAL R1')+'</div></article>'
}).join('\n')
const html='<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>PAZO R1 antes y después</title>'+
'<style>body{margin:0;background:#edf1ec;color:#173b36;font:15px system-ui}header{padding:24px;background:#fff}h1{margin:0}main{max-width:1600px;margin:auto;padding:20px}article{background:white;padding:18px;margin-bottom:24px;border-radius:15px}.compare{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px}figure{margin:0;min-width:0}img{display:block;width:100%;max-height:700px;object-fit:contain;background:#eee}figcaption{font-weight:700;margin-bottom:8px}@media(max-width:720px){.compare{grid-template-columns:1fr}}</style>'+
'<header><h1>PAZO R1 · Comparación real antes/después</h1><p>Baseline '+report.baseline_sha+'; R1 '+report.proposal_sha+
'; '+report.captured+' capturas en '+report.pairs.length+' pares. Localhost y datos sintéticos, sin cobros. <a href="manifest.json">Manifest</a></p></header><main>'+cards+'</main></html>'
writeFileSync(join(output,'index.html'),html)
process.stdout.write(JSON.stringify({paired:report.pairs.length,images:report.captured,errors:report.errors.length},null,2)+'\n')
if(report.errors.length)process.exitCode=1
