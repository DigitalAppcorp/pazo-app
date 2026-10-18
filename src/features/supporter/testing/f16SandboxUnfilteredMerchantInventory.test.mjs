import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createPazoSandboxV2UnfilteredInventoryRead}
 from '../../../../supabase/functions/f16-paypal-webhook/pazoSandboxV2UnfilteredInventoryRead.mjs'
const SUB='I-ORIGINAL-V2-123'
const PLAN='P-14V25407JP6850922NLHMDKI'
const row=status=>({id:SUB,plan_id:PLAN,status})
function setup(pages,{status=null}={}){
 const calls=[]
 const reader=createPazoSandboxV2UnfilteredInventoryRead({
  clientId:'sandboxClient123',clientSecret:'sandboxSecret123',
  fetchImpl:async(url,opts)=>{
   calls.push({url,method:opts.method})
   if(url.endsWith('/v1/oauth2/token'))
    return {ok:true,json:async()=>({token_type:'Bearer',access_token:'PRIVATE_TOKEN'})}
   if(status!==null)return {ok:false,status}
   const page=Number(new URL(url).searchParams.get('page'))
   return {ok:true,json:async()=>pages[page-1]??{subscriptions:[],links:[]}}
  }
 })
 return {reader,calls}
}
test('unfiltered merchant GET never sends plan_ids or statuses and finds a pending original',async()=>{
 const {reader,calls}=setup([{subscriptions:[{id:'I-OLD-TEST'},{...row('APPROVAL_PENDING')}],links:[]}])
 const a=await reader.inspect({subscriptionId:SUB,planId:PLAN})
 assert.equal(a.code,'unfiltered_inventory_original_found')
 assert.equal(a.providerStatus,'APPROVAL_PENDING')
 assert.equal(a.mayRetry,false)
 assert.equal(a.mayRecordPayment,false)
 assert.equal(a.mayGrantBenefits,false)
 assert.equal(a.paidThrough,null)
 assert.equal(a.merchantInventoryEnumerated,true)
 assert.equal(calls[0].method,'POST')
 assert.equal(calls[1].method,'GET')
 assert.equal(new URL(calls[1].url).searchParams.has('plan_ids'),false)
 assert.equal(new URL(calls[1].url).searchParams.has('statuses'),false)
 assert.equal(JSON.stringify(a).includes(SUB),false)
 assert.equal(JSON.stringify(a).includes('PRIVATE_TOKEN'),false)
})
test('absence from the all-subscriptions list is not a safe permission to retry',async()=>{
 const {reader}=setup([{subscriptions:[{id:'I-OLD-TEST'}],links:[]}])
 const r=await reader.inspect({subscriptionId:SUB,planId:PLAN})
 assert.equal(r.code,'unfiltered_inventory_original_absent')
 assert.equal(r.merchantInventoryEnumerated,true)
 assert.equal(r.mayRetry,false)
})
test('pagination cannot silently conclude absence after first page',async()=>{
 const page1=Array.from({length:20},(_,i)=>({id:'I-HISTORIC-'+i}))
 const {reader}=setup([{subscriptions:page1,links:[{rel:'next'}]},{subscriptions:[row('CANCELLED')],links:[]}])
 const result=await reader.inspect({subscriptionId:SUB,planId:PLAN})
 assert.equal(result.code,'unfiltered_inventory_original_found')
 assert.equal(result.providerStatus,'CANCELLED')
 const truncated=setup([{subscriptions:page1,links:[]}])
 const x=await truncated.reader.inspect({subscriptionId:SUB,planId:PLAN})
 assert.equal(x.code,'unfiltered_inventory_original_absent')
 assert.equal(x.mayRetry,false)
})
test('malformed, oversized or untrusted rows are not proof of merchant absence',async()=>{
 for(const page of [
  {links:[]},
  {subscriptions:[{status:'ACTIVE'}],links:[]},
  {subscriptions:[],links:[{rel:99}]},
  {subscriptions:Array.from({length:21},()=>({id:'I-SOMEONE'})),links:[]},
 ]){
  const {reader}=setup([page])
  const result=await reader.inspect({subscriptionId:SUB,planId:PLAN})
  assert.equal(result.merchantInventoryEnumerated,false)
  assert.equal(result.mayRetry,false)
 }
})
test('exact ID with wrong plan, unsupported state or duplicate remains unverified',async()=>{
 for(const rows of [
  [{...row('ACTIVE'),plan_id:'P-OTHER'}],
  [{id:SUB,plan_id:PLAN,status:'UNKNOWN'}],
  [row('ACTIVE'),row('CANCELLED')]
 ]){
  const {reader}=setup([{subscriptions:rows,links:[]}])
  const result=await reader.inspect({subscriptionId:SUB,planId:PLAN})
  assert.equal(result.mayRetry,false)
  assert.equal(result.merchantInventoryEnumerated,false)
 }
})
test('HTTP failures and wrong private binding fail closed',async()=>{
 for(const status of [400,401,403,429,500]){
  const {reader}=setup([],{status})
  await assert.rejects(()=>reader.inspect({subscriptionId:SUB,planId:PLAN}))
 }
 const {reader,calls}=setup([])
 await assert.rejects(()=>reader.inspect({subscriptionId:SUB,planId:'P-OTHER'}),
  /unfiltered_inventory_binding_unverified/)
 assert.equal(calls.length,0)
})
test('source has no subscription write or user PII response',()=>{
 const source=readFileSync(new URL('../../../../supabase/functions/f16-paypal-webhook/pazoSandboxV2UnfilteredInventoryRead.mjs',import.meta.url),'utf8')
 assert.ok(source.includes('mayRetry:false'))
 assert.ok(source.includes("method:'GET'"))
 assert.ok(!source.includes('/cancel'))
 assert.ok(!source.includes('/capture'))
 assert.ok(!source.includes('/activate'))
 assert.ok(!source.includes('payer_email'))
 assert.ok(!source.includes('customer_id'))
})
