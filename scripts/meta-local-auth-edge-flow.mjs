// #169: real local GoTrue JWT + candidate Edge HTTP contracts, NO hosted APIs.
// The event store is IN-MEMORY and isolated; SQL concurrency is separately
// validated in the disposable PG17 suite. No Meta SDK/Meta graph requests.
import assert from 'node:assert/strict'
import {randomUUID} from 'node:crypto'
import {createMetaGrantHandler} from '../supabase/functions/pazo-meta-consent/grantCore.mjs'
import {createMetaReceiptHandler} from '../supabase/functions/pazo-meta-receipt/receiptCore.mjs'
import {createMetaWithdrawalHandler} from '../supabase/functions/pazo-meta-consent/withdrawCore.mjs'
import {completeExplicitMetaOptIn} from '../src/features/marketing/metaConsentRegistrationFlow.mjs'
import {createMetaConsentTransport,createMetaWithdrawalTransport}
 from '../src/features/marketing/metaConsentTransport.mjs'

const ORIGIN='https://pazo-app.vercel.app'
const DATASET='1438916858347709'
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const UUID4=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
function onlyLocal(url){
 const u=new URL(url)
 assert.equal(u.protocol,'http:','GoTrue lab must not use hosted HTTPS')
 assert.ok(['localhost','127.0.0.1','[::1]'].includes(u.hostname),
  'GoTrue lab forbids any hosted Supabase request')
 return u
}
const readBody=async res=>{try{return await res.json()}catch{return null}}
export async function runAuthenticatedMetaEdgeLab({api,key,ownerId,token}={}){
 const base=onlyLocal(api).origin
 assert.ok(typeof key==='string'&&key.length>=16)
 assert.ok(typeof token==='string'&&token.length>30)
 assert.match(ownerId,UUID)
 let authenticateCalls=0,mutations=0,receipts=0,pixelCallbacks=0
 let granted=false,withdrawn=false,issued=false,permitted=true,gpc=false
 const eventId=randomUUID()
 assert.match(eventId,UUID4)
 const authenticate=async jwt=>{
  authenticateCalls++
  const u=base+'/auth/v1/user'
  onlyLocal(u)
  const res=await fetch(u,{method:'GET',redirect:'manual',
   signal:AbortSignal.timeout(7000),
   headers:{apikey:key,authorization:'Bearer '+jwt,accept:'application/json'}})
  if(res.status!==200)return null
  const data=await readBody(res)
  if(!data?.id||!UUID.test(data.id)||data.is_anonymous===true)return null
  return {id:data.id,email_confirmed_at:data.email_confirmed_at,
   is_anonymous:false}
 }
 const authorize=await authenticate(token)
 assert.equal(authorize?.id,ownerId,'JWT must identify original GoTrue account')
 assert.ok(authorize?.email_confirmed_at,'GoTrue must attest confirmed email')
 // Explicit approved flag simulations are ONLY for testing the pure
 // HTTP handler; no production environment gate has been switched on.
 const grant=createMetaGrantHandler({released:true,privacyReviewed:true,
  authenticate,authenticateGpc:authenticate,
  grant:async(owner,notice)=>{
   mutations++
   if(owner!==ownerId||notice!=='pazo-meta-conversions-v1'
      ||granted||withdrawn)return false
   granted=true;return true
  },
  persistGpc:async owner=>{
   mutations++
   if(owner!==ownerId)return false
   withdrawn=true;granted=false;return true
  },
 })
 const receipt=createMetaReceiptHandler({released:true,privacyReviewed:true,
  authenticate,authenticateGpc:authenticate,
  lookupReceipt:async owner=>{
   receipts++
   if(owner!==ownerId||!granted||withdrawn||issued)return null
   issued=true
   return {ownerId,authorized:true,verifiedRegistration:true,
    excluded:false,gpc:false,sharingOptOut:false,withdrawn:false,
    metaReleaseEnabled:true,eventId,datasetId:DATASET,
    eventTime:Math.floor(Date.now()/1000)}
  },
  persistGpc:async owner=>{
   mutations++
   if(owner!==ownerId)return false
   granted=false;withdrawn=true;return true
  },
 })
 const withdraw=createMetaWithdrawalHandler({released:true,authenticate,
  withdraw:async owner=>{
   mutations++
   if(owner!==ownerId)return false
   granted=false;withdrawn=true;return true
  },
 })
 const handlers={'pazo-meta-grant':grant,'pazo-meta-receipt':receipt,
  'pazo-meta-consent':withdraw}
 const invoke=async(name,opts)=>{
  const handler=handlers[name]
  assert.ok(handler,'unknown candidate endpoint must not be called')
  const req=new Request('https://lab.invalid/functions/v1/'+name,{
   method:'POST',headers:{origin:ORIGIN,'content-type':'application/json',
    authorization:opts.headers.Authorization,'x-client-info':'supabase-js-local'},
   body:JSON.stringify(opts.body),
  })
  const res=await handler(req)
  return {data:await readBody(res),error:res.ok?null:{status:res.status}}
 }
 const browser={navigator:{get globalPrivacyControl(){return gpc}}}
 const client={functions:{invoke}}
 const snapshot=()=>({id:ownerId,accessToken:token})
 const options={released:true,privacyApproved:true,supabaseClient:client,
  ownerId,getSessionSnapshot:snapshot,stillPermitted:()=>permitted,browser}
 const transport=createMetaConsentTransport(options)
 const remove=createMetaWithdrawalTransport({
  withdrawalReleased:true,supabaseClient:client,ownerId,getSessionSnapshot:snapshot})
 assert.ok(transport&&remove)
 const direct=async(name,body,auth=token,headers={})=>{
  const h=handlers[name]
  const req=new Request('https://lab.invalid/functions/v1/'+name,{
   method:'POST',headers:{origin:ORIGIN,'content-type':'application/json',
    authorization:'Bearer '+auth,...headers},
   body:JSON.stringify(body),
  })
  const res=await h(req)
  return {status:res.status,data:await readBody(res)}
 }
 const beforeMutations=mutations
 const invalid=await direct('pazo-meta-grant',
  {action:'grant',noticeVersion:'pazo-meta-conversions-v1'},'invalid-jwt-token-lab-12345')
 assert.equal(invalid.status,401,'unknown JWT must never grant')
 assert.equal(mutations,beforeMutations)
 const spoof=await direct('pazo-meta-grant',
  {action:'grant',noticeVersion:'pazo-meta-conversions-v1',ownerId:randomUUID()})
 assert.equal(spoof.status,400,'browser owner field rejected')
 assert.equal(mutations,beforeMutations)
 const result=await completeExplicitMetaOptIn({
  releaseEnabled:true,privacyApproved:true,deliberateOptIn:true,
  ownerId,accessToken:token,getActiveSession:snapshot,
  stillPermitted:()=>permitted,browser,dom:{},
  requestGrant:transport.requestGrant,requestReceipt:transport.requestReceipt,
  requestWithdraw:remove.requestWithdraw,
  pixelLoader:async({eventId:received,datasetId})=>{
   assert.equal(received,eventId)
   assert.equal(datasetId,DATASET)
   pixelCallbacks++
   return {status:'queued'}
  },
 })
 assert.deepEqual(result,{status:'queued'},
  'real Auth verified user must pass one simulated consent-to-event flow')
 assert.equal(mutations,beforeMutations+1)
 assert.equal(receipts,1)
 assert.equal(pixelCallbacks,1)
 // Re-login / repeated callbacks must never generate another conversion.
 const second=await completeExplicitMetaOptIn({
  releaseEnabled:true,privacyApproved:true,deliberateOptIn:true,
  ownerId,accessToken:token,getActiveSession:snapshot,
  stillPermitted:()=>permitted,browser,dom:{},
  requestGrant:transport.requestGrant,requestReceipt:transport.requestReceipt,
  pixelLoader:async()=>{pixelCallbacks++;return {status:'queued'}},
 })
 assert.notEqual(second.status,'queued')
 assert.equal(pixelCallbacks,1)
 // After consent, a browser GPC request persists the opt-out even when
 // a browser receipt was consumed; future receipt is blocked.
 const gpcResult=await direct('pazo-meta-receipt',{},token,{'sec-gpc':'1'})
 assert.equal(gpcResult.status,403)
 assert.equal(withdrawn,true)
 assert.equal((await direct('pazo-meta-receipt',{})).status,404)
 assert.deepEqual(await remove.requestWithdraw({
  accessToken:token,body:{action:'withdraw'}}),{status:'withdrawn'},
  'an explicit repeated withdrawal must stay idempotent')
 assert.equal(granted,false)
 assert.equal((await direct('pazo-meta-grant',
  {action:'grant',noticeVersion:'pazo-meta-conversions-v1'})).status,409,
  'GPC withdrawal cannot be silently undone')
 gpc=true
 assert.equal((await transport.requestGrant({accessToken:token,
  body:{action:'grant',noticeVersion:'pazo-meta-conversions-v1'}})).status,
  'not_available')
 permitted=false
 assert.equal(pixelCallbacks,1)
 assert.ok(authenticateCalls>=5,'candidate HTTP endpoints must use live GoTrue Auth')
 return {status:'LOCAL_AUTH_META_EDGE_CONTRACT_PASS',realJwt:true,
  confirmedEmailRequired:true,browserOwnerSpoofRejected:true,
  unknownJwtRejected:true,oneEventId:true,repeatSuppressed:true,
  gpcWithdrawPersistedInMemory:true,
  metaProviderRequests:0,hostedRequests:0,hostedSqlWrites:0}
}
