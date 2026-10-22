import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {
 SUPPORTER_ACCOUNT_HASH,isSupporterAccountHash,leaveSupporterAccountRoute,
} from '../supporterAccountRoute.mjs'
test('P16 independent subscription route is precise, not a rescue alias',()=>{
 assert.equal(SUPPORTER_ACCOUNT_HASH,'#/account/supporter')
 for (const route of ['#/account/supporter','']) {
  assert.equal(isSupporterAccountHash(route),route===SUPPORTER_ACCOUNT_HASH)
 }
 for(const r of ['#/rescue/00000000-0000-4000-8000-000000000000',
  '#/account/supporter/other','https://evil.invalid','#/account']){
  assert.equal(isSupporterAccountHash(r),false)
 }
 const location={hash:SUPPORTER_ACCOUNT_HASH}
 assert.equal(leaveSupporterAccountRoute(location),true)
 assert.equal(location.hash,'')
 assert.equal(leaveSupporterAccountRoute(location),false)
})
test('P16 route is ahead of pet loading and pet error gate in App',()=>{
 const text=fs.readFileSync(new URL('../../../App.tsx',import.meta.url),'utf8')
 const route=text.indexOf('if (user && isSupporterAccountRoute)')
 const bootstrap=text.indexOf("if (user && (petBootstrap?.userId")
 const error=text.indexOf("if (user && petBootstrap?.status === 'error')")
 assert.ok(route>0 && bootstrap>route && error>route)
 assert.ok(text.includes('setSupporterAccountRoute(isSupporterAccountHash'))
 assert.ok(text.includes('Gestionar suscripción de apoyo'))
 assert.ok(text.includes('leaveSupporterAccountRoute(window.location)'))
})
test('P16 acceptance download keeps blob URL alive after click',()=>{
 const text=fs.readFileSync(new URL('../components/SupporterAccountManagement.tsx',import.meta.url),'utf8')
 const append=text.indexOf('document.body.appendChild(link)')
 const click=text.indexOf('link.click()')
 const revoke=text.indexOf('URL.revokeObjectURL(href)')
 assert.ok(append>=0&&click>append&&revoke>click)
 assert.ok(text.includes('setTimeout(() => {'))
 assert.ok(text.includes('type="button"'))
})
