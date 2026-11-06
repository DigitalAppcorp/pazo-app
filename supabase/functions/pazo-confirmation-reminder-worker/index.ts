// Private scheduler endpoint. The one-time database dispatch token is consumed
// before any account is leased. No email or Auth response is written to logs.
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import {createConfirmationReminderWorker} from './workerCore.mjs'

const url=Deno.env.get('SUPABASE_URL')!
const serviceKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const rpc=async(name:string,args:Record<string,unknown>={})=>{
  const response=await fetch(`${url}/rest/v1/rpc/${name}`,{
    method:'POST',redirect:'error',signal:AbortSignal.timeout(6000),
    headers:{apikey:serviceKey,authorization:'Bearer '+serviceKey,'content-type':'application/json'},
    body:JSON.stringify(args),
  })
  if(!response.ok)throw new Error('rpc '+name+' '+response.status)
  const text=await response.text()
  return text?JSON.parse(text):null
}

const sendResend=async(email:string)=>{
  const response=await fetch(`${url}/auth/v1/resend`,{
    method:'POST',redirect:'error',signal:AbortSignal.timeout(12000),
    headers:{apikey:serviceKey,authorization:'Bearer '+serviceKey,'content-type':'application/json'},
    body:JSON.stringify({type:'signup',email}),
  })
  await response.body?.cancel?.()
  return response.ok
}

Deno.serve(createConfirmationReminderWorker({rpc,sendResend}))
