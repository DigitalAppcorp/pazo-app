// Web Push worker. No user can reach it: the gateway is open only because the
// scheduler's single-use token is not a JWT; workerCore verifies that token.
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import {createPushWorker} from './workerCore.mjs'

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
Deno.serve(createPushWorker({rpc,subject:'mailto:appdigital.corp@gmail.com'}))
