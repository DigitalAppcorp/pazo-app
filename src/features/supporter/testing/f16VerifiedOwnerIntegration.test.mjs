import test from 'node:test'
import assert from 'node:assert/strict'
import {createSandboxSubscriptionOwnerVerifier} from '../../../../supabase/functions/f16-paypal-webhook/verifySandboxSubscriptionOwner.mjs'
const OWNER='63e812b0-a7e5-49f6-b2dd-c11d2c72af57'
const OTHER='8b134f73-5ee3-49a2-9a36-3e1592e5af81'
const INTENT='intent-a-abcdefghijklmnop'
const SUB='I-SANDBOX-AAAA'
const PLAN='P-14V25407JP6850922NLHMDKI'
const TOKEN='some.very.long.fake.jwt.token.for.test.only'
function testSystem({owner=OWNER,authError=null,customId=INTENT,plan=PLAN,dbOwner=OWNER}={}){
 const calls=[]
 const authClient={auth:{getUser:async token=>{
   calls.push(['auth',token])
   return {data:{user:owner?{id:owner,is_anonymous:false}:null},error:authError}
 }}}
 const fetchImpl=async(url,options)=>{
   calls.push(['paypal',url])
   if(url==='https://api-m.sandbox.paypal.com/v1/oauth2/token')
     return {ok:true,json:async()=>({token_type:'Bearer',access_token:'mock-token'})}
   if(url==='https://api-m.sandbox.paypal.com/v1/billing/subscriptions/'+SUB)
     return {ok:true,json:async()=>({
       id:SUB,plan_id:plan,custom_id:customId,status:'ACTIVE',
       subscriber:{email_address:'private@example.com'},
     })}
   throw Error('unexpected_endpoint')
 }
 const loadPrivateIntent=async id=>{
   calls.push(['privateIntent',id])
   return {id:INTENT,ownerId:dbOwner,provider:'paypal',
     planId:PLAN,state:'pending'}
 }
 const verify=createSandboxSubscriptionOwnerVerifier({
   authClient,paypalClientId:'offline-paypal-client-123',
   paypalClientSecret:'offline-paypal-secret-123',
   loadPrivateIntent,fetchImpl,
 })
 const request=new Request('https://localhost/f16/bind',{
   method:'POST',headers:{authorization:'Bearer '+TOKEN}
 })
 return {verify,calls,request}
}
test('one real server composition uses getUser, private intent, and live-shaped PayPal read',async()=>{
 const x=testSystem()
 const r=await x.verify({request:x.request,intentId:INTENT,subscriptionId:SUB})
 assert.equal(r.readyToBind,true)
 assert.equal(r.entitlement,false)
 assert.equal(r.binding.ownerId,OWNER)
 assert.deepEqual(x.calls.map(a=>a[0]),['auth','privateIntent','paypal','paypal'])
 assert.equal(JSON.stringify(r).includes('private@example.com'),false)
})
test('claim by wrong signed-in account fails before PayPal read',async()=>{
 const x=testSystem({owner:OTHER})
 const r=await x.verify({request:x.request,intentId:INTENT,subscriptionId:SUB})
 assert.equal(r.readyToBind,false)
 assert.deepEqual(x.calls.map(a=>a[0]),['auth','privateIntent'])
})
test('invalid Auth or anonymous request denies before database read',async()=>{
 for(const scenario of [{owner:null},{authError:{message:'expired'}}]){
   const x=testSystem(scenario)
   const r=await x.verify({request:x.request,intentId:INTENT,subscriptionId:SUB})
   assert.equal(r.readyToBind,false)
   assert.deepEqual(x.calls.map(a=>a[0]),['auth'])
 }
})
test('provider custom ID or plan mismatch denies with no entitlement',async()=>{
 for(const scenario of [{customId:'intent-b-abcdefghijklmnop'},{plan:'P-OTHER'}]){
  const x=testSystem(scenario)
  const r=await x.verify({request:x.request,intentId:INTENT,subscriptionId:SUB})
  assert.equal(r.readyToBind,false)
  assert.equal(r.entitlement,false)
 }
})
test('a spoofed JSON request context cannot substitute for HTTP Request',async()=>{
 const x=testSystem()
 const r=await x.verify({
   request:{headers:new Headers({authorization:'Bearer '+TOKEN})},
   intentId:INTENT,subscriptionId:SUB,
 })
 assert.equal(r.readyToBind,false)
 assert.deepEqual(x.calls,[])
})
