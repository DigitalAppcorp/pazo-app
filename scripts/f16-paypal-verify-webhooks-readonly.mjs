// Read-only F16 PayPal Sandbox webhook preflight. No creates/updates/deletes,
// checkout, subscription activation, callbacks, or entitlement changes.
// Secrets are read exclusively from process environment and NEVER printed.
import { inspectCredentialFormat, safeOauthErrorCode } from '../src/features/supporter/testing/paypalSandboxCredentialDiagnostics.mjs'
import { assessPazoSandboxWebhooks } from '../src/features/supporter/testing/paypalSandboxWebhookContract.mjs'

const HOST='https://api-m.sandbox.paypal.com'
async function requestJson(url, options, stage) {
  const response=await fetch(url,{...options,redirect:'error',signal:AbortSignal.timeout(12000)})
  if(!response.ok){
    let code=null
    if(stage==='oauth_token' && response.status===401) {
      try {code=safeOauthErrorCode(await response.json())} catch { /* no body */ }
    }
    throw new Error('HTTP '+response.status+(code?' ('+code+')':''))
  }
  return response.json()
}
async function main() {
  const id=process.env.PAYPAL_SANDBOX_CLIENT_ID
  const secret=process.env.PAYPAL_SANDBOX_CLIENT_SECRET
  const format=inspectCredentialFormat(id,secret)
  if(!format.ok){
    console.error('BLOCKED: local Sandbox credentials format check: '+format.reason)
    process.exitCode=2;return
  }
  let stage='oauth_token'
  try {
    const basic=Buffer.from(id+':'+secret,'utf8').toString('base64')
    const token=await requestJson(HOST+'/v1/oauth2/token',{
      method:'POST',
      headers:{Authorization:'Basic '+basic,'Accept':'application/json','Content-Type':'application/x-www-form-urlencoded'},
      body:'grant_type=client_credentials',
    },stage)
    if(token?.token_type?.toLowerCase()!=='bearer' || typeof token.access_token!=='string')
      throw new Error('invalid_token')
    stage='webhooks_list'
    const response=await requestJson(HOST+'/v1/notifications/webhooks',{
      method:'GET',headers:{Authorization:'Bearer '+token.access_token,'Accept':'application/json'},
    },stage)
    const result=assessPazoSandboxWebhooks(response)
    console.log(JSON.stringify({environment:'sandbox',...result},null,2))
    // Complete event subscriptions are necessary but NOT evidence of reachable endpoints.
    if(!result.ok) process.exitCode=1
  } catch (err) {
    const msg=err instanceof Error && /^HTTP [0-9]{3}(?: \((?:invalid_client|invalid_request|unauthorized_client|invalid_grant|unsupported_grant_type|temporarily_unavailable)\))?$/.test(err.message) ? err.message : 'request_failed'
    console.error('BLOCKED: PayPal Sandbox '+stage+' failed: '+msg)
    process.exitCode=2
  }
}
await main()
