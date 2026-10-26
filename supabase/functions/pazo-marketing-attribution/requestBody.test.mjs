import test from 'node:test'
import assert from 'node:assert/strict'
import {readMarketingBody} from './requestBody.mjs'
test('oversize and stalled bodies terminate without reaching Auth/provider/SQL',async()=>{
 await assert.rejects(()=>readMarketingBody(new Request('https://fixture.invalid',{method:'POST',body:'x'.repeat(10)}),5),e=>e.status===413)
 let cancelled=false
 const stream=new ReadableStream({cancel(){cancelled=true}})
 await assert.rejects(()=>readMarketingBody(new Request('https://fixture.invalid',{method:'POST',body:stream,duplex:'half'}),320,30),e=>e.status===408)
 assert.equal(cancelled,true)
})
