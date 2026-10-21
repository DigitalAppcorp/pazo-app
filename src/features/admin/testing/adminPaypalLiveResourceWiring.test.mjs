import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const edge=readFileSync(new URL('../../../../supabase/functions/pazo-admin-paypal-validate/index.ts',import.meta.url),'utf8')
const page=readFileSync(new URL('../components/AdminPayPalSettings.tsx',import.meta.url),'utf8')
test('Live plan and webhook inspection runs only through authenticated Vault/admin Edge',()=>{
 assert.ok(edge.includes("import {inspectLivePaypalResources} from './liveProviderReadOnly.mjs'"))
 assert.ok(edge.includes("inspectLive=body?.action==='inspect_live_resources'"))
 assert.ok(edge.includes("api+'/auth/v1/user'"))
 assert.ok(edge.includes("rpc('pazo_admin_paypal_service_credentials'"))
 assert.ok(edge.includes("p_actor:user.id"))
 assert.ok(edge.includes("if(inspectLive){"))
 assert.ok(edge.includes("evidence.ok?200:409"))
 assert.ok(edge.includes("changes_checkout:false"))
 assert.ok(edge.includes("live_checkout_enabled:false"))
 assert.ok(!edge.includes('/v1/billing/subscriptions'))
})
test('Live resource inspector UI is staged off, with no broken button in current beta',()=>{
 assert.ok(page.includes('const LIVE_RESOURCE_INSPECTION_RELEASED=false'))
 assert.ok(page.includes("env==='live'&&LIVE_RESOURCE_INSPECTION_RELEASED"))
 assert.ok(page.includes("body:{environment:'live',action:'inspect_live_resources'}"))
 assert.ok(page.includes('data?.mayCharge!==false||data?.mayActivate!==false'))
 assert.ok(page.includes('disabled aria-disabled="true"'))
 assert.ok(!page.includes('PAZO_F16_PAYPAL_CLIENT_SECRET'))
})
