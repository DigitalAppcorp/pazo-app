// Read-only check of the PREEXISTING PayPal Sandbox webhook's destination.
// Never prints the registered callback URL or any credentials.
import { inspectCredentialFormat, safeOauthErrorCode } from '../src/features/supporter/testing/paypalSandboxCredentialDiagnostics.mjs'
import { inspectPazoWebhookDestination } from '../src/features/supporter/testing/paypalSandboxWebhookDestinationContract.mjs'

const BASE='https://api-m.sandbox.paypal.com'
const WEBHOOK_ID='6N7889790V1467139'

async function getJson(url, options, stage) {
  const response=await fetch(url,{...options,redirect:'error',signal:AbortSignal.timeout(12000)})
  if(!response.ok) {
    let code=null
    if(stage==='oauth_token' && response.status===401) {
      try { code=safeOauthErrorCode(await response.json()) } catch { /* no body */ }
    }
    throw new Error('HTTP '+response.status+(code?' ('+code+')':''))
  }
  return response.json()
}
async function main(){
  const clientId=process.env.PAYPAL_SANDBOX_CLIENT_ID
  const secret=process.env.PAYPAL_SANDBOX_CLIENT_SECRET
  const format=inspectCredentialFormat(clientId,secret)
  if(!format.ok) {
    console.error('BLOCKED: Sandbox credential format: '+format.reason)
    process.exitCode=2;return
  }
  let stage='oauth_token'
  try {
    const token=await getJson(BASE+'/v1/oauth2/token',{
      method:'POST',
      headers:{
        Authorization:'Basic '+Buffer.from(clientId+':'+secret,'utf8').toString('base64'),
        'Content-Type':'application/x-www-form-urlencoded',Accept:'application/json',
      },
      body:'grant_type=client_credentials',
    },stage)
    if(typeof token?.access_token!=='string' || token.token_type?.toLowerCase()!=='bearer')
      throw Error('invalid_token')
    stage='webhook_details'
    const details=await getJson(BASE+'/v1/notifications/webhooks/'+WEBHOOK_ID,{
      method:'GET',headers:{Authorization:'Bearer '+token.access_token,Accept:'application/json'},
    },stage)
    const result=inspectPazoWebhookDestination(details)
    console.log(JSON.stringify({environment:'sandbox',...result},null,2))
    if(!result.ok) process.exitCode=1
  } catch(err) {
    const message=err instanceof Error && /^HTTP [0-9]{3}(?: \((?:invalid_client|invalid_request|unauthorized_client|invalid_grant|unsupported_grant_type|temporarily_unavailable)\))?$/.test(err.message) ? err.message : 'request_failed'
    console.error('BLOCKED: PayPal Sandbox '+stage+' failed: '+message)
    process.exitCode=2
  }
}
await main()
