import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {resolvePazoAccountOriginGate as gate}
 from '../../../../supabase/functions/f16-paypal-supporter-account/accountOriginGateP18.mjs'
const ORIGIN='https://pazo.example'
const req=(origin=ORIGIN,method='OPTIONS',headers={})=>
 new Request('https://supabase.example/functions/v1/f16-paypal-supporter-account',{
  method,headers:{origin,'access-control-request-method':'POST',
   'access-control-request-headers':'authorization,content-type,apikey',...headers}
 })
test('P18 OPTIONS succeeds without provider credentials only for exact origin',()=>{
 const r=gate(req(),ORIGIN)
 assert.equal(r.response.status,204)
 assert.equal(r.response.headers.get('access-control-allow-origin'),ORIGIN)
 assert.equal(r.response.headers.get('access-control-allow-methods'),'POST')
 assert.ok(r.response.headers.get('access-control-allow-headers').includes('apikey'))
 assert.equal(r.response.headers.get('cache-control'),'no-store')
})
test('P18 disabled origin, wildcard and impostors fail closed',async()=>{
 for(const setting of [null,undefined,'','http://pazo.example',
  'https://*.vercel.app','https://pazo.example/path',
  'https://pazo.example:8999','https://pazo.example.evil.invalid/extra']){
  const r=gate(req(),setting)
  assert.equal(r.response.status,503)
  assert.equal(r.response.headers.get('access-control-allow-origin'),null)
 }
 for(const origin of ['https://evil.invalid','https://pazo.example.evil.invalid']){
  const r=gate(req(origin),ORIGIN)
  assert.equal(r.response.status,403)
  assert.equal(r.response.headers.get('access-control-allow-origin'),null)
 }
})
test('P18 rejects extra requested header or method before any POST',()=>{
 const withHeader=gate(req(ORIGIN,'OPTIONS',
  {'access-control-request-headers':'authorization, x-owner-id'}),ORIGIN)
 assert.equal(withHeader.response.status,403)
 const badMethod=gate(req(ORIGIN,'OPTIONS',
  {'access-control-request-method':'DELETE'}),ORIGIN)
 assert.equal(badMethod.response.status,403)
})
test('P18 POST requires further owner verification, never returns public data',()=>{
 const r=gate(req(ORIGIN,'POST'),ORIGIN)
 assert.equal(r.response,undefined)
 assert.equal(r.cors['access-control-allow-origin'],ORIGIN)
 assert.equal(r.cors['cache-control'],'no-store')
})
test('P18 Edge composition guards POST separately after CORS preflight',()=>{
 const src=fs.readFileSync(
  new URL('../../../../supabase/functions/f16-paypal-supporter-account/index.ts',import.meta.url),
  'utf8')
 const block=src.slice(src.indexOf('Deno.serve(async(request:Request)=>{'))
 assert.ok(block.indexOf('resolvePazoAccountOriginGate')<
  block.indexOf('if(!shouldRun())'))
 assert.ok(block.includes("if(!shouldRun())return addCors(reply(503"))
 assert.ok(block.includes("if(request.method!=='POST')"))
 assert.ok(block.includes('runtime.resolveAuthenticatedOwner(request)'))
 assert.ok(block.includes('runtime.manage(request)'))
 assert.ok(!block.includes('mayGrantBenefits:true'))
})

test('P18 read-only account and receipt do not depend on PayPal mode',()=>{
 const src=fs.readFileSync(
  new URL('../../../../supabase/functions/f16-paypal-supporter-account/index.ts',import.meta.url),
  'utf8')
 const should=src.slice(src.indexOf('const shouldRun=():boolean=>'),
  src.indexOf('function createRuntime('))
 assert.ok(should.includes("SUPABASE_SERVICE_ROLE_KEY"))
 assert.ok(!should.includes('PAZO_F16_PAYPAL_ENV'))
 assert.ok(src.includes("if(['status','cancel'].includes(data.action) &&"))
 assert.ok(src.includes("Deno.env.get('PAZO_F16_PAYPAL_ENV')!=='sandbox'"))
 const list=src.indexOf("if(data.action==='list')")
 const guard=src.indexOf("if(['status','cancel'].includes(data.action)")
 assert.ok(list>=0 && guard>list)
 assert.ok(src.includes('runtime.resolveAuthenticatedOwner(request)'))
})
