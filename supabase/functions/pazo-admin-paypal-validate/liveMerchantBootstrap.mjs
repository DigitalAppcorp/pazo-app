// PAZO F16 - merchant resource bootstrap for future admin "Guardar y activar".
// Server-only dependency; NOT imported by any deployed handler.
// Provider writes must be preceded by a durable SQL generation/attempt claim.
// This adapter never changes runtime mode, starts checkout or gives benefits.
import {EXPECTED_WEBHOOK,REQUIRED_EVENTS} from './liveProviderReadOnly.mjs'
const HOST='https://api-m.paypal.com'
const ID=/^[A-Za-z0-9_-]{20,512}$/
const PRODUCT=/^PROD-[A-Z0-9]{10,32}$/
const PLAN=/^P-[A-Z0-9]{12,40}$/
const WEBHOOK=/^[A-Za-z0-9_-]{8,100}$/
const REQUEST_ID=/^[A-Za-z0-9_-]{8,120}$/
const reject=()=>{throw Error('paypal_live_resource_review_required')}
function jsonObject(value){return !!value&&typeof value==='object'&&!Array.isArray(value)}
export function createPaypalLiveMerchantBootstrap({clientId,clientSecret,fetchImpl=fetch}={}){
 if(!ID.test(clientId||'')||!ID.test(clientSecret||'')||
    typeof fetchImpl!=='function')throw Error('paypal_live_credentials_not_ready')
 const request=async(path,options)=>{
  let response
  try{response=await fetchImpl(HOST+path,{
   ...options,cache:'no-store',redirect:'error',signal:AbortSignal.timeout(12000)
  })}catch{reject()}
  if(!response||![200,201,204].includes(response.status))reject()
  if(response.status===204)return null
  let body
  try{body=await response.json()}catch{reject()}
  if(!jsonObject(body))reject()
  return body
 }
 async function oauth(){
  const body=await request('/v1/oauth2/token',{
   method:'POST',headers:{Authorization:'Basic '+btoa(clientId+':'+clientSecret),
    'content-type':'application/x-www-form-urlencoded',Accept:'application/json'},
   body:'grant_type=client_credentials'
  })
  if(body?.token_type?.toLowerCase()!=='bearer'||
    typeof body.access_token!=='string'||body.access_token.length<8||
    !/^[\x21-\x7e]+$/.test(body.access_token))reject()
  return body.access_token
 }
 const headers=token=>({Authorization:'Bearer '+token,Accept:'application/json'})
 const post=async(path,body,requestId)=>{
  if(!REQUEST_ID.test(requestId||''))reject()
  const token=await oauth()
  // If the provider write times out or responds ambiguously: caller MUST
  // persist manual_review and inspect merchant inventory, NEVER blind retry.
  return request(path,{method:'POST',
   headers:{...headers(token),'content-type':'application/json','PayPal-Request-Id':requestId},
   body:JSON.stringify(body)})
 }
 return Object.freeze({
  async createProduct({requestId}={}){
   const v=await post('/v1/catalogs/products',{
    name:'Amigo de PAZO',type:'SERVICE',
    description:'Aportacion mensual voluntaria para apoyar PAZO'
   },requestId)
   if(!PRODUCT.test(v?.id||''))reject()
   return Object.freeze({productId:v.id,mayCharge:false})
  },
  async createPlan({productId,requestId}={}){
   if(!PRODUCT.test(productId||''))reject()
   const v=await post('/v1/billing/plans',{
    product_id:productId,name:'Amigo de PAZO - mensual',
    description:'Apoyo voluntario mensual a PAZO',
    billing_cycles:[{frequency:{interval_unit:'MONTH',interval_count:1},
     tenure_type:'REGULAR',sequence:1,total_cycles:0,
     pricing_scheme:{fixed_price:{value:'2.99',currency_code:'USD'}}}],
    payment_preferences:{auto_bill_outstanding:false,
     setup_fee:{value:'0.00',currency_code:'USD'},
     setup_fee_failure_action:'CONTINUE',payment_failure_threshold:1}
   },requestId)
   if(!PLAN.test(v?.id||''))reject()
   return Object.freeze({planId:v.id,mayCharge:false})
  },
  async activatePlan({planId,requestId}={}){
   if(!PLAN.test(planId||''))reject()
   await post('/v1/billing/plans/'+encodeURIComponent(planId)+'/activate',{},requestId)
   // HTTP ACK is not readiness; caller must independently GET/validate plan.
   return Object.freeze({planId,activationRequestAcknowledged:true,mayCharge:false})
  },
  async createWebhook({requestId}={}){
   const v=await post('/v1/notifications/webhooks',{
    url:EXPECTED_WEBHOOK,event_types:REQUIRED_EVENTS.map(name=>({name}))
   },requestId)
   if(!WEBHOOK.test(v?.id||''))reject()
   return Object.freeze({webhookId:v.id,mayCharge:false})
  }
 })
}
