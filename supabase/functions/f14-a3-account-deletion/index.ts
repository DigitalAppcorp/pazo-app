// F14 A3 — REVIEW-ONLY Edge entrypoint. NEVER deploy without a separate PO gate.
// Default disabled. Does not delete users, files, posts or Auth sessions.
import { createClient } from 'npm:@supabase/supabase-js@2.117.2'
import { makeA3InternalReviewHandler } from './http.ts'
import { createA3ReviewPort, type A3ServerRpc } from './adapter.ts'

const url=Deno.env.get('SUPABASE_URL')??''
const key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')??''
const invokeSecret=Deno.env.get('PAZO_A3_REVIEW_INVOKE_SECRET')??''
const enabled=Deno.env.get('PAZO_A3_REVIEW_WORKER_ENABLED')==='true'
  && url.startsWith('https://') && key.length>0 && invokeSecret.length>=32

const handler=makeA3InternalReviewHandler({
  enabled,
  invokeSecret,
  makePort:()=>{
    if(!enabled) throw new Error('Worker not enabled')
    const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}})
    // No gate providers registered: any review call fails closed until each
    // real backend verifier is developed and independently approved.
    return createA3ReviewPort(db as unknown as A3ServerRpc)
  },
})

Deno.serve(handler)
