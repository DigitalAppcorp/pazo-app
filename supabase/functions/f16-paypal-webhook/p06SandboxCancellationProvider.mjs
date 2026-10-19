// PAZO F16 — Sandbox subscription cancellation against the actual PayPal API.
// SERVER ONLY. No entrypoint imports this until separately reviewed/released.
// Never accepts merchant URLs, subscription IDs, amounts, or payer from browser.
const HOST='https://api-m.sandbox.paypal.com'
const PLAN='P-14V25407JP6850922NLHMDKI'
const INTENT=/^intent-([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i
const SUB=/^I-[A-Za-z0-9_-]{3,70}$/
const secret=x=>typeof x==='string'&&/^[\x21-\x7e]{8,512}$/.test(x)
const err=(s)=>{throw Error(s)}
export function createPazoSandboxCancellationProvider({
  clientId,clientSecret,fetchImpl=fetch,
  waitImpl=ms=>new Promise(resolve=>setTimeout(resolve,ms)),
}={}){
  if(!secret(clientId)||clientId.includes(':')||!secret(clientSecret)||
    typeof fetchImpl!=='function'||typeof waitImpl!=='function')err('pazo_cancel_provider_not_configured')
  async function send(url,opts,expectNoBody=false,stage='general'){
    let r
    try {r=await fetchImpl(url,{...opts,redirect:'error',
      signal:AbortSignal.timeout(12000)})}
    catch {err(stage==='general'?'pazo_cancel_paypal_transport_unavailable':
      'pazo_cancel_'+stage+'_transport')}
    if(!r?.ok){
      if(stage==='general')err('pazo_cancel_paypal_unavailable')
      const code=[400,401,403,404,422,429,500,503].includes(r?.status)
       ?String(r.status):'other'
      // Fixed HTTP category only. Never forward PayPal's response body,
      // debug ID, payment link, PII or merchant token.
      err('pazo_cancel_'+stage+'_http_'+code)
    }
    if(expectNoBody)return null
    try{
      const d=await r.json()
      if(!d||typeof d!=='object'||Array.isArray(d))
        err('pazo_cancel_invalid_provider_response')
      return d
    }catch {err('pazo_cancel_invalid_provider_response')}
  }
  async function headers(){
    const x=await send(HOST+'/v1/oauth2/token',{
      method:'POST',headers:{Authorization:'Basic '+btoa(clientId+':'+clientSecret),
        'Content-Type':'application/x-www-form-urlencoded',
        Accept:'application/json'},body:'grant_type=client_credentials',
    })
    if(x.token_type?.toLowerCase()!=='bearer'||!secret(x.access_token))
      err('pazo_cancel_paypal_oauth_unavailable')
    return {Authorization:'Bearer '+x.access_token,Accept:'application/json'}
  }
  async function read({intentId,subscriptionId},stage='general'){
    if(!INTENT.test(intentId||'')||!SUB.test(subscriptionId||''))
      err('pazo_cancel_private_binding_invalid')
    const auth=await headers()
    const sub=await send(HOST+'/v1/billing/subscriptions/'+encodeURIComponent(subscriptionId),
      {method:'GET',headers:auth},false,stage)
    if(sub.id!==subscriptionId||sub.plan_id!==PLAN||sub.custom_id!==intentId||
      !['ACTIVE','CANCELLED','SUSPENDED','APPROVED',
        'APPROVAL_PENDING','EXPIRED'].includes(sub.status))
      err('pazo_cancel_subscription_mismatch')
    // No subscriber details or provider links in result.
    return Object.freeze({status:sub.status,subscriptionId:sub.id})
  }
  return Object.freeze({
    read,
    // Only for explicit user abandonment of an unapproved Sandbox checkout.
    // A cancelled/active/approved/unknown subscription is NEVER mutated here.
    // 204 is not proof of cancellation: exact-owner merchant GET must confirm it.
    async cancelPending({intentId,subscriptionId}={}){
      const match=INTENT.exec(intentId||'')
      if(!match||!SUB.test(subscriptionId||''))
        err('pazo_cancel_private_binding_invalid')
      const current=await read({intentId,subscriptionId},'before')
      if(current.status!=='APPROVAL_PENDING')
        err('pazo_cancel_pending_status_unverified')
      const auth=await headers()
      await send(HOST+'/v1/billing/subscriptions/'+encodeURIComponent(subscriptionId)+'/cancel',{
        method:'POST',headers:{...auth,'Content-Type':'application/json',
          // Max 38 chars. Stable per original consent, so a transport retry
          // never creates a second cancel action. Previous ID was 56 chars,
          // which PayPal may reject as an invalid resource.
          'PayPal-Request-Id':'pc'+match[1]},
        body:JSON.stringify({reason:'Buyer abandoned unapproved checkout in PAZO Sandbox'}),
      },true,'post')
      // PayPal may return HTTP 204 before its subsequent GET reflects the
      // terminal state. Recheck GET with bounded delay, never repeat POST.
      for(let check=0;check<3;check++){
        if(check>0)await waitImpl(check===1?350:750)
        const final=await read({intentId,subscriptionId},'after')
        if(final.status==='CANCELLED')
          return Object.freeze({status:'CANCELLED'})
        if(final.status!=='APPROVAL_PENDING')
          err('pazo_cancel_post_status_changed')
      }
      err('pazo_cancel_confirmation_pending')
    },
    async cancel({intentId,subscriptionId}={}){
      const match=INTENT.exec(intentId||'')
      if(!match||!SUB.test(subscriptionId||''))
        err('pazo_cancel_private_binding_invalid')
      const current=await read({intentId,subscriptionId})
      if(current.status==='CANCELLED')return Object.freeze({status:'CANCELLED'})
      // Do not make a second PayPal mutation on an ambiguous state.
      if(!['ACTIVE','SUSPENDED'].includes(current.status))
        err('pazo_cancel_not_cancellable_in_current_state')
      const auth=await headers()
      await send(HOST+'/v1/billing/subscriptions/'+encodeURIComponent(subscriptionId)+'/cancel',{
        method:'POST',headers:{...auth,'Content-Type':'application/json',
          'PayPal-Request-Id':'pazo-cancel-'+match[1]},
        body:JSON.stringify({reason:'Cancelled by the account holder'}),
      },true)
      // PayPal 204 alone is insufficient: an immediate GET must prove status.
      const final=await read({intentId,subscriptionId})
      if(final.status!=='CANCELLED')err('pazo_cancel_confirmation_pending')
      return Object.freeze({status:'CANCELLED'})
    },
  })
}
