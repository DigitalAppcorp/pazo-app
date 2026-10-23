import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {pathToFileURL} from 'node:url'
import React from 'react'
import {create,act} from 'react-test-renderer'
import ts from 'typescript'
globalThis.IS_REACT_ACT_ENVIRONMENT=true
const cache=path.resolve('node_modules/.cache');fs.mkdirSync(cache,{recursive:true})
const root=fs.mkdtempSync(path.join(cache,'pazo-live-account-ui-'))
const oldWindow=globalThis.window
const oldFetch=globalThis.fetch
const events=[]
let session='owner-a'
globalThis.window={location:{hash:'',hostname:'localhost'},
 addEventListener(){},removeEventListener(){},setTimeout,clearTimeout}
globalThis.__PAZO_ACCOUNT_UI_DB__={auth:{
 getSession:async()=>({data:{session:{access_token:session}},error:null}),
 onAuthStateChange:fn=>{events.push(fn);fn('INITIAL_SESSION',{user:{id:session}});
  return {data:{subscription:{unsubscribe(){}}}}}
}}
let code=ts.transpileModule(fs.readFileSync('src/features/supporter/components/SupporterAccountManagement.tsx','utf8'),{
 compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2023,jsx:ts.JsxEmit.ReactJSX}
}).outputText
// Real component; only imported services/child screens are isolated here.
code=code.replace(/import \{([^}]+)\} from ['"]([^'"]+)['"];?/g,(all,names,specifier)=>{
 if(specifier==='react'||specifier==='react/jsx-runtime')return all
 if(specifier.endsWith('supabaseClient'))return 'const supabase=globalThis.__PAZO_ACCOUNT_UI_DB__;'
 if(specifier.endsWith('publicConfig'))return "const getPublicSupabaseConfig=()=>({url:'https://mrybvqdebbgcayuvgkkr.supabase.co',key:'sb_publishable_synthetic'});"
 if(specifier.endsWith('useSupporterMembershipStatus'))return "const useSupporterMembershipStatus=()=>({status:{kind:'inactive',milestone:0},refresh(){}});"
 if(specifier.endsWith('useGradualStatus'))return "const useGradualStatus=()=>({value:null,busy:false,loading:false,error:false,refresh(){},act:async()=>false});"
 if(specifier.endsWith('supporterUiRelease'))return 'const supporterBenefitsUiEnabled=true;'
 if(specifier.endsWith('supporterAccountRoute.mjs'))return 'const supporterPaypalReturnKind=()=>null;'
 if(specifier.endsWith('SupporterScreenPortal'))return 'const SupporterScreenPortal=({children})=>children;'
 return names.split(',').map(n=>'const '+n.trim()+'=()=>null;').join('\n')
}).replaceAll('import.meta.env','({DEV:false})')
fs.writeFileSync(path.join(root,'account.mjs'),code)
const {SupporterAccountManagement}=await import(pathToFileURL(path.join(root,'account.mjs')).href)
const intentA='intent-23456789-1234-4234-8234-123456789abc'
const intentB='intent-33456789-1234-4234-8234-123456789abc'
const text=n=>n.findAll(x=>typeof x.type==='string').flatMap(x=>x.children.filter(c=>typeof c==='string')).join(' ')
const button=(ui,label)=>ui.root.findAllByType('button').find(n=>text(n).includes(label))
const result=intent=>Response.json({ok:true,paidThrough:null,accounts:[{
 intentId:intent,state:'bound',canDownloadAcceptance:true}],acceptances:[]})
test('switching Auth owners fences an older in-flight account result and clears prior account actions',async()=>{
 const calls=[];let resolveA
 globalThis.fetch=async(_url,options)=>{
  const data=JSON.parse(options.body);calls.push(data)
  if(data.action==='list'&&options.headers.authorization==='Bearer owner-a')return new Promise(r=>{resolveA=r})
  if(data.action==='list')return result(intentB)
  if(data.action==='status')return Response.json({ok:true,paidThrough:null,providerStatus:'ACTIVE'})
  throw Error('unexpected mutation')
 }
 let ui
 try{
  await act(async()=>{ui=create(React.createElement(SupporterAccountManagement,{lang:'es',onClose(){}}))})
  assert.equal(typeof resolveA,'function')
  await act(async()=>{
   session='owner-b';for(const fn of events)fn('SIGNED_IN',{user:{id:session}})
  })
  await act(async()=>{resolveA(result(intentA))})
  const refresh=button(ui,'Actualizar estado');assert.ok(refresh)
  await act(async()=>{await refresh.props.onClick()})
  const status=calls.filter(c=>c.action==='status')
  assert.deepEqual(status,[{action:'status',intentId:intentB}])
  assert.ok(!calls.some(c=>c.action==='cancel'||c.action==='resume'))
 }finally{if(ui)await act(async()=>ui.unmount())}
})
test.after(()=>{
 globalThis.window=oldWindow;globalThis.fetch=oldFetch
 delete globalThis.__PAZO_ACCOUNT_UI_DB__
 fs.rmSync(root,{recursive:true,force:true})
})
