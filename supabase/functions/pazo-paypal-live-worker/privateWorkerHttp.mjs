// Public transport, private capability: only the database-held random invoker
// plus service-only admission can start one bounded batch. No browser CORS.
export const PAZO_LIVE_WORKER_BUILD='pazo_live_worker_v2'
const paths=new Set(['/pazo-paypal-live-worker','/functions/v1/pazo-paypal-live-worker'])
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i
const reply=(status,code,extra={})=>new Response(JSON.stringify({ok:status===200,code,...extra}),
 {status,headers:{'content-type':'application/json','cache-control':'no-store','x-content-type-options':'nosniff'}})
async function body(req){
 const declared=req.headers.get('content-length')
 if(declared!==null&&(!/^\d+$/.test(declared)||Number(declared)>128))throw Error('body')
 const reader=req.body?.getReader();if(!reader)throw Error('body')
 const parts=[];let bytes=0
 while(true){
  const {done,value}=await reader.read();if(done)break
  if(!(value instanceof Uint8Array))throw Error('body')
  bytes+=value.length;if(bytes>128){await reader.cancel().catch(()=>{});throw Error('body')}
  parts.push(value)
 }
 const all=new Uint8Array(bytes);let at=0
 for(const part of parts){all.set(part,at);at+=part.length}
 const parsed=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(all))
 if(!parsed||typeof parsed!=='object'||Array.isArray(parsed)||Object.keys(parsed).join(',')!=='action'||
  !['health','drain','qa_audit','qa_reconcile'].includes(parsed.action))throw Error('body')
 return parsed
}
export function createPazoLivePrivateWorkerHttp({released=false,admit,complete,workers,auditOriginalQa,reconcileOriginalQa}={}){
 return async req=>{
  if(released!==true)return reply(503,'private_worker_not_released')
  if(!(req instanceof Request))return reply(400,'invalid_worker_request')
  let url;try{url=new URL(req.url)}catch{return reply(400,'invalid_worker_request')}
  if(!paths.has(url.pathname)||url.search||url.hash||req.headers.has('origin'))return reply(403,'worker_origin_or_route_rejected')
  if(req.method!=='POST')return reply(405,'worker_post_required')
  if(!/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(req.headers.get('content-type')||''))
   return reply(415,'worker_json_required')
  const authorization=req.headers.get('authorization')||''
  if(!/^Bearer [a-f0-9]{64}$/.test(authorization))return reply(403,'worker_not_authorized')
  if(typeof admit!=='function'||typeof complete!=='function'||
   ['sale','refund','lifecycle'].some(k=>typeof workers?.[k]!=='function'))return reply(503,'worker_backend_unavailable')
  let input;try{input=await body(req)}catch{return reply(400,'invalid_worker_body')}
  let admitted
  try{admitted=await admit({invoker:authorization.slice(7)})}catch{return reply(503,'worker_admission_unavailable')}
  if(admitted?.authenticated!==true)return reply(403,'worker_not_authorized')
  if(admitted.enabled!==true)return reply(200,'worker_disabled',{outcome:'disabled',processed:0})
  if(admitted.busy===true)return reply(200,'worker_batch_busy',{outcome:'busy',processed:0})
  if(!uuid.test(admitted.leaseToken||'')||admitted.expectedBuild!==PAZO_LIVE_WORKER_BUILD||
   typeof admitted.processingAllowed!=='boolean')return reply(503,'worker_build_or_lease_mismatch')
  let outcome='idle',code=input.action==='health'?'worker_health_only':'worker_idle'
  let audit
  if(input.action==='qa_reconcile'&&!admitted.processingAllowed){
   code='worker_qa_processing_off'
  }else if(['qa_audit','qa_reconcile'].includes(input.action)){
   try{const read=input.action==='qa_audit'?auditOriginalQa:reconcileOriginalQa;if(typeof read!=='function')throw Error('audit_unavailable');audit=await read();code=input.action==='qa_audit'?'worker_qa_audit_read':'worker_qa_reconciliation_read';
    if(audit?.reconciliationCode==='qa_lifecycle_outcome_unknown')outcome='unknown';
    else if(input.action==='qa_reconcile'&&(!audit?.complete||!['qa_original_terminal_closed','qa_event_reconciled_contract_not_terminal'].includes(audit.reconciliationCode)))outcome='review'}
   catch{code='worker_qa_audit_unavailable';if(input.action==='qa_reconcile')outcome='unknown'}
  }
  const event=admitted.event
  if(admitted.monitorDue!==undefined&&typeof admitted.monitorDue!=='boolean')return reply(503,'worker_queue_shape_unverified')
  if(input.action==='drain'&&admitted.processingAllowed&&admitted.monitorDue===true){
   if(event!==null||typeof workers.dispute!=='function')return reply(503,'worker_monitor_backend_unavailable')
   let result
   try{result=await workers.dispute({batchLease:admitted.leaseToken})}catch{result={outcomeUnknown:true}}
   if(result?.outcomeUnknown===true){outcome='unknown';code='worker_monitor_outcome_unknown'}
   else if(['RECORDED','ALREADY_RECORDED'].includes(result?.state)&&result.leaseReleased===true){
    outcome=result.monitorOutcome==='clear'?'idle':result.monitorOutcome==='unavailable'?'retry':'review'
    code=outcome==='idle'?'worker_monitor_committed':outcome==='retry'?'worker_monitor_pending':'worker_monitor_requires_review'
   }else if(result?.state==='NOT_CLAIMED'){code='worker_monitor_idle'}
   else{outcome='review';code='worker_monitor_requires_review'}
  }
  if(input.action==='drain'&&admitted.processingAllowed&&event!==null){
   if(!Number.isSafeInteger(event?.merchantGeneration)||event.merchantGeneration<1||event.merchantGeneration>9999||
    !/^[A-Za-z0-9._-]{3,128}$/.test(event?.eventId||'')||typeof event.eventType!=='string')
    return reply(503,'worker_queue_shape_unverified')
   const worker=event.eventType==='PAYMENT.SALE.COMPLETED'?workers.sale:
    ['PAYMENT.SALE.REFUNDED','PAYMENT.SALE.REVERSED'].includes(event.eventType)?workers.refund:
    event.eventType.startsWith('BILLING.SUBSCRIPTION.')?workers.lifecycle:null
   if(!worker)return reply(503,'worker_event_not_supported')
   let result
   try{result=await worker({merchantGeneration:event.merchantGeneration,eventId:event.eventId})}
   catch{result={outcomeUnknown:true}}
   if(result?.outcomeUnknown===true){outcome='unknown';code='worker_event_outcome_unknown'}
   else if(['RECORDED','ALREADY_RECORDED'].includes(result?.state)&&result.leaseReleased===true){
    outcome='processed';code='worker_event_committed'
   }else if(result?.retryable===true||result?.state==='NOT_CLAIMED'){
    outcome='retry';code='worker_event_pending'
   }else{outcome='review';code='worker_event_requires_review'}
  }
  let completed=false
  try{completed=await complete({leaseToken:admitted.leaseToken,outcome,code,build:PAZO_LIVE_WORKER_BUILD,maintenanceAllowed:input.action==='drain'&&admitted.processingAllowed===true})===true}
  catch{/* The durable batch lease expires; never repeat the event here. */}
  if(!completed)return reply(503,'worker_completion_uncertain')
  return reply(200,code,{outcome,processed:outcome==='processed'?1:0,...(audit?{audit}:{})})
 }
}
