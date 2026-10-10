import test from 'node:test'
import assert from 'node:assert/strict'
import { storageObjectExists } from './storageInfo.ts'

test('existing Storage.info object is confirmed only with a nonempty response object',()=>{
  assert.equal(storageObjectExists({data:{name:'picture.webp',size:125},error:null}),true)
})

test('missing origin requires explicit HTTP 404 with absent data',()=>{
  assert.equal(storageObjectExists({data:null,error:{status:404,message:'not found'}}),false)
})

test('ambiguous data or errors never confirm origin removal',()=>{
  for(const response of [
    null, undefined, {}, [], {data:null,error:null}, {data:undefined,error:null},
    {data:null,error:{status:401}}, {data:null,error:{status:403}},
    {data:null,error:{status:429}}, {data:null,error:{status:500}},
    {data:null,error:{message:'Object not found'}},
    {data:null,error:{status:'404'}},
    {data:{name:'picture.webp'},error:{status:404}},
    {data:'picture.webp',error:null}, {data:[],error:null},
  ]) assert.throws(()=>storageObjectExists(response),/storage_info_unverified/)
})
