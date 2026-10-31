// #169: scope approval is not permission to publish or transmit.
import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {validMetaServerEvent} from '../supabase/functions/_shared/metaCapi.mjs'
const read=p=>readFileSync(p,'utf8')
const ui=read('src/features/marketing/MetaConsentChoice.tsx')
const doc=read('docs/marketing/META_NOTICE_SCOPE_APPROVED_20261031.md')
const production=read('src/features/legal/legalCopy.ts')
const worker=read('supabase/functions/pazo-meta-worker/index.ts')

test('both candidate consent languages disclose the actual approved fields and meaningful withdrawal',()=>{
 const es=ui.split(' es:{')[1]?.split(' en:{')[0]
 const en=ui.split(' en:{')[1]?.split('} as const')[0]
 assert.ok(es&&en,'ES/EN copy must exist')
 for(const scope of [es,en]){
   assert.match(scope,/SHA-256/)
   assert.match(scope,/User-Agent/)
   assert.match(scope,/IP/)
   assert.match(scope,/Meta Pixel/)
   assert.match(scope,/Meta/)
   assert.match(scope,/retirarlo|withdraw/)
   assert.match(scope,/continuar|Continue/)
 }
 assert.match(es,/sigue siendo dato personal/)
 assert.match(en,/still personal data/)
 assert.match(es,/Tu privacidad|Tú decides/)
})
test('owner scope approval creates a draft, not live legal consent or provider authorization',()=>{
 for(const marker of ['PO_SCOPE_APPROVED','BORRADOR','NO PUBLICADO',
   'PRODUCTION=OFF','pazo-meta-conversions-v1',
   'appdigital.corp@gmail.com','retención','GPC']){
   assert.ok(doc.includes(marker),'missing review marker: '+marker)
 }
 assert.match(doc,/no autoriza por este acto desplegar/i)
 assert.match(production,/no envía conversiones individuales a Meta/)
 assert.match(production,/does not send individual conversions to Meta/)
 for(const marker of [
   'const META_WORKER_ENDPOINT_RELEASED=false',
   'const META_WORKER_PRIVACY_REVIEWED=false',
   'const META_WORKER_MATCH_FIELDS_APPROVED=false',
   'const META_WORKER_PROVIDER_APPROVED=false',
   'readApprovedMatchField:null']){
   assert.ok(worker.includes(marker),'unexpected release or matching reader: '+marker)
 }
})
test('CAPI server payload rejects profile, pet, GPS, payment, cookie and campaign fields',()=>{
 const dataset='1438916858347709'
 const basic={
   action_source:'website',
   event_id:'11111111-2222-4333-8444-555555555555',
   event_name:'CompleteRegistration',
   event_time:Math.floor(Date.now()/1000),
   event_source_url:'https://pazo-app.vercel.app/',
   user_data:{em:['a'.repeat(64)],
     client_user_agent:'Mozilla/5.0 (PAZO Synthetic Consent Test)'},
 }
 assert.equal(validMetaServerEvent(basic,dataset),true)
 for(const additional of [
   {custom_data:{pet_id:'synthetic-pet'}},
   {user_id:'synthetic-owner'},
   {utm_campaign:'synthetic'},
   {client_ip_address:'203.0.113.1'},
   {payment_data:'nope'},
 ]){
   assert.equal(validMetaServerEvent({...basic,...additional},dataset),false,
     'unexpected top-level field accepted: '+Object.keys(additional))
 }
 for(const field of ['fn','ph','external_id','client_ip_address','fbp','fbc',
   'pet','gps','payment']){
   assert.equal(validMetaServerEvent({...basic,user_data:{
     ...basic.user_data,[field]:'synthetic'}},dataset),false,
     'unexpected matching field accepted: '+field)
 }
 assert.equal(validMetaServerEvent({...basic,
   event_source_url:basic.event_source_url+'?utm_campaign=synthetic'},dataset),false)
})
