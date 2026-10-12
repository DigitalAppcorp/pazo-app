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

test('Supabase HTTP 400 NoSuchKey with internal 404 confirms missing origin',()=>{
  for (const statusCode of ['404',404]) {
    assert.equal(storageObjectExists({data:null,error:{
      status:400,statusCode,code:'NoSuchKey',message:'Object not found'
    }}),false)
  }
})

test('wrapped absence rejects generic 400, forged codes and misleading messages',()=>{
  const valid={status:400,statusCode:'404',code:'NoSuchKey',message:'Object not found'}
  for(const error of [
    {status:400}, {status:400,message:'Object not found'},
    {...valid,code:'Unknown'}, {...valid,code:null},
    {...valid,statusCode:'400'}, {...valid,statusCode:' 404'},
    {...valid,message:'Bad request'}, {...valid,message:null},
    {...valid,status:401}, {...valid,status:403}, {...valid,status:429},
    {...valid,status:500}, {...valid,status:'400'},
    null, [], 'NoSuchKey',
  ]) {
    assert.throws(()=>storageObjectExists({data:null,error}),/storage_info_unverified/)
  }
  assert.throws(()=>storageObjectExists({data:{name:'exists'},error:valid}),/storage_info_unverified/)
  assert.throws(()=>storageObjectExists({data:undefined,error:valid}),/storage_info_unverified/)
})
