import test from 'node:test'
import assert from 'node:assert/strict'
import {syncMetaGpcWithdrawal} from '../src/features/marketing/metaGpcSync.mjs'
const owner='16900000-0000-4000-8000-000000000001'
const other='16900000-0000-4000-8000-000000000002'
const token='synthetic-jwt-long-token-from-verified-owner'
function fixture(){
 let active={id:owner,accessToken:token}, gpc=true, calls=[]
 const browser={navigator:{get globalPrivacyControl(){return gpc}}}
 return {browser,changeOwner:()=>active={id:other,accessToken:token},
   noGpc:()=>gpc=false,calls,
   payload:{withdrawalReleased:true,browser,ownerId:owner,accessToken:token,
      getSessionSnapshot:()=>active,requestWithdraw:async x=>{
       calls.push(x);return {status:'withdrawn'}
      }}}
}
test('OFF means no session, browser or network access',async()=>{
 let reads=0
 const result=await syncMetaGpcWithdrawal({
  withdrawalReleased:false,
  browser:{get navigator(){reads++;throw Error('privacy-read')}},
  getSessionSnapshot:()=>{reads++;throw Error('auth-read')},
  requestWithdraw:()=>{reads++;throw Error('network-call')},
 })
 assert.deepEqual(result,{status:'disabled'})
 assert.equal(reads,0)
})
test('GPC false never calls the withdrawal endpoint',async()=>{
 const f=fixture();f.noGpc()
 assert.deepEqual(await syncMetaGpcWithdrawal(f.payload),{status:'no_gpc'})
 assert.equal(f.calls.length,0)
})
test('GPC true sends only same-owner withdrawal, without event/identity fields',async()=>{
 const f=fixture()
 assert.deepEqual(await syncMetaGpcWithdrawal(f.payload),{status:'withdrawn'})
 assert.deepEqual(f.calls,[{accessToken:token,body:{action:'withdraw'}}])
 assert.equal(JSON.stringify(f.calls[0].body).includes(owner),false)
})
test('GPC works with provider and consent screen independently OFF',async()=>{
 const f=fixture()
 const o=await syncMetaGpcWithdrawal({...f.payload,consentReleased:false,
  pixelReleased:false,capiReleased:false})
 assert.deepEqual(o,{status:'withdrawn'})
 assert.equal(f.calls.length,1)
})
test('unknown account, missing session and changed account never call server',async()=>{
 for(const variant of [{ownerId:null},{ownerId:'invalid'},
     {accessToken:null},{getSessionSnapshot:()=>null}]){
  const f=fixture()
  assert.deepEqual(await syncMetaGpcWithdrawal({...f.payload,...variant}),
    {status:'unconfirmed'})
  assert.equal(f.calls.length,0)
 }
 const f=fixture();f.changeOwner()
 assert.deepEqual(await syncMetaGpcWithdrawal(f.payload),{status:'unconfirmed'})
 assert.equal(f.calls.length,0)
})
test('network and authorization errors never claim persisted GPC',async()=>{
 for(const requestWithdraw of [async()=>({status:'not_available'}),
   async()=>{throw Error('transient_backend_outage')},
   async()=>null]){
   const f=fixture()
   assert.deepEqual(await syncMetaGpcWithdrawal({...f.payload,requestWithdraw}),
     {status:'unconfirmed'})
 }
})
test('account switching during async write cannot claim successful withdrawal',async()=>{
 const f=fixture();let release
 const pending=syncMetaGpcWithdrawal({...f.payload,
   requestWithdraw:()=>new Promise(resolve=>{release=resolve})})
 f.changeOwner();release({status:'withdrawn'})
 assert.deepEqual(await pending,{status:'unconfirmed'})
})
