// PAZO F16 — unreleased private refund reconciliation worker composition.
// Neither a public webhook nor a browser can invoke this module by itself.
// A future server-only scheduler must provide a DURABLE signed-event claimant.
import {createPazoLiveVaultHistoricalVerification}
 from './liveHistoricalReadPipeline.mjs'
import {createPazoLiveRecordedSaleReader}
 from './liveHostedRecordedSale.mjs'
import {createPazoLiveServiceRpc}
 from '../pazo-paypal-live-checkout/liveSqlServiceAdapters.mjs'
import {createPazoLiveVerifiedSettlementWriter}
 from './liveVerifiedSettlementWriter.mjs'
import {createPazoLiveRefundReconciliationGate}
 from './liveRefundReconciliationGate.mjs'
const URL='https://mrybvqdebbgcayuvgkkr.supabase.co'
const review=(code)=>Object.freeze({state:'REVIEW_REQUIRED',code,
 entitlementGranted:false,paymentRecorded:false,refundRecorded:false})
export function createPazoLiveHostedRefundWorker({
 released=false,getEnv=()=>undefined,claimVerifiedEvent,fetchImpl=fetch
}={}){
 if(released!==true)return async()=>review('live_refund_worker_not_released')
 if(typeof getEnv!=='function'||typeof claimVerifiedEvent!=='function'||
  typeof fetchImpl!=='function')return async()=>review('live_refund_worker_not_configured')
 let url,key,historical,recorded,rpc
 try{
  url=getEnv('SUPABASE_URL')
  key=getEnv('SUPABASE_SERVICE_ROLE_KEY')
  if(url!==URL||typeof key!=='string'||key.length<24)throw Error('env')
  historical=createPazoLiveVaultHistoricalVerification({
   supabaseUrl:url,serviceRoleKey:key,released:true,
   fetchImpl
  })
  recorded=createPazoLiveRecordedSaleReader({
   projectUrl:url,serviceRoleKey:key,fetchImpl
  })
  rpc=createPazoLiveServiceRpc({
   projectUrl:url,serviceRoleKey:key,fetchImpl
  })
 }catch{return async()=>review('live_refund_worker_not_configured')}
 const writer=createPazoLiveVerifiedSettlementWriter({rpc})
 return createPazoLiveRefundReconciliationGate({
  released:true,claimVerifiedEvent,
  findOriginalBinding:historical.findBoundSubscription,
  findRecordedSale:recorded,
  readerForGeneration:historical.readerForGeneration,
  writer
 })
}
