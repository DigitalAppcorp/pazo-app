import {createGradualMaintenance} from './gradualMaintenance.mjs'
import {createOriginalQaReconcile} from './qaOriginalReconcile.mjs'
import {createOriginalQaAudit} from './qaOriginalAudit.mjs'
import {createPazoLivePrivateWorkerHttp} from './privateWorkerHttp.mjs'
import {createPazoLiveServiceRpc} from '../pazo-paypal-live-checkout/liveSqlServiceAdapters.mjs'
import {createPazoLiveInboxLease} from '../pazo-paypal-live-webhook/liveInboxLease.mjs'
import {createPazoLiveVaultHistoricalVerification} from '../pazo-paypal-live-webhook/liveHistoricalReadPipeline.mjs'
import {createPazoLiveDurableSaleWorker} from '../pazo-paypal-live-webhook/liveDurableSaleWorker.mjs'
import {createPazoLiveDurableRefundWorker} from '../pazo-paypal-live-webhook/liveDurableRefundWorker.mjs'
import {createPazoLiveDurableLifecycleWorker} from '../pazo-paypal-live-webhook/liveDurableLifecycleWorker.mjs'
import {createPazoLiveDurableDisputeWorker} from '../pazo-paypal-live-webhook/liveDurableDisputeWorker.mjs'
import {readPazoLiveAcceptedOffer} from '../pazo-paypal-live-checkout/liveOfferRegistry.mjs'
export function createPazoLiveHostedPrivateWorker({released=false,getEnv=()=>undefined,fetchImpl=fetch}={}){
 if(released!==true)return createPazoLivePrivateWorkerHttp()
 try{
  const projectUrl=getEnv('SUPABASE_URL'),serviceRoleKey=getEnv('SUPABASE_SERVICE_ROLE_KEY')
  const rpc=createPazoLiveServiceRpc({projectUrl,serviceRoleKey,fetchImpl})
  const lease=createPazoLiveInboxLease({projectUrl,serviceRoleKey,fetchImpl,workerRecovery:true})
  const historical=createPazoLiveVaultHistoricalVerification({supabaseUrl:projectUrl,serviceRoleKey,fetchImpl,released:true})
  const verifyAcceptedConsent=async c=>c?.affirmativeConsent===true&&readPazoLiveAcceptedOffer(c)!==null
  const options={released:true,lease,rpc,historical}
  const maintain=createGradualMaintenance({rpc,readWebhookReady:async()=>{
   const response=await fetchImpl(projectUrl+'/functions/v1/pazo-paypal-live-webhook',{
    method:'GET',redirect:'error',cache:'no-store',signal:AbortSignal.timeout(8000),
    headers:{apikey:getEnv('SUPABASE_ANON_KEY'),Accept:'application/json'}})
   if(!response.ok||response.status!==200)return false
   const status=await response.json()
   return status?.source==='pazo_live_webhook_readiness_v1'&&status.ready===true&&status.mayGrantBenefits===false
  }})
  const workers={sale:createPazoLiveDurableSaleWorker({...options,verifyAcceptedConsent}),refund:createPazoLiveDurableRefundWorker(options),lifecycle:createPazoLiveDurableLifecycleWorker(options),dispute:createPazoLiveDurableDisputeWorker(options)}
  const auditOriginalQa=createOriginalQaAudit({rpc,historical})
  return createPazoLivePrivateWorkerHttp({released:true,
   auditOriginalQa,reconcileOriginalQa:createOriginalQaReconcile({rpc,historical,auditOriginal:auditOriginalQa,lifecycle:workers.lifecycle}),
   admit:({invoker})=>rpc('workerAdmit',{p_invoker:invoker}),
   complete:async({leaseToken,outcome,code,build,maintenanceAllowed=false})=>{
    const done=await rpc('workerComplete',{p_lease:leaseToken,p_outcome:outcome,p_code:code,p_build:build})
    if(done===true&&maintenanceAllowed){try{await maintain({outcome})}catch{/* Durable rollout events retry next authenticated batch; never repeat payment. */}}
    return done
   },
   workers})
 }catch{return createPazoLivePrivateWorkerHttp()}
}
