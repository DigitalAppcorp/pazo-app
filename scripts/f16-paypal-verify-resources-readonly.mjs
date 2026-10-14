// F16 one-shot, read-only audit of the EXISTING PayPal Sandbox plan + webhook.
// Run locally with credentials prompted by the PowerShell wrapper. Never log payloads.
import {inspectCredentialFormat,safeOauthErrorCode} from '../src/features/supporter/testing/paypalSandboxCredentialDiagnostics.mjs'
import {PAZO_SANDBOX_PLAN_ID} from '../src/features/supporter/testing/paypalSandboxPlanContract.mjs'
import {PAZO_SANDBOX_WEBHOOK_ID} from '../src/features/supporter/testing/paypalSandboxWebhookDestinationContract.mjs'
import {assessF16SandboxResources} from '../src/features/supporter/testing/paypalSandboxResourceContract.mjs'

const HOST='https://api-m.sandbox.paypal.com'
async function readJson(path,opts,stage) {
  const res=await fetch(HOST+path,{...opts,redirect:'error',signal:AbortSignal.timeout(12000)})
  if(!res.ok){
    let error=null
    if(stage==='oauth_token'&&res.status===401){
      try{error=safeOauthErrorCode(await res.json())}catch{/* no body */}
    }
    throw new Error('HTTP '+res.status+(error?' ('+error+')':''))
  }
  return res.json()
}
async function main(){
  const id=process.env.PAYPAL_SANDBOX_CLIENT_ID
  const secret=process.env.PAYPAL_SANDBOX_CLIENT_SECRET
  const check=inspectCredentialFormat(id,secret)
  if(!check.ok){
    console.error('BLOCKED: Sandbox credential format: '+check.reason)
    process.exitCode=2
    return
  }
  let stage='oauth_token'
  try{
    const token=await readJson('/v1/oauth2/token',{
      method:'POST',
      headers:{Authorization:'Basic '+Buffer.from(id+':'+secret,'utf8').toString('base64'),
        Accept:'application/json','Content-Type':'application/x-www-form-urlencoded'},
      body:'grant_type=client_credentials',
    },stage)
    if(token?.token_type?.toLowerCase()!=='bearer'||typeof token.access_token!=='string'||!token.access_token)
      throw Error('invalid_token')
    const bearer={Authorization:'Bearer '+token.access_token,Accept:'application/json'}
    stage='plan_lookup'
    const plan=await readJson('/v1/billing/plans/'+PAZO_SANDBOX_PLAN_ID,
      {method:'GET',headers:bearer},stage)
    stage='webhook_lookup'
    const webhook=await readJson('/v1/notifications/webhooks/'+PAZO_SANDBOX_WEBHOOK_ID,
      {method:'GET',headers:bearer},stage)
    // Authenticated PayPal catalogue supplies only public, documented event names.
    // Optional failure must never block this resource read-only check or print
    // provider errors. No raw webhook URL or unknown event labels are emitted.
    let catalog=null
    try {
      catalog=await readJson('/v1/notifications/webhooks-event-types',
        {method:'GET',headers:bearer},'catalog_lookup')
    } catch { /* catalogStatus becomes unavailable; no raw names shown */ }
    const result=assessF16SandboxResources(plan,webhook,catalog)
    console.log(JSON.stringify(result,null,2))
    // A valid 0 only proves read access to both existing resources by these credentials.
    if(!result.resourcesAccessible||result.plan.warnings.length)process.exitCode=1
  }catch(err){
    const message=err instanceof Error &&
      /^HTTP [0-9]{3}(?: \((?:invalid_client|invalid_request|unauthorized_client|invalid_grant|unsupported_grant_type|temporarily_unavailable)\))?$/.test(err.message) ?
      err.message:'request_failed'
    console.error('BLOCKED: PayPal Sandbox '+stage+' failed: '+message)
    process.exitCode=2
  }
}
await main()
