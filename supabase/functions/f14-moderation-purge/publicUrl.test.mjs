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
