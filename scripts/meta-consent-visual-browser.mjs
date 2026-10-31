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
const virtualEntry='virtual:pazo-meta-consent-qa'
const source=`
import React,{useState} from 'react'
import {createRoot} from 'react-dom/client'
import '/src/index.css'
import {MetaConsentChoice,META_CHOICES_RELEASED} from '/src/features/marketing/MetaConsentChoice.tsx'
if(META_CHOICES_RELEASED!==false)throw Error('candidate_unexpectedly_released')
const p=new URLSearchParams(location.search)
const lang=p.get('lang')==='en'?'en':'es'
const scenario=p.get('case')||'default'
Object.defineProperty(navigator,'globalPrivacyControl',{
 configurable:true,get:()=>scenario==='gpc'||scenario==='gpc-error'
})
window.__metaLab={grantCalls:0,withdrawCalls:0,continued:0,privacy:0}
function Lab(){
 const [state,setState]=useState('ready')
 const withdraw=async()=>{
   window.__metaLab.withdrawCalls++
   if(scenario==='gpc-error'&&window.__metaLab.withdrawCalls===1)return false
   return true
 }
 const grant=async()=>{
   window.__metaLab.grantCalls++
   if(scenario==='grant-error')return false
   return true
 }
 return React.createElement('main',{className:'min-h-screen px-4 py-6',
   style:{maxWidth:'100%',margin:'0 auto'}},
   React.createElement(MetaConsentChoice,{
    lang,onGrant:grant,onWithdraw:withdraw,
    onContinue:()=>{window.__metaLab.continued++;setState('continued')},
    onPrivacy:()=>{window.__metaLab.privacy++;setState('privacy')},
   }),
   React.createElement('output',{'data-testid':'lab-result',hidden:true},state)
 )
}
createRoot(document.getElementById('qa-root')).render(React.createElement(Lab))
window.__metaLabReady=true
`
const plugin={
 name:'pazo-meta-consent-test-only',
 configureServer(server){
  server.middlewares.use((req,res,next)=>{
   if(!req.url?.startsWith('/__meta_consent_lab__/'))return next()
   res.setHeader('Content-Type','text/html; charset=utf-8')
   res.setHeader('Cache-Control','no-store')
   res.end('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>PAZO isolated consent QA</title></head><body><div id="qa-root"></div><script type="module" src="/@id/virtual:pazo-meta-consent-qa"></script></body></html>')
  })
 },
 resolveId(id){if(id===virtualEntry)return String.fromCharCode(0)+virtualEntry},
 load(id){if(id===String.fromCharCode(0)+virtualEntry)return source},
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
    await page.route('**/*',async route=>{
     const url=new URL(route.request().url())
     if(url.origin===ORIGIN)return route.continue()
     blocked++
     return route.abort('blockedbyclient')
    })
    const url=ORIGIN+'/__meta_consent_lab__/?lang='+lang+'&case='+scenario
    await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000})
    await page.waitForFunction(()=>window.__metaLabReady===true,{timeout:30000})
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
    if(scenario==='default'){
     assert.equal(initial.checkbox,false)
     await page.keyboard.press('Tab')
     assert.notEqual(await page.evaluate(()=>document.activeElement?.tagName),'BODY')
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
      await section.getByRole('button',{name:lang==='es'?'Reintentar guardar':'Retry saving'}).click()
      await section.getByText(lang==='es'?'Tu preferencia de no compartir quedó guardada en PAZO.':'Your do-not-share preference has been saved in PAZO.').waitFor()
      assert.equal(await page.evaluate(()=>window.__metaLab.withdrawCalls),2)
     }else{
      await section.getByText(lang==='es'?'Tu preferencia de no compartir quedó guardada en PAZO.':'Your do-not-share preference has been saved in PAZO.').waitFor()
      assert.equal(await page.evaluate(()=>window.__metaLab.withdrawCalls),1)
     }
    }
    // Proof of the rendered state, not aesthetic approval.
    const evidence=DIR+'/'+lang+'-'+width+'-'+scenario+'.png'
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
  screenshots:24,externalRequests:blocked,findings,
  limitations:['No hosted PAZO runtime or signed-in real-user UX',
   'No legal approval or independent human visual acceptance',
   'No actual Meta SDK, CAPI or consent provider network'],
 },null,2))
 console.log('META_CONSENT_VISUAL_DOM_PASS screenshots=24 no_external_requests')
}finally{
 if(browser)await browser.close()
 await server.close()
}
