// PAZO Visual Lab: offline-to-provider visual evidence from local DEV build only.
// Never accesses a deployed PAZO host, hosted auth, PayPal, Mapbox or Supabase.
// Screenshots/axe findings are artifacts only, not certified UX PASS.
import assert from 'node:assert/strict'
import {createRequire} from 'node:module'
import {readFileSync, mkdirSync, writeFileSync} from 'node:fs'
import {join,resolve,relative} from 'node:path'
import {VISUAL_CASES,selectVisualCases,selectVisualViewports,VISUAL_LANGUAGES} from './cases.mjs'

const require=createRequire(import.meta.url)
const {chromium}=require(process.env.PAZO_PLAYWRIGHT_MODULE||'playwright')
const ORIGIN=process.env.PAZO_VISUAL_LAB_ORIGIN||'http://127.0.0.1:5189'
const u=new URL(ORIGIN)
assert.equal(u.protocol,'http:','visual lab must use HTTP loopback only')
assert.ok(['localhost','127.0.0.1'].includes(u.hostname),'visual lab MUST be local')
assert.equal(u.username,'')
assert.equal(u.password,'')
assert.equal(u.pathname,'/')
const scope=process.argv.find(s=>s.startsWith('--scope='))?.split('=')[1]||'pilot'
const onlyViewport=process.argv.find(s=>s.startsWith('--viewport='))?.split('=')[1]||null
assert.ok(['pilot','full'].includes(scope),'scope must be pilot or full')
const base=resolve(process.env.PAZO_VISUAL_LAB_DIR||'artifacts/visual-lab')
const axeFile=process.env.PAZO_AXE_CORE_PATH
const axeSource=axeFile?readFileSync(axeFile,'utf8'):null
mkdirSync(base,{recursive:true})
const manifest={
  schema:'pazo.visual.audit.v1',
  disclaimer:'SYNTHETIC QA; NOT production metrics; NOT WCAG certification',
  source_sha:process.env.PAZO_VISUAL_LAB_SHA||process.env.GITHUB_SHA||'LOCAL_UNPINNED',
  scope, origin_kind:'local_loopback_only', created_at:new Date().toISOString(),
  inventory_target:86,
  implemented_scenes:VISUAL_CASES.length,
  captures:[],
  environment:{playwright:'1.56.1',external_http:'blocked',service_workers:'blocked'},
}
const browser=await chromium.launch({headless:true,args:['--no-sandbox'],
  ...(process.env.PAZO_CHROMIUM_PATH?{executablePath:process.env.PAZO_CHROMIUM_PATH}:{})})
const cases=selectVisualCases(scope)
const allViewports=selectVisualViewports(scope)
assert.ok(!onlyViewport||Object.hasOwn(allViewports,onlyViewport),'requested viewport must be in selected scope')
const viewports=onlyViewport?{[onlyViewport]:allViewports[onlyViewport]}:allViewports
const record=(o)=>{manifest.captures.push(o)}
const safeName=(v)=>v.replace(/[^a-z0-9_-]/gi,'_')
function escapeHtml(s){return String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;')}
try{
for(const spec of cases)for(const [sizeName,viewport] of Object.entries(viewports))for(const lang of VISUAL_LANGUAGES){
  const id=spec.id+'-'+sizeName+'-'+lang
  const out={id,case:spec.id,group:spec.group,level:spec.level,lang,viewport,
    status:'NOT_TESTED',screenshot:null,errors:[],blocked_external:0,
    blocked_non_get:0,overflow:null,axe:'NOT_TESTED',axe_findings:[],a11y_input_suspects:0,
    interaction:null,scroll_region:null,screenshot_bottom:null}
  const ctx=await browser.newContext({viewport,deviceScaleFactor:1,
    locale:lang==='es'?'es-US':'en-US',timezoneId:'America/Los_Angeles',
    reducedMotion:'reduce',serviceWorkers:'block',
    colorScheme:'light',permissions:[]})
  const page=await ctx.newPage()
  page.on('dialog',async dialog=>{out.errors.push('Native dialog unexpectedly opened');await dialog.dismiss()})
  page.on('pageerror',error=>out.errors.push(String(error.message||error.name).slice(0,220)))
  await ctx.route('**/*',async route=>{
    const req=route.request(),url=new URL(req.url())
    if(url.origin===ORIGIN&&(req.method()==='GET'||req.method()==='HEAD'))
      return route.continue()
    if(url.origin===ORIGIN)out.blocked_non_get++
    else out.blocked_external++
    return route.abort('blockedbyclient')
  })
  try{
    const res=await page.goto(ORIGIN+'/supabase/tests/visual/browser-harness.html?case='+encodeURIComponent(spec.id)+'&lang='+lang,
      {waitUntil:'domcontentloaded',timeout:25000})
    if(res?.status()!==200)throw Error('Local harness returned '+res?.status())
    await page.locator('[data-visual-surface="'+spec.id+'"]').waitFor({state:'attached',timeout:17000})
    await page.waitForTimeout(450)
    // Read-only user-interface navigation, never submit forms, payments or decisions.
    const safeClicks={
      'feed-nearby':['Cerca','Nearby'],
      'pet-settings':['Configuración','Settings'],
      'pet-picker':['Cambiar','Switch'],
      'pet-edit':['Editar','Edit'],
      'care-history':['Historial','History'],
      'care-create':['Añadir nuevo cuidado','Add care item'],
      'notifications-community':['Avistamientos','Sightings'],
      'messages-request':['Solicitudes','Requests'],
      'search-filter-people':['Mascotas','Pets'],
      'admin-users':['Usuarios','Users'],
      'admin-pets':['Mascotas','Pets'],
      'admin-finance':['Membresías','Memberships'],
      'admin-ideas':['Fake Doors','Fake Doors'],
      'admin-infra':['Supabase','Supabase'],
      'admin-maintenance':['Mantenimiento','Maintenance'],
      'admin-paypal':['Configuración · PayPal','Settings · PayPal'],
    }
    if(safeClicks[spec.id]){
      const exact=['feed-nearby','care-create'].includes(spec.id)?false:true
      const title=safeClicks[spec.id][lang==='es'?0:1]
      await page.getByRole('button',{name:title,exact}).first().click({timeout:6500})
      out.interaction='CLICKED_READ_ONLY:'+title
      await page.waitForTimeout(200)
    }
    const metrics=await page.evaluate(()=>{
      const root=document.querySelector('[data-visual-surface]')
      const visible=(e)=>{const s=getComputedStyle(e);return s.display!=='none'&&s.visibility!=='hidden'}
      const interactive=[...document.querySelectorAll('button,a,input,select,textarea')].filter(visible)
      const unlabeled=[...document.querySelectorAll('input:not([type=hidden]),textarea,select')]
        .filter(e=>visible(e)&&!e.labels?.length&&!e.getAttribute('aria-label')&&!e.getAttribute('aria-labelledby'))
      return {
        rootText:(root?.textContent||document.querySelector('[role="dialog"]')?.textContent||'').trim().length,
        documentWidth:document.documentElement.scrollWidth,
        viewportWidth:document.documentElement.clientWidth,
        appShellWidth:document.querySelector('[data-pazo-app-shell]')?.getBoundingClientRect().width||null,
        interactiveCount:interactive.length,
        a11yInputSuspects:unlabeled.length,
      }
    })
    out.overflow=metrics.documentWidth>metrics.viewportWidth+2
    out.a11y_input_suspects=metrics.a11yInputSuspects
    // Internal scroll is independent of documentElement. Record it explicitly.
    const scrollState=await page.evaluate(()=>{
      const nodes=[...document.querySelectorAll('*')].filter(e=>{
        const css=getComputedStyle(e)
        return /(auto|scroll)/.test(css.overflowY)&&e.scrollHeight>e.clientHeight+12&&e.clientHeight>70
      })
      return nodes.map(e=>({
        tag:e.tagName.toLowerCase(),role:e.getAttribute('role')||null,
        clientHeight:e.clientHeight,scrollHeight:e.scrollHeight,
        classToken:String(e.className||'').slice(0,60)
      })).sort((a,b)=>(b.scrollHeight-b.clientHeight)-(a.scrollHeight-a.clientHeight))[0]||null
    })
    out.scroll_region=scrollState;
    out.interactive_count=metrics.interactiveCount
    out.app_shell_width=metrics.appShellWidth
    if(metrics.rootText<5)throw Error('Rendered fixture lacks visible content')
    if(out.blocked_non_get>0)throw Error('Fixture unexpectedly attempted local non-GET')
    // axe runs only against the synthetic local DOM, never a remote account.
    if(axeSource){
      await page.addScriptTag({content:axeSource})
      const audit=await page.evaluate(async()=>{
        const a=await window.axe.run(document,{
          runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']}
        })
        return a.violations.map(v=>({id:v.id,impact:v.impact,description:v.help,
          nodes:v.nodes.slice(0,8).map(n=>({target:n.target,summary:n.failureSummary?.slice(0,180)}))}))
      })
      out.axe_findings=audit
      out.axe='EXECUTED_WITH_FINDINGS_RECORDED'
    }
    const screenshot='screenshots/'+safeName(spec.group)+'/'+safeName(spec.id)+'/'+id+'.png'
    mkdirSync(join(base,'screenshots',safeName(spec.group),safeName(spec.id)),{recursive:true})
    await page.screenshot({path:join(base,screenshot),fullPage:true,animations:'disabled',timeout:15000})
    out.screenshot=screenshot
    if(scrollState&&['320','390'].includes(sizeName)){
      const didScroll=await page.evaluate(()=>{
        const nodes=[...document.querySelectorAll('*')].filter(e=>{
          const css=getComputedStyle(e)
          return /(auto|scroll)/.test(css.overflowY)&&e.scrollHeight>e.clientHeight+12&&e.clientHeight>70
        }).sort((a,b)=>(b.scrollHeight-b.clientHeight)-(a.scrollHeight-a.clientHeight))
        if(!nodes.length)return false
        nodes[0].scrollTop=nodes[0].scrollHeight
        return true
      })
      if(didScroll){
        await page.waitForTimeout(110)
        const bottom='screenshots/'+safeName(spec.group)+'/'+safeName(spec.id)+'/'+id+'-scroll-bottom.png'
        await page.screenshot({path:join(base,bottom),fullPage:true,animations:'disabled',timeout:15000})
        out.screenshot_bottom=bottom
      }
    }
    out.status=out.overflow?'CAPTURED_WITH_LAYOUT_WARNING':'CAPTURED'
  }catch(err){
    out.status='CAPTURE_FAILED'
    out.errors.push(String(err?.message||err).slice(0,360))
    // Preserve failure evidence when possible; never synthesize a passing image.
    try{
      const screenshot='screenshots/failures/'+id+'.png'
      mkdirSync(join(base,'screenshots/failures'),{recursive:true})
      await page.screenshot({path:join(base,screenshot),fullPage:true,timeout:4500})
      out.screenshot=screenshot
    }catch{}
  }finally{
    record(out)
    await ctx.close()
    process.stdout.write(JSON.stringify({id,status:out.status,blockedExternal:out.blocked_external,axe:out.axe_findings.length})+'\n')
  }
}
}finally{await browser.close()}
manifest.total=manifest.captures.length
manifest.captured=manifest.captures.filter(x=>x.status.startsWith('CAPTURED')).length
manifest.failed=manifest.captures.filter(x=>x.status==='CAPTURE_FAILED').length
manifest.axe_findings=manifest.captures.reduce((n,x)=>n+x.axe_findings.length,0)
writeFileSync(join(base,'manifest.json'),JSON.stringify(manifest,null,2)+'\n')
const cards=manifest.captures.map(x=>{
 const photo=x.screenshot?'<a href="'+escapeHtml(x.screenshot)+'"><img loading="lazy" src="'+escapeHtml(x.screenshot)+'" alt="'+escapeHtml(x.id)+'"></a>':''
 return '<article><div class="head"><strong>'+escapeHtml(x.id)+'</strong><span>'+escapeHtml(x.status)+'</span></div>'+
 photo+'<p>'+escapeHtml(x.level)+' · '+escapeHtml(x.group)+' · '+escapeHtml(x.viewport.width+'×'+x.viewport.height)+
 ' · overflow: '+escapeHtml(String(x.overflow))+' · axe: '+escapeHtml(String(x.axe_findings.length))+'</p></article>'
}).join('\n')
const page='<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+
'<title>PAZO — Galería QA sintética</title><style>body{font:15px system-ui;background:#f1f2ed;color:#173c34;margin:0}header{padding:26px;max-width:1250px;margin:auto}h1{margin:0 0 12px}main{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:18px;max-width:1250px;margin:auto;padding:22px}article{background:white;border-radius:16px;overflow:hidden;box-shadow:0 2px 10px #0011}article .head,article p{padding:10px 14px;margin:0;font-size:12px}.head{display:flex;flex-wrap:wrap;gap:8px;justify-content:space-between}img{width:100%;max-height:520px;object-fit:contain;background:#eee}a:focus-visible{outline:3px solid #153}</style>'+
'<header><h1>PAZO · Evidencia visual sintética</h1><p>Commit '+escapeHtml(manifest.source_sha)+
' · Capturas '+manifest.captured+'/'+manifest.total+' · Fallidas '+manifest.failed+
'. No son cuentas reales ni certificación WCAG. Los componentes se renderizaron en localhost y TODAS las conexiones externas fueron bloqueadas. <a href="manifest.json">Manifest JSON</a>.</p></header>'+
'<main>'+cards+'</main></html>'
writeFileSync(join(base,'index.html'),page)
process.stdout.write(JSON.stringify({source:manifest.schema,total:manifest.total,captured:manifest.captured,
  failed:manifest.failed,axe_findings:manifest.axe_findings,out:relative(process.cwd(),base)},null,2)+'\n')
if(manifest.failed)process.exitCode=1
