import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync} from 'node:fs'
import path from 'node:path'
import {pathToFileURL} from 'node:url'
import React,{act} from 'react'
import {create} from 'react-test-renderer'
import ts from 'typescript'
import {getPazoLiveOffer} from '../../../supabase/functions/pazo-paypal-live-checkout/liveOfferRegistry.mjs'

globalThis.IS_REACT_ACT_ENVIRONMENT=true
const root=mkdtempSync(path.join((()=>{const p=path.resolve('node_modules/.cache');mkdirSync(p,{recursive:true});return p})(),'f18-kitten-'))
const oldWindow=globalThis.window
const oldFetch=globalThis.fetch
const oldReact=globalThis.__UI_REACT__
const oldDb=globalThis.__UI_DB__
const oldEnv=globalThis.IS_REACT_ACT_ENVIRONMENT
const oldConfig='https://mrybvqdebbgcayuvgkkr.supabase.co'
const transpile=(src)=>ts.transpileModule(src,{compilerOptions:{
 module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2023,jsx:ts.JsxEmit.ReactJSX
}}).outputText

function accountImports(_full,names,specifier) {
 if(specifier==='react'||specifier==='react/jsx-runtime') return _full
 if(specifier.endsWith('SupporterLiveCheckoutPanel'))
   return "import {SupporterLiveCheckoutPanel} from './live.mjs';"
 if(specifier.endsWith('supabaseClient'))
   return 'const supabase=globalThis.__UI_DB__;'
 if(specifier.endsWith('publicConfig'))
   return "const getPublicSupabaseConfig=()=>({url:'"+oldConfig+"',key:'sb_publishable_test_only'});"
 if(specifier.endsWith('useSupporterMembershipStatus'))
   return "const useSupporterMembershipStatus=()=>({status:{kind:'inactive',milestone:0},refresh(){}});"
 if(specifier.endsWith('usePublicSupporterStatus'))
   return "const usePublicSupporterStatus=()=>({value:null,refresh(){}});"
 if(specifier.endsWith('supporterUiRelease'))
   return 'const supporterBenefitsUiEnabled=true;'
 if(specifier.endsWith('supporterAccountRoute.mjs'))
   return "const supporterPaypalReturnKind=()=>null;const supporterEntrySource=()=> 'manual';"
 if(specifier.endsWith('SupporterScreenPortal'))
   return 'const SupporterScreenPortal=({children})=>children;'
 if(specifier.endsWith('SupporterOfferB'))
   return 'const SupporterOfferB=({children})=>children;'
 if(specifier.endsWith('SupporterPreparingScreen'))
   return "const SupporterPreparingScreen=({unavailable,onRetry})=>globalThis.__UI_REACT__.createElement('section',{'data-kitten-preparing':unavailable?'blocked':'loading'},globalThis.__UI_REACT__.createElement('button',{onClick:onRetry},'Retry'));"
 return names.split(',').map(n=>'const '+n.trim()+'=()=>null;').join('\n')
}
const accountSource=readFileSync(new URL('../../../src/features/supporter/components/SupporterAccountManagement.tsx',import.meta.url),'utf8')
const liveSource=readFileSync(new URL('../../../src/features/supporter/components/SupporterLiveCheckoutPanel.tsx',import.meta.url),'utf8')
const accountCode=transpile(accountSource).replace(/import \{([^}]+)\} from ['"]([^'"]+)['"];?/g,accountImports)
 .replaceAll('import.meta.env',"({DEV:false,VITE_PAZO_F16_SANDBOX_QA_UI:'false'})")
const liveCode=transpile(liveSource).replace(/import \{([^}]+)\} from ['"]([^'"]+)['"];?/g,
 (all,names,specifier)=>{
  if(specifier==='react'||specifier==='react/jsx-runtime')return all
  if(specifier.endsWith('supabaseClient'))return 'const supabase=globalThis.__UI_DB__;'
  if(specifier.endsWith('publicConfig'))
   return "const getPublicSupabaseConfig=()=>({url:'"+oldConfig+"',key:'sb_publishable_test_only'});"
  throw Error('unexpected live module dependency: '+specifier)
 }).replaceAll('import.meta.env',"({DEV:false})")
writeFileSync(path.join(root,'account.mjs'),accountCode)
writeFileSync(path.join(root,'live.mjs'),liveCode)
const offerEs=getPazoLiveOffer('es')
const offerEn=getPazoLiveOffer('en')
let checkoutGets=[],listCount=0,checkoutPosts=0
let readyQueue=[]
globalThis.__UI_REACT__=React
globalThis.window={
 location:{hash:'',hostname:'localhost'},
 addEventListener(){},removeEventListener(){},setTimeout,clearTimeout
}
globalThis.__UI_DB__={rpc:async()=>({data:null,error:null}),auth:{
 getSession:async()=>({data:{session:{access_token:'test-token'}},error:null}),
 onAuthStateChange:fn=>{fn('INITIAL_SESSION',{user:{id:'82000000-0000-4000-8000-000000000123'}});return{data:{subscription:{unsubscribe(){}}}}}
}}
globalThis.fetch=async (url,opts={})=>{
 if(String(url).includes('/pazo-paypal-live-account')) {
  listCount++
  assert.equal(JSON.parse(opts.body).action,'list')
  return Response.json({ok:true,paidThrough:null,accounts:[],acceptances:[]})
 }
 if(String(url).includes('/pazo-paypal-live-checkout?locale=')){
  checkoutGets.push(String(url))
  return await new Promise(resolve=>readyQueue.push(resolve))
 }
 if(opts.method==='POST'){checkoutPosts++;throw Error('purchase must be user initiated')}
 throw Error('unexpected request '+url)
}
const {SupporterAccountManagement}=await import(pathToFileURL(path.join(root,'account.mjs')).href)
const offered=ui=>ui.root.findAll(n=>n.type==='button'&&n.children.some(c=>c==='Continuar con PayPal'||c==='Continue with PayPal'))
const kitten=ui=>ui.root.findAll(n=>n.props['data-kitten-preparing'])
const visibleMain=ui=>ui.root.findAll(n=>n.type==='main'&&!n.props.hidden)
test('Live offer GET is completed during kitten preflight, not after first offer paint',async()=>{
 let ui
 try {
  await act(async()=>{ui=create(React.createElement(SupporterAccountManagement,{lang:'es',onClose(){}}))})
  assert.equal(checkoutGets.length,1,'GET must start while preparing')
  assert.equal(kitten(ui).length,1,'kitten must stay visible until GET finishes')
  assert.equal(visibleMain(ui).length,0,'offer cannot be visible before consent and checkout readiness')
  assert.equal(checkoutPosts,0,'preflight must never create a subscription')
  await act(async()=>{readyQueue.shift()(Response.json({code:'live_checkout_ready',
   ready:true,mayGrantBenefits:false,offer:offerEs}))})
  assert.equal(kitten(ui).length,0,'kitten must finish after verified live offer')
  assert.equal(visibleMain(ui).length,1,'fully resolved offer must appear at once')
  assert.equal(offered(ui).length,1,'PayPal button must be present on first reveal')
  assert.equal(checkoutGets.length,1,'no post-paint redundant GET')
  assert.equal(checkoutPosts,0)
  await act(async()=>{ui.update(React.createElement(SupporterAccountManagement,{lang:'en',onClose(){}}))})
  assert.equal(checkoutGets.length,2)
  assert.equal(kitten(ui).length,1,'changing language must revalidate published terms behind kitten')
  assert.equal(visibleMain(ui).length,0,'old language must not flash')
  await act(async()=>{readyQueue.shift()(Response.json({code:'live_checkout_ready',
   ready:true,mayGrantBenefits:false,offer:offerEn}))})
  assert.equal(kitten(ui).length,0)
  assert.equal(visibleMain(ui).length,1)
  assert.equal(offered(ui).length,1)
 } finally {if(ui)await act(async()=>ui.unmount())}
})
test('blocked Live GET shows retry on kitten instead of partially rendered payment card',async()=>{
 let ui
 try{
  await act(async()=>{ui=create(React.createElement(SupporterAccountManagement,{lang:'es',onClose(){}}))})
  assert.equal(kitten(ui).length,1)
  await act(async()=>{readyQueue.shift()(Response.json({code:'checkout_admission_denied',ready:false},{status:403}))})
  assert.equal(kitten(ui).length,1)
  assert.equal(kitten(ui)[0].props['data-kitten-preparing'],'blocked')
  assert.equal(visibleMain(ui).length,0)
  assert.equal(checkoutPosts,0)
  const previous=checkoutGets.length
  await act(async()=>{kitten(ui)[0].findByType('button').props.onClick()})
  assert.equal(checkoutGets.length,previous+1,'retry triggers exactly one new read')
  assert.equal(kitten(ui)[0].props['data-kitten-preparing'],'loading')
  await act(async()=>{readyQueue.shift()(Response.json({code:'live_checkout_ready',
   ready:true,mayGrantBenefits:false,offer:offerEs}))})
  assert.equal(kitten(ui).length,0)
  assert.equal(offered(ui).length,1)
  assert.equal(checkoutPosts,0)
 }finally{if(ui)await act(async()=>ui.unmount())}
})
test.after(()=>{
 globalThis.window=oldWindow
 globalThis.fetch=oldFetch
 globalThis.__UI_REACT__=oldReact
 globalThis.__UI_DB__=oldDb
 globalThis.IS_REACT_ACT_ENVIRONMENT=oldEnv
 rmSync(root,{recursive:true,force:true})
})
