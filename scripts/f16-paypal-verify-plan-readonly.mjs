// Read-only preflight for an EXISTING PayPal Sandbox plan. NO production API,
// writes, plan creation, webhook creation, or membership activation.
// Requires credentials only in local process environment; never prints them.
import { assessPazoSandboxPlan, PAZO_SANDBOX_PLAN_ID } from '../src/features/supporter/testing/paypalSandboxPlanContract.mjs'

const HOST='https://api-m.sandbox.paypal.com'
async function getJson(url,options) {
  const response=await fetch(url,{...options,redirect:'error',signal:AbortSignal.timeout(12000)})
  if (!response.ok) throw new Error('PayPal Sandbox returned HTTP '+response.status)
  return response.json()
}
async function main() {
  const id=process.env.PAYPAL_SANDBOX_CLIENT_ID
  const secret=process.env.PAYPAL_SANDBOX_CLIENT_SECRET
  if (!id || !secret) {
    console.error('BLOCKED: configure PAYPAL_SANDBOX_CLIENT_ID and PAYPAL_SANDBOX_CLIENT_SECRET securely in your local environment. Do NOT paste them into a chat, a git file, or a console screenshot.')
    process.exitCode=2;return
  }
  try {
    const basic=Buffer.from(id+':'+secret,'utf8').toString('base64')
    const token=await getJson(HOST+'/v1/oauth2/token',{
      method:'POST',
      headers:{Authorization:'Basic '+basic,'Content-Type':'application/x-www-form-urlencoded','Accept':'application/json'},
      body:'grant_type=client_credentials',
    })
    if (!token || token.token_type?.toLowerCase()!=='bearer' || typeof token.access_token!=='string')
      throw new Error('Sandbox OAuth token not available')
    const plan=await getJson(HOST+'/v1/billing/plans/'+encodeURIComponent(PAZO_SANDBOX_PLAN_ID),{
      method:'GET',headers:{Authorization:'Bearer '+token.access_token,Accept:'application/json'},
    })
    const result=assessPazoSandboxPlan(plan)
    console.log(JSON.stringify({environment:'sandbox',...result},null,2))
    if (!result.ok || result.warnings.length) process.exitCode=1
  } catch (err) {
    // Never log PayPal response bodies, request headers, credentials, tokens, or stack traces.
    console.error('BLOCKED: read-only PayPal Sandbox check failed: '+(err instanceof Error?err.message:'unknown error'))
    process.exitCode=2
  }
}
await main()
