// P44 ONE-OWNER READ-ONLY merchant diagnostic. No payments, SQL changes, benefits.
import {createClient} from 'npm:@supabase/supabase-js@2.117.2'
import {createF16IntentStore} from './intentStoreAdapter.mjs'
import {createPazoCheckoutConsentStore} from './p06CheckoutConsentStore.mjs'
import {createPaypalSandboxSubscriptionReader} from './paypalSandboxTransactions.mjs'
import {compareF16SandboxSaleEvidence} from './f16SandboxSaleWebhookComparator.mjs'
const BASE='https://mrybvqdebbgcayuvgkkr.supabase.co'
const HOST='https://api-m.sandbox.paypal.com'
const PLAN='P-14V25407JP6850922NLHMDKI'
const EVENT='WH-71G04495S9899583S-37E09377DJ3836942'
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const INTENT=/^intent-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const SUB=/^I-[A-Za-z0-9_-]{3,70}$/
const REF=/^[A-Za-z0-9._-]{3,128}$/
const base={environment:'sandbox',phase:'REVIEW_REQUIRED',mayRecordPayment:false,
 mayGrantBenefits:false,mayCreatePaidPeriod:false,paidThrough:null,cycleVerified:false,
 refundsCoverageComplete:false,disputesCoverageComplete:false}
const reply=(status,code,origin=null,extra={})=>new Response(JSON.stringify({...base,code,...extra}),{
 status,headers:{'content-type':'application/json','cache-control':'no-store',
 'x-content-type-options':'nosniff',
 ...(origin?{'access-control-allow-origin':origin,'vary':'Origin'}:{})}})
const originOk=value=>{try{const u=new URL(value);return u.protocol==='https:'&&u.origin===value&&
 u.pathname==='/'&&!u.search&&!u.hash&&!u.username&&!u.password&&!u.port}catch{return false}}
async function sandboxGet(url,options){
 if(!url.startsWith(HOST+'/'))throw Error('wrong_host')
 const res=await fetch(url,{...options,redirect:'error',signal:AbortSignal.timeout(12000)})
 if(!res.ok)throw Error('provider_unavailable')
 const v=await res.json()
 if(!v||typeof v!=='object'||Array.isArray(v))throw Error('provider_invalid')
 return v
}
Deno.serve(async request=>{
 const origin=Deno.env.get('PAZO_F16_P06_QA_APP_ORIGIN')
 if(!originOk(origin))return reply(503,'qa_origin_unavailable')
 if(request.headers.get('origin')!==origin)return reply(403,'origin_denied')
 if(request.method==='OPTIONS'){
  const requested=(request.headers.get('access-control-request-headers')||'').split(',')
   .map(x=>x.trim().toLowerCase()).filter(Boolean)
  if(request.headers.get('access-control-request-method')!=='POST'||
   requested.some(x=>!['authorization','apikey','content-type'].includes(x)))
   return reply(403,'preflight_denied',origin)
  return new Response(null,{status:204,headers:{
   'access-control-allow-origin':origin,'vary':'Origin',
   'access-control-allow-methods':'POST',
   'access-control-allow-headers':'authorization, apikey, content-type',
   'cache-control':'no-store'}})
 }
 if(request.method!=='POST')return reply(405,'post_required',origin)
 if(request.headers.get('content-type')?.split(';')[0]!=='application/json')
  return reply(415,'json_required',origin)
 const authHeader=request.headers.get('authorization')||''
 const token=/^Bearer ([^\s]{20,8192})$/.exec(authHeader)?.[1]
 if(!token)return reply(401,'authentication_required',origin)
 let payload
 try{const s=await request.text();if(s.length>128)throw Error('size');payload=JSON.parse(s)}
 catch{return reply(400,'invalid_payload',origin)}
 if(!payload||typeof payload!=='object'||Array.isArray(payload)||
   Object.keys(payload).join(',')!=='action'||payload.action!=='review')
  return reply(400,'invalid_payload',origin)
 if(Deno.env.get('PAZO_F16_PAYPAL_ENV')!=='sandbox'||
  Deno.env.get('PAZO_F16_PAYPAL_PLAN_ID')!==PLAN||
  Deno.env.get('PAZO_F16_P06_QA_ENABLE')!=='true'||
  Deno.env.get('SUPABASE_URL')!==BASE||!REF.test(EVENT))
  return reply(503,'sandbox_configuration_unavailable',origin)
 const key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
 const cid=Deno.env.get('PAZO_F16_PAYPAL_CLIENT_ID')
 const secret=Deno.env.get('PAZO_F16_PAYPAL_CLIENT_SECRET')
 const expected=Deno.env.get('PAZO_F16_P06_QA_OWNER_ID')
 if(!key||!cid||!secret||!UUID.test(expected||''))
  return reply(503,'private_configuration_unavailable',origin)
 let owner
 try{const client=createClient(BASE,key,{auth:{persistSession:false,autoRefreshToken:false}})
  const {data,error}=await client.auth.getUser(token)
  if(error||!UUID.test(data?.user?.id||''))return reply(401,'authentication_required',origin)
  owner=data.user.id
 }catch{return reply(401,'authentication_required',origin)}
 if(owner.toLowerCase()!==expected.toLowerCase())return reply(403,'owner_not_allowed',origin)
 try{
  const res=await fetch(BASE+'/rest/v1/rpc/f16_p15_list_owner_supporter_intents',{
   method:'POST',redirect:'error',signal:AbortSignal.timeout(12000),
   headers:{apikey:key,Authorization:'Bearer '+key,'content-type':'application/json',
    Accept:'application/json'},body:JSON.stringify({p_owner_id:owner})})
  if(!res.ok)throw Error('private_list_failed')
  const intents=await res.json()
  if(!Array.isArray(intents)||intents.length!==1||intents[0]?.state!=='bound'||
   !INTENT.test(intents[0]?.intentId||''))
   return reply(200,'owner_binding_unproven',origin)
  const intentId=intents[0].intentId
  const store=createF16IntentStore({projectUrl:BASE,serviceRoleKey:key})
  const bound=await store.load(intentId)
  if(bound?.ownerId!==owner||bound?.state!=='bound'||bound?.planId!==PLAN||
   !SUB.test(bound?.externalSubscriptionId||''))
   return reply(200,'owner_binding_unproven',origin)
  const consent=createPazoCheckoutConsentStore({projectUrl:BASE,serviceRoleKey:key})
  const ack=await consent.readAcknowledgementForOwner({ownerId:owner,intentId})
  if(!ack||ack.ownerId!==owner||ack.intentId!==intentId||
    ack.priceMinor!==299||ack.currency!=='USD'||ack.cadence!=='MONTH_1')
   return reply(200,'consent_unproven',origin)
  const reader=createPaypalSandboxSubscriptionReader({clientId:cid,clientSecret:secret})
  const windowEnd=new Date().toISOString().replace(/\.\d{3}Z$/,'Z')
  if(Date.parse(windowEnd)<=Date.parse('2026-10-16T20:40:00Z')||
     Date.parse(windowEnd)>Date.parse('2026-10-17T00:00:00Z'))
   return reply(200,'diagnostic_window_expired',origin)
  const transactions=await reader.read({
   subscriptionId:bound.externalSubscriptionId,
   startTime:'2026-10-16T00:00:00Z',endTime:windowEnd})
  if(transactions.subscription.id!==bound.externalSubscriptionId||
   transactions.subscription.plan_id!==PLAN||transactions.subscription.custom_id!==intentId)
   return reply(200,'merchant_subscription_mismatch',origin)
  if(transactions.transactions.length!==1||
   transactions.transactions[0]?.status!=='COMPLETED'||
   transactions.transactions[0]?.amount_with_breakdown?.gross_amount?.currency_code!=='USD'||
   transactions.transactions[0]?.amount_with_breakdown?.gross_amount?.value!=='2.99')
   return reply(200,'transaction_inconclusive',origin)
  const oauth=await sandboxGet(HOST+'/v1/oauth2/token',{
   method:'POST',headers:{Authorization:'Basic '+btoa(cid+':'+secret),
    Accept:'application/json','content-type':'application/x-www-form-urlencoded'},
   body:'grant_type=client_credentials'})
  if(oauth.token_type?.toLowerCase()!=='bearer'||
   typeof oauth.access_token!=='string'||oauth.access_token.length<8)
   return reply(200,'sandbox_oauth_unavailable',origin)
  const hdr={Authorization:'Bearer '+oauth.access_token,Accept:'application/json'}
  const event=await sandboxGet(HOST+'/v1/notifications/webhooks-events/'+encodeURIComponent(EVENT),{
   method:'GET',headers:hdr})
  const comparison=compareF16SandboxSaleEvidence({
   subscription:transactions.subscription,transaction:transactions.transactions[0],
   event,inboxEventId:EVENT})
  if(comparison.phase!=='MATCH')return reply(200,'sale_event_mismatch_or_unproven',origin)
  const saleId=event.resource?.id
  if(!REF.test(saleId||''))return reply(200,'sale_reference_unproven',origin)
  const sale=await sandboxGet(HOST+'/v1/payments/sale/'+encodeURIComponent(saleId),{
    method:'GET',headers:hdr})
  if(sale.id!==saleId||sale.billing_agreement_id!==bound.externalSubscriptionId||
   !['COMPLETED','completed'].includes(sale.state)||
   sale.amount?.currency!=='USD'||sale.amount?.total!=='2.99')
   return reply(200,'independent_sale_mismatch',origin)
  return reply(200,transactions.paginationMetadataComplete?
   'merchant_refs_correlated_review_only':'merchant_refs_correlated_pagination_incomplete',origin,{
   merchantSaleCorrelated:true,merchantEventMatches:true,
   transactionHistoryCorrelated:transactions.paginationMetadataComplete})
 }catch{return reply(200,'merchant_or_private_reader_unavailable',origin)}
})
