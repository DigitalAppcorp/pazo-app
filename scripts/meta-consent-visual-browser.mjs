// #169 — isolated ES/EN consent browser & accessibility smoke test.
// This script runs only in CI against an IN-MEMORY synthetic Vite page.
// It never imports the component into production App.tsx, never makes
// Meta/Supabase requests, and does not declare legal/visual acceptance.
import assert from 'node:assert/strict'
import {mkdirSync,writeFileSync} from 'node:fs'
import {createRequire} from 'node:module'
import {createServer} from 'vite'
import tailwind from '@tailwindcss/postcss'
import react from '@vitejs/plugin-react'
const require=createRequire(import.meta.url)
const {chromium}=require('playwright')
const PORT=5392,ORIGIN='http://127.0.0.1:'+PORT
const DIR='artifacts/meta-consent-ui'
const plugin={
 name:'pazo-meta-consent-test-only',
 configureServer(server){
  server.middlewares.use(async(req,res,next)=>{
   if(!req.url?.startsWith('/__meta_consent_lab__/'))return next()
   try{
    const markup='<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>PAZO isolated consent QA</title></head><body><div id="qa-root"></div><script type="module" src="/scripts/meta-consent-lab-entry.tsx"></script></body></html>'
    // Inject the same @vitejs/plugin-react preamble used on a normal Vite
    // HTML page. Otherwise Fast Refresh blocks the isolated TSX mount.
    const html=await server.transformIndexHtml(req.url,markup)
    res.setHeader('Content-Type','text/html; charset=utf-8')
    res.setHeader('Cache-Control','no-store')
    res.end(html)
   }catch(error){next(error)}
  })
 },
}
const server=await createServer({
 configFile:false,logLevel:'error',plugins:[react(),plugin],
 css:{postcss:{plugins:[tailwind()]}},
 server:{host:'127.0.0.1',port:PORT,strictPort:true},
})
let browser,blocked=0
const findings=[]
function fail(kind,message){findings.push({kind,message})}
try{
 await server.listen()
 browser=await chromium.launch({headless:true,args:['--no-sandbox']})
 mkdirSync(DIR,{recursive:true})
 for(const lang of ['es','en']){
  for(const width of [320,390,430]){
   for(const scenario of ['default','gpc','gpc-error','grant-error']){
    const context=await browser.newContext({viewport:{width,height:780},
     deviceScaleFactor:1,reducedMotion:'reduce',
     serviceWorkers:'block'})
    const page=await context.newPage()
    const pageIssues=[]
    page.on('pageerror',err=>pageIssues.push(
      'module_runtime_exception:'+String(err.message||'').slice(0,140)
       .replace(/https?:[^\\s]+/g,'local-url')))
    page.on('console',msg=>{
      if(msg.type()==='error')pageIssues.push(
        'console_error:'+msg.text().slice(0,140).replace(/https?:[^\\s]+/g,'local-url'))
    })
    page.on('requestfailed',req=>{
      const u=new URL(req.url())
      if(u.origin===ORIGIN)pageIssues.push('local_request_failed:'+u.pathname.slice(0,65))
    })
    page.on('response',res=>{
      const u=new URL(res.url())
      if(u.origin===ORIGIN&&res.status()>=400)
        pageIssues.push('local_http_'+res.status()+'_path_'+u.pathname.slice(0,70))
    })
    await page.route('**/*',async route=>{
     const url=new URL(route.request().url())
     if(url.origin===ORIGIN)return route.continue()
     blocked++
     return route.abort('blockedbyclient')
    })
    const url=ORIGIN+'/__meta_consent_lab__/?lang='+lang+'&case='+scenario
    await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000})
    try{
      await page.waitForFunction(()=>window.__metaLabReady===true,null,{timeout:9000})
    }catch{
      await page.screenshot({path:DIR+'/entry-failure.png',fullPage:true})
      const state=await page.evaluate(()=>({
        scripts:Array.from(document.scripts).map(x=>x.getAttribute('src')),
        rootChildCount:document.getElementById('qa-root')?.childElementCount,
      }))
      console.log('META_VISUAL_BOOT_FAILURE '+JSON.stringify({
        issues:pageIssues.slice(0,8),state}))
      throw Error('synthetic_visual_entry_failed')
    }
    const section=page.locator('section[aria-labelledby="meta-consent-title"]')
    await section.waitFor()
    assert.equal(await section.locator('h2').count(),1)
    const initial=await page.evaluate(()=>{
     const section=document.querySelector('section[aria-labelledby="meta-consent-title"]')
     const win=document.documentElement.clientWidth
     const bottom=Array.from(section.querySelectorAll('button,input')).map(e=>{
      const r=e.getBoundingClientRect(),css=getComputedStyle(e)
      return {type:e.tagName,width:r.width,height:r.height,
        font:parseFloat(css.fontSize),visible:css.visibility!=='hidden'&&r.height>0,
        clipped:r.left<0||r.right>win}
     })
     const copy=Array.from(section.querySelectorAll('p,label,button,h2')).map(e=>{
      const css=getComputedStyle(e)
      return {text:(e.textContent||'').slice(0,40),
        font:parseFloat(css.fontSize)}
     })
     return {documentWidth:document.documentElement.scrollWidth,
      clientWidth:win,controls:bottom,copy,
      checkbox:section.querySelector('input[type="checkbox"]')?.checked??null,
      grantLabel:section.querySelectorAll('button').length,
      ariaStatus:section.querySelectorAll('[role="status"]').length,
      alert:section.querySelectorAll('[role="alert"]').length,
     }
    })
    assert.ok(initial.documentWidth<=width+1,
     'horizontal_overflow_'+lang+'_'+width+'_'+scenario)
    assert.ok(initial.copy.filter(x=>x.text).every(x=>x.font>=15),
     'tiny_copy_'+lang+'_'+width+'_'+scenario)
    assert.ok(initial.controls.filter(x=>x.visible)
      .every(x=>x.height>=20&&!x.clipped),
     'clipped_interactive_element_'+lang+'_'+width+'_'+scenario)
    const buttons=section.locator('button')
    for(let n=0;n<await buttons.count();n++){
     const button=buttons.nth(n)
     if(!await button.isVisible())continue
     const bbox=await button.boundingBox()
     assert.ok(bbox?.height>=44,'touch_target_too_small_'+lang+'_'+scenario)
    }
    // Capture the actual INITIAL state before checking any consent box.
    await page.screenshot({
      path:DIR+'/'+lang+'-'+width+'-'+scenario+'-initial.png',fullPage:true,
    })
    if(scenario==='default'){
     assert.equal(initial.checkbox,false)
     await page.keyboard.press('Tab')
     assert.notEqual(await page.evaluate(()=>document.activeElement?.tagName),'BODY')
     // Keyboard users need an apparent focus cue despite the product's
     // default 'no static outlines' presentation preference.
     const firstFocus=await page.evaluate(()=>{
       const node=document.activeElement
       return {tag:node?.tagName,
        background:getComputedStyle(node).backgroundColor,
        shadow:getComputedStyle(node).boxShadow,
        outlineStyle:getComputedStyle(node).outlineStyle,
        outlineWidth:getComputedStyle(node).outlineWidth}
     })
     assert.equal(firstFocus.tag,'BUTTON')
     // Native keyboard outlines are valid accessible focus indicators too.
     // Do not reject an actual visible outline just because Tailwind's
     // background/shadow styles did not appear in this isolated lab.
     const hasOutline=firstFocus.outlineStyle!=='none'
       &&parseFloat(firstFocus.outlineWidth)>0
     assert.ok(firstFocus.background!=='rgba(0, 0, 0, 0)'
       ||firstFocus.shadow!=='none'||hasOutline,
       'focused privacy link needs a visible background, shadow, or outline: '
       +JSON.stringify(firstFocus))
     await page.keyboard.press('Tab')
     assert.equal(await page.evaluate(()=>document.activeElement?.tagName),'INPUT')
     await page.keyboard.press('Tab')
     const finalFocus=await page.evaluate(()=>({
       tag:document.activeElement?.tagName,
       shadow:getComputedStyle(document.activeElement).boxShadow,
     }))
     assert.equal(finalFocus.tag,'BUTTON')
     assert.notEqual(finalFocus.shadow,'none',
       'continue action must have keyboard-only visible focus shadow')
     const permission=section.locator('input[type=checkbox]')
     await permission.check()
     assert.ok(await permission.isChecked())
     await section.getByRole('button',{name:lang==='es'?'Permitir medición':'Allow measurement'}).click()
     await page.waitForFunction(()=>window.__metaLab.grantCalls===1)
     assert.equal(await page.evaluate(()=>window.__metaLab.continued),1)
    }else if(scenario==='grant-error'){
     const permission=section.locator('input[type=checkbox]')
     await permission.check()
     await section.getByRole('button',{name:lang==='es'?'Permitir medición':'Allow measurement'}).click()
     await section.locator('[role="alert"]').waitFor()
     assert.equal(await page.evaluate(()=>window.__metaLab.grantCalls),1)
     await section.getByRole('button',{name:lang==='es'?'Continuar sin permitirlo':'Continue without allowing'}).click()
     assert.equal(await page.evaluate(()=>window.__metaLab.continued),1)
     assert.equal(await page.evaluate(()=>window.__metaLab.withdrawCalls),0)
    }else{
     assert.equal(initial.checkbox,null)
     assert.equal(await section.getByRole('button',{name:lang==='es'?'Permitir medición':'Allow measurement'}).count(),0)
     if(scenario==='gpc-error'){
      await section.getByRole('alert').waitFor()
      // Capture the actual failed-persistence UI before recovery.
      // Initial/result alone can hide an inaccessible error state.
      await page.screenshot({path:DIR+'/'+lang+'-'+width+'-'+scenario+'-error.png',
        fullPage:true})
      await section.getByRole('button',{name:lang==='es'?'Reintentar guardar':'Retry saving'}).click()
      await section.getByText(lang==='es'?'Tu preferencia de no compartir quedó guardada en PAZO.':'Your do-not-share preference has been saved in PAZO.').waitFor()
      assert.equal(await page.evaluate(()=>window.__metaLab.withdrawCalls),2)
     }else{
      await section.getByText(lang==='es'?'Tu preferencia de no compartir quedó guardada en PAZO.':'Your do-not-share preference has been saved in PAZO.').waitFor()
      assert.equal(await page.evaluate(()=>window.__metaLab.withdrawCalls),1)
     }
    }
    // Browser exceptions, local 4xx/5xx responses and console errors are
    // failures even when the rendered DOM happens to look correct.
    assert.deepEqual(pageIssues,[],
      'browser_console_or_local_request_failure_'+lang+'_'+width+'_'+scenario)
    // Proof of the rendered state, not aesthetic approval.
    const evidence=DIR+'/'+lang+'-'+width+'-'+scenario+'-result.png'
    await page.screenshot({path:evidence,fullPage:true})
    await context.close()
   }
  }
 }
 assert.equal(blocked,0,'external_network_attempt')
 writeFileSync(DIR+'/QA_RESULT.json',JSON.stringify({
  status:'META_CONSENT_VISUAL_DOM_PASS',
  candidateOnly:true,viewportWidths:[320,390,430],
  languages:['es','en'],
  scenarios:['default','gpc','gpc-error','grant-error'],
  screenshots:54,externalRequests:blocked,findings,
  limitations:['No hosted PAZO runtime or signed-in real-user UX',
   'No legal approval or independent human visual acceptance',
   'No actual Meta SDK, CAPI or consent provider network'],
 },null,2))
 console.log('META_CONSENT_VISUAL_DOM_PASS screenshots=54 no_external_requests')
}finally{
 if(browser)await browser.close()
 await server.close()
}
