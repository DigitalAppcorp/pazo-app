import test from 'node:test'
import assert from 'node:assert/strict'
import {createMetaWithdrawalProvider}
  from '../supabase/functions/pazo-meta-consent/withdrawAdapter.mjs'
import {createMetaWithdrawalHandler}
  from '../supabase/functions/pazo-meta-consent/withdrawCore.mjs'
const url='https://mrybvqdebbgcayuvgkkr.supabase.co'
const owner='16900000-0000-4000-8000-000000000001'
const anon='synthetic_anon_key_never_real_123456'
const service='synthetic_service_key_never_real_123456'
test('wrong project or keys fail without HTTP operations',()=>{
 for(const options of [{url:'https://unrelated.supabase.co',anonKey:anon,serviceKey:service},
   {url,anonKey:'short',serviceKey:service},
   {url,anonKey:anon,serviceKey:'short'}])
   assert.throws(()=>createMetaWithdrawalProvider(options))
})
test('server Auth resolves owner, service-only RPC uses that owner',async()=>{
 const calls=[]
 const provider=createMetaWithdrawalProvider({
  url,anonKey:anon,serviceKey:service,
  fetchImpl:async(path,params)=>{
   calls.push({path,params})
   if(path.endsWith('/auth/v1/user'))return new Response(JSON.stringify({id:owner}),
     {status:200,headers:{'content-type':'application/json'}})
   if(path.endsWith('/rpc/pazo_meta_withdraw_candidate'))
     return new Response('true',{status:200,headers:{'content-type':'application/json'}})
   throw Error('unexpected path')
  },
 })
 const handler=createMetaWithdrawalHandler({released:true,...provider})
 const res=await handler(new Request('https://unused.invalid',{
  method:'POST',headers:{origin:'https://pazo-app.vercel.app',
   authorization:'Bearer synthetic-jwt-test-signed',
   'content-type':'application/json'},
  body:'{"action":"withdraw"}'
 }))
 assert.equal(res.status,200)
 assert.deepEqual(await res.json(),{status:'withdrawn'})
 assert.equal(calls.length,2)
 assert.equal(calls[0].path,url+'/auth/v1/user')
 assert.equal(calls[0].params.headers.authorization,'Bearer synthetic-jwt-test-signed')
 assert.equal(calls[0].params.headers.apikey,anon)
 assert.equal(calls[1].path,url+'/rest/v1/rpc/pazo_meta_withdraw_candidate')
 assert.equal(calls[1].params.headers.authorization,'Bearer '+service)
 assert.deepEqual(JSON.parse(calls[1].params.body),{p_owner:owner})
 assert.equal(JSON.stringify(calls[1].params.body).includes(service),false)
})
test('failure in Auth prevents elevated service RPC, auth is never browser-trusted',async()=>{
 let requests=0
 const provider=createMetaWithdrawalProvider({url,anonKey:anon,serviceKey:service,
  fetchImpl:async()=>{requests++;return new Response('{"message":"unauthorized"}',{status:401})}})
 const handler=createMetaWithdrawalHandler({released:true,...provider})
 const res=await handler(new Request('https://unused.invalid',{
  method:'POST',headers:{origin:'https://pazo-app.vercel.app',
  authorization:'Bearer synthetic-jwt-test-signed','content-type':'application/json'},
  body:'{"action":"withdraw"}'}))
 assert.equal(res.status,401)
 assert.equal(requests,1)
})
test('RPC error or unexpected response never claims opt-out saved',async()=>{
 for(const variant of [new Response('false',{status:200}),
   new Response('{"ok":true}',{status:200}),
   new Response('error',{status:500})]){
   const provider=createMetaWithdrawalProvider({url,anonKey:anon,serviceKey:service,
    fetchImpl:async()=>variant})
   assert.equal(await provider.withdraw(owner),false)
 }
})
