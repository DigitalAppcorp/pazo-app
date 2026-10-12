import { createClient } from 'npm:@supabase/supabase-js@2.117.2'
import { resolvePurgeObject } from '../f14-moderation-purge/core.ts'
import { storageObjectExists } from '../f14-moderation-purge/storageInfo.ts'
import { publicUrlInaccessible } from '../f14-moderation-purge/publicUrl.ts'
import { trialRequestAllowed, trialTargetAllowed, F14_TRIAL_SCOPE } from '../f14-moderation-purge/trialScope.ts'

// Reconciliation only: never imports/calls runMediaPurge or Storage.remove.
// A separate, reviewable release gate is required before deploying.
const F14_ONE_OBJECT_RECONCILE_APPROVED = false
const cors = {
  'Access-Control-Allow-Origin':'*',
  'Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods':'POST, OPTIONS',
  'Cache-Control':'no-store'
}
const reply=(status:number,body:unknown)=>new Response(JSON.stringify(body),{
  status,headers:{...cors,'Content-Type':'application/json; charset=utf-8'}
})

Deno.serve(async(req:Request)=>{
  if(req.method==='OPTIONS') return new Response(null,{status:204,headers:cors})
  if(req.method!=='POST') return reply(405,{error:'method_not_allowed'})
  if(!F14_ONE_OBJECT_RECONCILE_APPROVED
    || Deno.env.get('F14_ONE_OBJECT_RECONCILE_ENABLED')!=='true'
  ) return reply(503,{error:'reconciliation_disabled'})

  const raw=req.headers.get('Authorization') ?? ''
  if(!/^Bearer [^. ]+\.[^. ]+\.[^. ]+$/.test(raw)) return reply(401,{error:'unauthorized'})
  const inputText=await req.text()
  if(inputText.length>512) return reply(413,{error:'request_too_large'})
  let input:Record<string,unknown>
  try { input=JSON.parse(inputText) } catch { return reply(400,{error:'invalid_json'}) }
  if(!input || typeof input!=='object' || Array.isArray(input)
    || Object.keys(input).some(k=>!['kind','id'].includes(k))
    || !trialRequestAllowed(input.kind,input.id)
  ) return reply(409,{error:'target_refused'})

  const url=Deno.env.get('SUPABASE_URL')
  const anon=Deno.env.get('SUPABASE_ANON_KEY')
  const secret=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if(!url||!anon||!secret) return reply(503,{error:'reconciliation_not_configured'})

  try {
    const userClient=createClient(url,anon,{global:{headers:{Authorization:raw}},
      auth:{persistSession:false,autoRefreshToken:false}})
    const {data:{user},error:identityError}=await userClient.auth.getUser(raw.slice(7))
    if(identityError||!user) return reply(403,{error:'unauthorized'})
    const {data:moderator,error:roleError}=await userClient.rpc('f14_is_moderator')
    if(roleError||moderator!==true) return reply(403,{error:'unauthorized'})

    const admin=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}})
    const {data:row,error:rowError}=await admin.from('posts').select('photo_url')
      .eq('id',F14_TRIAL_SCOPE.id).maybeSingle()
    if(rowError||!row) return reply(409,{error:'target_unverified'})

    const target=resolvePurgeObject(url,'feed_post',F14_TRIAL_SCOPE.id,row)
    if(!trialTargetAllowed(target)) return reply(409,{error:'target_refused'})

    // NO re-upload, NO delete, NO duplicate claim. A missing origin must be
    // confirmed explicitly by the official SDK and both public URL variants.
    const info=await admin.storage.from(target.bucket).info(target.path)
    if(storageObjectExists(info)) return reply(409,{error:'origin_still_present'})
    if(!await publicUrlInaccessible(target.url)) {
      return reply(409,{error:'public_url_unverified'})
    }

    // Server RPC verifies the immutable Storage UUID in the held claim,
    // canonical source, unique URL references, exact report and absent metadata.
    // It finalizes media_status + claim invalidation in one DB transaction.
    const {data:completed,error:completeError}=await admin.rpc(
      'f14_finalize_one_object_reconciliation',{
        p_kind:'feed_post',
        p_id:F14_TRIAL_SCOPE.id,
        p_storage_object_id:F14_TRIAL_SCOPE.storageObjectId
      })
    if(completeError||completed!==true) return reply(409,{error:'reconciliation_refused'})
    return reply(200,{status:'verified_reconciled'})
  }catch {
    // No secrets, names, paths, tokens, raw upstream errors or URLs in output.
    return reply(503,{error:'reconciliation_unavailable'})
  }
})
