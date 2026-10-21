import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

const source=readFileSync(new URL('../../../../supabase/functions/f16-paypal-supporter/index.ts',import.meta.url),'utf8')
const url='https://pazo-app-t83r-dbm658bgd-digitalapp.vercel.app/#'
const origin=new URL(url).origin

test('F16 P06 approved QA HTTPS origin strips the browser hash fragment',()=>{
 assert.equal(origin,'https://pazo-app-t83r-dbm658bgd-digitalapp.vercel.app')
 assert.equal(new URL(origin+'/').origin,origin)
 assert.equal(new URL(origin+'/').hash,'')
 assert.equal(new URL(origin+'/').search,'')
})

test('QA edge redirects use isolated names, never mutate shared app origin',()=>{
 for(const key of ['PAZO_F16_P06_QA_APP_ORIGIN','PAZO_F16_P06_QA_RETURN_URL','PAZO_F16_P06_QA_CANCEL_URL']){
  assert.match(source,new RegExp("get\\('"+key+"'\\)"))
 }
 for(const key of ['PAZO_F16_APP_ORIGIN','PAZO_F16_PAYPAL_RETURN_URL','PAZO_F16_PAYPAL_CANCEL_URL']){
  assert.doesNotMatch(source,new RegExp("get\\('"+key+"'\\)"))
 }
 assert.match(source,/const QA_CHECKOUT_RELEASE_APPROVED = false/)
 assert.match(source,/if\(!QA_CHECKOUT_RELEASE_APPROVED \|\|/)
 assert.match(source,/'PAZO_F16_PAYPAL_ENV'\)!=='sandbox'/)
 assert.match(source,/url\.origin===value/)
 assert.match(source,/new URL\(returnUrl\)\.origin!==origin/)
 assert.match(source,/new URL\(cancelUrl\)\.origin!==origin/)
})
