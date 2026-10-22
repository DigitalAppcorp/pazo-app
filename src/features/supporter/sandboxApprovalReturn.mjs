// F16 Sandbox: short-lived return-to-checkout link, per Auth owner and intent.
// This does not create, approve, pay, or record a PayPal subscription.
// Browser session only; never persist a PayPal approval token long-term.
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const INTENT=/^intent-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const TTL_MS=30*60*1000
const KEY='pazo-f16-sandbox-approval:v1:'
function safeUrl(raw){
 if(typeof raw!=='string'||raw.length>2048)return false
 try {
  const u=new URL(raw)
  return u.protocol==='https:'&&
   ['sandbox.paypal.com','www.sandbox.paypal.com'].includes(u.hostname)&&
   !u.username&&!u.password&&!u.port&&!u.hash&&u.toString()===raw&&
   u.pathname.startsWith('/webapps/billing/subscriptions')&&
   /^BA-[A-Za-z0-9_-]{6,128}$/.test(u.searchParams.get('ba_token')||'')&&
   [...u.searchParams.keys()].every(k=>k==='ba_token')
 }catch{return false}
}
function sessionStorageOrNull(){
 try{return typeof window==='undefined'?null:window.sessionStorage}catch{return null}
}
export function saveSandboxApproval({ownerId,intentId,approvalUrl,now=Date.now(),
 storage=sessionStorageOrNull()}={}){
 if(!UUID.test(ownerId||'')||!INTENT.test(intentId||'')||
  !safeUrl(approvalUrl)||!Number.isFinite(now)||!storage)return false
 try{storage.setItem(KEY+ownerId,JSON.stringify({intentId,url:approvalUrl,createdAt:now}));return true}
 catch{return false}
}
export function readSandboxApproval({ownerId,intentId,now=Date.now(),
 storage=sessionStorageOrNull()}={}){
 if(!UUID.test(ownerId||'')||!INTENT.test(intentId||'')||!storage)return null
 try{
  const raw=storage.getItem(KEY+ownerId)
  if(!raw)return null
  const record=JSON.parse(raw)
  if(!record||record.intentId!==intentId||!safeUrl(record.url)||
   !Number.isFinite(record.createdAt)||
   !Number.isFinite(now)||now<record.createdAt||
   now-record.createdAt>TTL_MS){
   storage.removeItem(KEY+ownerId);return null
  }
  return record.url
 }catch{try{storage.removeItem(KEY+ownerId)}catch{}return null}
}
export function clearSandboxApproval({ownerId,storage=sessionStorageOrNull()}={}){
 if(!UUID.test(ownerId||'')||!storage)return
 try{storage.removeItem(KEY+ownerId)}catch{}
}
