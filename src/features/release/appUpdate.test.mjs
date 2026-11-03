import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {currentBuildId,decideUpdate,pageIsBusy,readBuildStamp} from './appUpdate.ts'

const decide=(extra)=>decideUpdate({current:'aaaa1111',latest:'bbbb2222',trigger:'resume',busy:false,reloadedFor:null,...extra})

test('a newer release reloads on its own only when the person comes back with nothing half done',()=>{
  assert.equal(decide(),'reload')
  assert.equal(decide({busy:true}),'offer')
  assert.equal(decide({trigger:'interval'}),'offer')
})

test('the same release, an unknown answer or a development build never reload',()=>{
  assert.equal(decide({latest:'aaaa1111'}),'none')
  assert.equal(decide({latest:null}),'none')
  assert.equal(decide({current:'development'}),'none')
})

test('a release reloads at most once; if the page is still old it only offers',()=>{
  assert.equal(decide({reloadedFor:'bbbb2222'}),'offer')
  assert.equal(decide({reloadedFor:'older000'}),'reload')
})

test('only a well-formed stamp from version.json is trusted',()=>{
  assert.equal(readBuildStamp({build:'442e542c8e66'}),'442e542c8e66')
  assert.equal(readBuildStamp({build:'b-mhxyz12'}),'b-mhxyz12')
  for(const value of [null,'442e542c',{},{build:42},{build:'<script>'},{build:'abc'},{build:'x'.repeat(65)}])
    assert.equal(readBuildStamp(value),null)
})

const fakeDocument=({modal=false,editable=false,fields=[],files=[]}={})=>({
  querySelector:(selector)=>((modal&&selector.includes('aria-modal'))||(editable&&selector.includes('contenteditable')))?{}:null,
  querySelectorAll:(selector)=>selector.includes('type="file"')?files.map(n=>({files:{length:n}})):fields.map(value=>({value})),
})
const home={pathname:'/',hash:''}

test('open dialogs, typed text, chosen files and payment returns count as work in progress',()=>{
  assert.equal(pageIsBusy(fakeDocument(),home),false)
  assert.equal(pageIsBusy(fakeDocument({fields:['','  ']}),home),false)
  assert.equal(pageIsBusy(fakeDocument({fields:['Luna se perdió']}),home),true)
  assert.equal(pageIsBusy(fakeDocument({modal:true}),home),true)
  assert.equal(pageIsBusy(fakeDocument({editable:true}),home),true)
  assert.equal(pageIsBusy(fakeDocument({files:[0,1]}),home),true)
  assert.equal(pageIsBusy(fakeDocument(),{pathname:'/paypal/return',hash:''}),true)
  assert.equal(pageIsBusy(fakeDocument(),{pathname:'/',hash:'#/account/supporter?paypal=return'}),true)
})

test('outside a Vite build the app treats itself as development and never checks',()=>{
  assert.equal(currentBuildId,'development')
})

test('the build writes version.json and stamps the app with the same value',()=>{
  const config=readFileSync(new URL('../../../vite.config.ts',import.meta.url),'utf8')
  assert.match(config,/fileName: 'version\.json'/)
  assert.match(config,/__PAZO_BUILD_ID__: JSON\.stringify\(buildId\)/)
  assert.match(config,/VERCEL_GIT_COMMIT_SHA/)
  const app=readFileSync(new URL('../../App.tsx',import.meta.url),'utf8')
  assert.match(app,/<AppUpdatePrompt lang=\{lang\} busy=\{!canShowAppNotice\} \/>/)
})
