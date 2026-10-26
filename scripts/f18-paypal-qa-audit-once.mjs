// F18 private operator probe. Calls ONLY the existing qa_audit action.
// Authentication remains in the privileged worker; no PayPal credential or
// invoker may be supplied on argv or copied to the output.
import {pathToFileURL} from 'node:url'

const ENDPOINT='https://mrybvqdebbgcayuvgkkr.supabase.co/functions/v1/pazo-paypal-live-worker'
const INVOKER=/^[a-f0-9]{64}$/
const ERROR_NAMES=new Set(['RESOURCE_NOT_FOUND','NOT_AUTHORIZED','PERMISSION_DENIED',
 'INVALID_RESOURCE_ID','AUTHENTICATION_FAILURE','INTERNAL_SERVER_ERROR',
 'UNPROCESSABLE_ENTITY','INVALID_REQUEST'])
const FAILURE_STAGES=new Set(['network','http','content_type','body','json','object'])
const STATUS=new Set([400,401,403,404,409,422,429,500,502,503,504])
const QA_CODE=/^qa_[a-z_]{3,100}$/
const compact=(code,more={})=>Object.freeze({invocationSucceeded:false,code,...more})
const tri=value=>value===true?true:value===false?false:null
const finiteCount=n=>Number.isSafeInteger(n)&&n>=0&&n<=500?n:null

export async function runPazoF18PrivateQaAuditOnce({invoker,fetchImpl=fetch}={}){
 if(typeof invoker!=='string'||!INVOKER.test(invoker))
  return compact('private_invoker_not_available')
 if(typeof fetchImpl!=='function')return compact('transport_not_available')
 let response
 try{
  response=await fetchImpl(ENDPOINT,{
   method:'POST',redirect:'error',cache:'no-store',signal:AbortSignal.timeout(20000),
   headers:{authorization:'Bearer '+invoker,'content-type':'application/json'},
   body:'{"action":"qa_audit"}'
  })
 }catch{return compact('transport_unavailable')}
 if(response?.status!==200||response?.ok!==true)
  return compact('private_worker_response_unavailable',{
   httpStatus:Number.isSafeInteger(response?.status)?response.status:null
  })
 let result
 try{
  const raw=await response.text()
  if(typeof raw!=='string'||raw.length>8192)return compact('response_too_large')
  result=JSON.parse(raw)
 }catch{return compact('response_invalid')}
 // An "enabled=false", "busy" or malformed result is NOT an audit.
 if(result?.ok!==true||result.code!=='worker_qa_audit_read'||
  result.processed!==0||!result.audit||result.audit.source!=='original_qa_provider_audit_v1')
  return compact('audit_not_executed')
 const audit=result.audit
 // Strict allowlist: excludes URLs, webhook IDs, owner/payer details,
 // subscription IDs, PayPal debug IDs, credentials and provider payloads.
 return Object.freeze({
  invocationSucceeded:true,code:'private_qa_audit_read',
  evidenceComplete:tri(audit.complete),
  auditCode:typeof audit.code==='string'&&QA_CODE.test(audit.code)?audit.code:null,
  planVerified:tri(audit.planVerified),
  originalPlanVerified:tri(audit.originalPlanVerified),
  bindingVerified:tri(audit.bindingVerified),
  originalGenerationVerified:tri(audit.originalGenerationVerified),
  eventReadable:tri(audit.eventReadable),
  signedEventMatches:tri(audit.signedEventMatches),
  providerStatus:new Set(['APPROVAL_PENDING','APPROVED','ACTIVE','SUSPENDED',
   'CANCELLED','EXPIRED']).has(audit.status)?audit.status:null,
  providerHttpStatus:STATUS.has(audit.providerHttpStatus)?audit.providerHttpStatus:null,
  providerErrorName:ERROR_NAMES.has(audit.providerErrorName)?audit.providerErrorName:null,
  providerFailure:FAILURE_STAGES.has(audit.providerFailure)?audit.providerFailure:null,
  transactionsComplete:tri(audit.transactionsComplete),
  transactionCount:finiteCount(audit.transactionCount),
  completedPayments:finiteCount(audit.completedPayments),
  mayCreate:false,mayCancel:false,mayGrantBenefits:false
 })
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const authorized=process.env.PAZO_F18_QA_AUDIT_ONCE==='AUTHORIZED'&&process.argv.length===2
 const result=authorized
  ?await runPazoF18PrivateQaAuditOnce({invoker:process.env.PAZO_F18_WORKER_INVOKER})
  :compact('operator_confirmation_required')
 process.stdout.write(JSON.stringify(result,null,2)+'\n')
 process.exitCode=result.invocationSucceeded===true?0:2
}
