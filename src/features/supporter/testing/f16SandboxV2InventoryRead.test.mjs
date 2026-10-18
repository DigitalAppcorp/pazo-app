import test from 'node:test'
import assert from 'node:assert/strict'
import {createPazoSandboxV2InventoryRead}
 from '../../../../supabase/functions/f16-paypal-webhook/pazoSandboxV2InventoryRead.mjs'
const SUB='I-ORIGINAL-TEST-123'
const PLAN='P-14V25407JP6850922NLHMDKI'
const row=status=>({id:SUB,plan_id:PLAN,status})
const make=(pages,scope=true)=>{
 const calls=[]
 const reader=createPazoSandboxV2InventoryRead({clientId:'client1234',clientSecret:'secret1234',
 fetchImpl:async(url,opts)=>{
  calls.push({url,method:opts.method,headers:opts.headers})
  if(url.endsWith('/oauth2/token'))
   return {ok:true,json:async()=>({access_token:'TEST_PRIVATE_TOKEN',token_type:'Bearer'})}
  if(!scope)return {ok:false,status:403}
  const page=Number(new URL(url).searchParams.get('page'))
  return {ok:true,json:async()=>pages[page-1]??{subscriptions:[],links:[]}}
 }})
 return{reader,calls}
}
test('exact subscription found by merchant-wide inventory never grants retry',async()=>{
 const {reader,calls}=make([{subscriptions:[row('APPROVAL_PENDING')],links:[]}])
 const a=await reader.inspect({subscriptionId:SUB,planId:PLAN})
 assert.equal(a.code,'original_merchant_resource_found')
 assert.equal(a.providerStatus,'APPROVAL_PENDING')
 assert.equal(a.mayRetry,false)
 assert.equal(a.mayGrantBenefits,false)
 assert.equal(calls[0].method,'POST')
 assert.equal(calls[1].method,'GET')
 assert.ok(!JSON.stringify(a).includes(SUB))
 assert.ok(!JSON.stringify(a).includes('TEST_PRIVATE_TOKEN'))
})
test('merchant list not containing original never authorizes retry',async()=>{
 const {reader}=make([{subscriptions:[],links:[]}])
 const a=await reader.inspect({subscriptionId:SUB,planId:PLAN})
 assert.equal(a.code,'original_not_in_current_merchant_inventory')
 assert.equal(a.mayRetry,false)
})
test('pagination exhaustiveness is required for historical absence',async()=>{
 const first=Array.from({length:20},(_,i)=>({id:'I-PAGE-TEST-'+i,plan_id:PLAN,status:'ACTIVE'}))
 const {reader}=make([{subscriptions:first,links:[]},{subscriptions:[],links:[]}])
 const a=await reader.inspect({subscriptionId:SUB,planId:PLAN})
 assert.equal(a.merchantInventoryEnumerated,true)
 assert.equal(a.mayRetry,false)
})
test('merchant scope denial and invalid payload fail closed',async()=>{
 const {reader}=make([],false)
 await assert.rejects(reader.inspect({subscriptionId:SUB,planId:PLAN}),/inventory_merchant_scope_unavailable/)
 const invalid=make([{subscriptions:[{...row('ACTIVE'),plan_id:'P-OTHER'}],links:[]}])
 const unexpected=await invalid.reader.inspect({subscriptionId:SUB,planId:PLAN})
 assert.equal(unexpected.code,'original_merchant_details_unverified')
 assert.equal(unexpected.mayRetry,false)
 await assert.rejects(invalid.reader.inspect({subscriptionId:SUB,planId:'P-OTHER'}),/inventory_binding_unverified/)
})

test('inventory distinguishes auth, permissions, endpoint, malformed and rate-limit',async()=>{
 for(const [status,expected] of [
  [400,'inventory_request_rejected'],
  [401,'inventory_token_denied'],
  [403,'inventory_merchant_scope_unavailable'],
  [404,'inventory_endpoint_unavailable'],
  [429,'inventory_rate_limited'],
  [500,'inventory_provider_unavailable']
 ]){
  const {reader}=createHttpStatusReader(status)
  await assert.rejects(reader.inspect({subscriptionId:SUB,planId:PLAN}),e=>{
   assert.equal(e.message,expected)
   assert.equal(JSON.stringify(e).includes(SUB),false)
   return true
  })
 }
})
function createHttpStatusReader(status,stage='list'){
 const reader=createPazoSandboxV2InventoryRead({
  clientId:'client1234',clientSecret:'secret1234',
  fetchImpl:async(url)=>url.endsWith('/oauth2/token')&&stage!=='oauth'
   ? {ok:true,json:async()=>({access_token:'PRIVATE',token_type:'Bearer'})}
   : {ok:false,status}
 })
 return {reader}
}
test('OAuth rejects are distinguishable from merchant list failures',async()=>{
 for(const status of [401,403]){
  const {reader}=createHttpStatusReader(status,'oauth')
  await assert.rejects(reader.inspect({subscriptionId:SUB,planId:PLAN}),
   /inventory_oauth_denied/)
 }
})
test('Edge never echoes merchant data, tokens or provider response on inventory errors',async()=>{
 // Runtime envelope contracts are static and allowlisted.
 const {readFileSync}=await import('node:fs')
 const edge=readFileSync(new URL('../../../../supabase/functions/f16-paypal-supporter-v2-qa/index.ts',import.meta.url),'utf8')
 const panel=readFileSync(new URL('../components/SandboxV2AccountPanel.tsx',import.meta.url),'utf8')
 assert.ok(edge.includes("'inventory_merchant_scope_unavailable'"))
 assert.ok(edge.includes("'inventory_oauth_denied'"))
 assert.ok(edge.includes("'inventory_endpoint_unavailable'"))
 assert.ok(edge.includes("'merchant_inventory_read_unavailable'"))
 assert.ok(!edge.includes('console.log(error)'))
 assert.ok(panel.includes("inventoryDiagnostic==='scope'"))
 assert.ok(panel.includes("inventoryDiagnostic==='auth'"))
})

test('PayPal successful HTTP with missing collection never proves absence',async()=>{
 const {reader}=make([{links:[]}])
 const response=await reader.inspect({subscriptionId:SUB,planId:PLAN})
 assert.equal(response.code,'merchant_inventory_collection_unverified')
 assert.equal(response.mayRetry,false)
 assert.equal(response.merchantInventoryEnumerated,undefined)
})
test('unrelated list rows may lack status and plan; valid IDs suffice for inventory membership',async()=>{
 const other={id:'I-OTHER-ABC123'}
 const {reader:absent}=make([{subscriptions:[other],links:[]}])
 const absentResult=await absent.inspect({subscriptionId:SUB,planId:PLAN})
 assert.equal(absentResult.code,'original_not_in_current_merchant_inventory')
 assert.equal(absentResult.merchantInventoryEnumerated,true)
 assert.equal(absentResult.mayRetry,false)
 const {reader:present}=make([{subscriptions:[other,row('CANCELLED')],links:[]}])
 const presentResult=await present.inspect({subscriptionId:SUB,planId:PLAN})
 assert.equal(presentResult.code,'original_merchant_resource_found')
 assert.equal(presentResult.providerStatus,'CANCELLED')
 assert.equal(presentResult.merchantInventoryEnumerated,true)
 assert.equal(presentResult.mayRetry,false)
})
test('unrelated list entries without a trustworthy ID cannot prove the original absent',async()=>{
 const {reader}=make([{subscriptions:[{plan_id:PLAN,status:'ACTIVE'}],links:[]}])
 const r=await reader.inspect({subscriptionId:SUB,planId:PLAN})
 assert.equal(r.code,'merchant_inventory_rows_unverified')
 assert.equal(r.merchantInventoryEnumerated,undefined)
 assert.equal(r.mayRetry,false)
})
test('untrusted provider field for exact original stays unverified',async()=>{
 const {reader}=make([{subscriptions:[{id:SUB,plan_id:PLAN}],links:[]}])
 const x=await reader.inspect({subscriptionId:SUB,planId:PLAN})
 assert.equal(x.code,'original_merchant_details_unverified')
 assert.equal(x.mayRetry,false)
})
test('unexpected PayPal pagination or oversized page never counts as complete',async()=>{
 const invalid=make([{subscriptions:[],links:[{rel:7}]}])
 assert.equal((await invalid.reader.inspect({subscriptionId:SUB,planId:PLAN})).code,'merchant_inventory_pagination_unverified')
 const oversized=make([{subscriptions:Array.from({length:21},()=>row('ACTIVE')),links:[]}])
 assert.equal((await oversized.reader.inspect({subscriptionId:SUB,planId:PLAN})).code,'merchant_inventory_page_unverified')
})
