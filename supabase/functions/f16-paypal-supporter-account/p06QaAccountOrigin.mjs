// QA-origin access extends the existing account endpoint without changing its global origin.
import {isP06SandboxQaAuthorized} from '../f16-paypal-supporter/p06SandboxQaGate.mjs'
export function selectP06AccountOrigin({request,getEnv}){
 const globalOrigin=getEnv('PAZO_F16_APP_ORIGIN')
 const qaOrigin=getEnv('PAZO_F16_P06_QA_APP_ORIGIN')
 const qaOnly=typeof qaOrigin==='string'&&qaOrigin!==globalOrigin&&
   request.headers.get('origin')===qaOrigin
 return {configuredOrigin:qaOnly?qaOrigin:globalOrigin,qaOnly}
}
export function createP06QaAccountOwnerResolver({resolveOwner,qaOnly,getEnv}){
 return async request=>{
  const owner=await resolveOwner(request)
  if(qaOnly&&!isP06SandboxQaAuthorized({getEnv,verifiedOwnerId:owner}))return null
  return owner
 }
}
