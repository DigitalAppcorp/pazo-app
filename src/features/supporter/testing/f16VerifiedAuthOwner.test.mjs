import test from 'node:test'
import assert from 'node:assert/strict'
import {createVerifiedAuthOwnerResolver} from '../../../../supabase/functions/f16-paypal-webhook/verifiedAuthOwner.mjs'

const A='63e812b0-a7e5-49f6-b2dd-c11d2c72af57'
const TOKEN='eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJtZW1iZXIifQ.dummysignature'
const request=(value='Bearer '+TOKEN)=>({headers:new Headers({authorization:value})})
const setup=(getUser=async()=>({data:{user:{id:A,is_anonymous:false}},error:null}))=>{
 const calls=[]
 const authClient={auth:{getUser:async token=>{calls.push(token);return getUser(token)}}}
 return {resolve:createVerifiedAuthOwnerResolver({authClient}),calls}
}
test('reads verified owner ID only from Auth getUser(token)',async()=>{
 const x=setup()
 const owner=await x.resolve({...request(),ownerId:'8b134f73-5ee3-49a2-9a36-3e1592e5af81'})
 assert.equal(owner,A)
 assert.deepEqual(x.calls,[TOKEN])
})
test('does not trust browser owner, JWT claim decoding or mutable metadata',async()=>{
 const x=setup(async()=>({data:{user:{id:A,user_metadata:{is_admin:true,id:'evil'}}},error:null}))
 assert.equal(await x.resolve(request()),A)
 assert.deepEqual(x.calls,[TOKEN])
})
test('missing, invalid, or oversized credentials never reach Auth server',async()=>{
 const x=setup()
 for(const h of ['', 'Bearer foo','Basic '+TOKEN,'bearer '+TOKEN,
    'Bearer '+TOKEN+' extra','Bearer '+'x'.repeat(4121),'Bearer abc\tdef']){
  assert.equal(await x.resolve(request(h)),null)
 }
 assert.equal(await x.resolve({headers:null}),null)
 assert.equal(x.calls.length,0)
})
test('Auth network error, rejected token, anonymous and malformed user deny owner',async()=>{
 for(const getUser of [
  async()=>{throw Error('offline')},
  async()=>({data:{user:null},error:{message:'invalid'}}),
  async()=>({data:{user:{id:A}},error:{message:'expired'}}),
  async()=>({data:{user:{id:A,is_anonymous:true}}}),
  async()=>({data:{user:{id:'spoofed'}}}),
 ]){
  const x=setup(getUser)
  assert.equal(await x.resolve(request()),null)
 }
})
test('fails closed if Auth client is missing',()=>{
 assert.throws(()=>createVerifiedAuthOwnerResolver({}),/verified_auth_client_required/)
})
