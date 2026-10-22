// Read-only preflight for an EXISTING PayPal Sandbox plan. NO production API,
// writes, plan creation, webhook creation, or membership activation.
// Requires credentials only in local process environment; never prints them.
import { assessPazoSandboxPlan, PAZO_SANDBOX_PLAN_ID } from '../src/features/supporter/testing/paypalSandboxPlanContract.mjs'
import { inspectCredentialFormat, safeOauthErrorCode } from '../src/features/supporter/testing/paypalSandboxCredentialDiagnostics.mjs'

const HOST='https://api-m.sandbox.paypal.com'
async function getJson(url,options,stage) {
  const response=await fetch(url,{...options,redirect:'error',signal:AbortSignal.timeout(12000)})
  if (!response.ok) {
    let code = null
    if (stage === 'oauth_token' && response.status === 401) {
      // PayPal may return invalid_client; only allowlist the error code.
      try { code = safeOauthErrorCode(await response.json()) } catch { /* no body */ }
    }
    throw new Error('HTTP '+response.status+(code ? ' ('+code+')' : ''))
  }
  return response.json()
}
async function main() {
  const id=process.env.PAYPAL_SANDBOX_CLIENT_ID
  const secret=process.env.PAYPAL_SANDBOX_CLIENT_SECRET
  if (!id || !secret) {
    console.error('BLOCKED: configure PAYPAL_SANDBOX_CLIENT_ID and PAYPAL_SANDBOX_CLIENT_SECRET securely in your local environment. Do NOT paste them into a chat, a git file, or a console screenshot.')
    process.exitCode=2;return
  }
  const format=inspectCredentialFormat(id,secret)
  if (!format.ok) {
    console.error('BLOCKED: local credential format check failed: '+format.reason)
    console.error('CHECK: paste the Client ID and Secret without leading/trailing spaces, line breaks or labels. Secrets are not displayed.')
    process.exitCode=2;return
  }
  let stage='oauth_token'
  try {
    const basic=Buffer.from(id+':'+secret,'utf8').toString('base64')
    const token=await getJson(HOST+'/v1/oauth2/token',{
      method:'POST',
      headers:{Authorization:'Basic '+basic,'Content-Type':'application/x-www-form-urlencoded','Accept':'application/json'},
      body:'grant_type=client_credentials',
    },stage)
    if (!token || token.token_type?.toLowerCase()!=='bearer' || typeof token.access_token!=='string')
      throw new Error('Sandbox OAuth token not available')
    stage='plan_lookup'
    const plan=await getJson(HOST+'/v1/billing/plans/'+encodeURIComponent(PAZO_SANDBOX_PLAN_ID),{
      method:'GET',headers:{Authorization:'Bearer '+token.access_token,Accept:'application/json'},
    },stage)
    const result=assessPazoSandboxPlan(plan)
    console.log(JSON.stringify({environment:'sandbox',...result},null,2))
    if (!result.ok || result.warnings.length) process.exitCode=1
  } catch (err) {
    // Never log PayPal response bodies, request headers, credentials, tokens, or stack traces.
    const msg=err instanceof Error && /^HTTP [0-9]{3}(?: \((?:invalid_client|invalid_request|unauthorized_client|invalid_grant|unsupported_grant_type|temporarily_unavailable)\))?$/.test(err.message) ? err.message : 'request_failed'
    console.error('BLOCKED: PayPal Sandbox '+stage+' failed: '+msg)
    if (msg.startsWith('HTTP 401') && stage==='oauth_token') console.error('CHECK: Sandbox Client ID and Client Secret must be from the SAME Sandbox REST app (not Live, merchant password, or account login).')
    if (msg.startsWith('HTTP 401') && stage==='plan_lookup') console.error('CHECK: OAuth passed. Inspect the REST app permissions and whether this plan belongs to this Sandbox merchant/app; do not replace the plan automatically.')
    process.exitCode=2
  }
}
await main()
