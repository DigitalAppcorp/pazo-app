import test from 'node:test'
import assert from 'node:assert/strict'
import {publicUrlInaccessible} from './publicUrl.ts'
const url='https://example.invalid/synthetic.jpg'
for(const status of [200,206,301,302,401,403,429,500,503]) {
 test('public absence rejects HTTP '+status,async()=>{
  assert.equal(await publicUrlInaccessible(url,async()=>new Response(null,{status})),false)
 })
}
test('HEAD missing does not mask GET bytes or access denied',async()=>{
 for(const status of [200,206,401,403,500]) {
  let call=0
  assert.equal(await publicUrlInaccessible(url,async()=>new Response(null,{status:++call===1?404:status})),false)
  assert.equal(call,2)
 }
})
test('both original and fresh URLs require HEAD and ranged GET absence',async()=>{
 const calls=[]
 assert.equal(await publicUrlInaccessible(url,async(u,o)=>{
  calls.push([u,o]);return new Response(null,{status:404})
 }),true)
 assert.equal(calls.length,4)
 assert.equal(calls[0][0],url);assert.equal(calls[1][0],url)
 assert.ok(new URL(calls[2][0]).searchParams.has('pazo_verify'))
 assert.equal(calls[2][0],calls[3][0])
 assert.deepEqual(calls.map(c=>c[1].method),['HEAD','GET','HEAD','GET'])
 for(const [,o] of calls){assert.equal(o.redirect,'error');assert.equal(o.cache,'no-store')}
 assert.equal(calls[1][1].headers.Range,'bytes=0-0')
})
test('cached original or cache-busted download prevents completion',async()=>{
 for(const failedCall of [1,2,3,4]){let call=0;assert.equal(await publicUrlInaccessible(url,async()=>new Response(null,{status:++call===failedCall?200:404})),false)}
})
test('HTTP 410 is accepted only for all four probes',async()=>{
 assert.equal(await publicUrlInaccessible(url,async()=>new Response(null,{status:410})),true)
})
test('network and redirect errors remain errors',async()=>{
 await assert.rejects(publicUrlInaccessible(url,async()=>{throw Error('synthetic network failure')}),/synthetic network failure/)
})

const noSuchKey=()=>new Response(JSON.stringify({
  statusCode:'404',code:'NoSuchKey',error:'not_found',message:'Object not found'
}),{status:400,headers:{'Content-Type':'application/json; charset=utf-8'}})

test('Supabase wrapped HTTP 400 NoSuchKey proves all four missing responses',async()=>{
  const calls=[]
  assert.equal(await publicUrlInaccessible(url,async(u,o)=>{
    calls.push({url:u,method:o.method,range:o.headers.Range})
    return o.method==='HEAD'?new Response(null,{status:400}):noSuchKey()
  }),true)
  assert.equal(calls.length,4)
  assert.deepEqual(calls.map(c=>c.method),['HEAD','GET','HEAD','GET'])
  assert.deepEqual(calls.map(c=>c.range),[undefined,'bytes=0-0',undefined,'bytes=0-0'])
  assert.equal(calls[0].url,url)
  assert.equal(calls[2].url,calls[3].url)
  assert.ok(new URL(calls[2].url).searchParams.has('pazo_verify'))
})

test('HEAD 404 and GET with exact wrapped 400 is accepted',async()=>{
  assert.equal(await publicUrlInaccessible(url,async(_u,o)=>
    o.method==='HEAD'?new Response(null,{status:404}):noSuchKey()
  ),true)
})

test('ambiguous HEAD 400 cannot be confirmed solely by GET 404',async()=>{
  assert.equal(await publicUrlInaccessible(url,async(_u,o)=>
    new Response(null,{status:o.method==='HEAD'?400:404})
  ),false)
})

test('a generic or forged HTTP 400 can never prove public absence',async()=>{
  const valid={statusCode:'404',code:'NoSuchKey',error:'not_found',message:'Object not found'}
  const variants=[
    {code:'NoSuchKey'}, {message:'Object not found'},
    {...valid,statusCode:'400'}, {...valid,statusCode:' 404'},
    {...valid,code:'Unknown'}, {...valid,error:'access_denied'},
    {...valid,message:'unknown'}, {}, [], null
  ]
  for(const body of variants){
    let calls=0
    assert.equal(await publicUrlInaccessible(url,async(_u,o)=>{
      calls++
      return o.method==='HEAD' ? new Response(null,{status:400}) :
        new Response(JSON.stringify(body),{status:400,headers:{'Content-Type':'application/json'}})
    }),false)
    assert.equal(calls,2)
  }
})

test('HTTP 400 without canonical JSON is refused',async()=>{
  for(const response of [
    new Response('Object not found',{status:400,headers:{'Content-Type':'text/plain'}}),
    new Response('{malformed json',{status:400,headers:{'Content-Type':'application/json'}}),
    new Response(null,{status:400,headers:{'Content-Type':'application/json'}})
  ]) {
    assert.equal(await publicUrlInaccessible(url,async(_u,o)=>
      o.method==='HEAD'?new Response(null,{status:400}):response
    ),false)
  }
})

test('a public cache hit or denied download invalidates even exact NoSuchKey evidence',async()=>{
  for(const status of [200,206,401,403,429,500]){
    let calls=0
    assert.equal(await publicUrlInaccessible(url,async(_u,o)=>{
      calls++
      if(calls===4) return new Response(null,{status})
      return o.method==='HEAD' ? new Response(null,{status:400}) : noSuchKey()
    }),false)
    assert.equal(calls,4)
  }
})

test('HTTP 400 JSON NoSuchKey on a 200 download is not accepted',async()=>{
  const body=JSON.stringify({statusCode:'404',code:'NoSuchKey',error:'not_found',message:'Object not found'})
  assert.equal(await publicUrlInaccessible(url,async(_u,o)=>
    o.method==='HEAD'?new Response(null,{status:404}):
      new Response(body,{status:200,headers:{'Content-Type':'application/json'}})
  ),false)
})
