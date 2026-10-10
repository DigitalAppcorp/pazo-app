import { createClient } from 'npm:@supabase/supabase-js@2.117.2'
import { runMediaPurge, PurgeRejected, type PurgeObject, type PurgeKind } from './core.ts'

// Two independent activation gates: published Edge env switch and database RPC.
// Do not deploy enabled before P0 media gate and authorized E2E verification.
const cors = {'Access-Control-Allow-Origin':'*',
  'Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods':'POST, OPTIONS', 'Cache-Control':'no-store'}
const reply=(status:number, body:unknown)=>new Response(JSON.stringify(body),{
  status,headers:{...cors,'Content-Type':'application/json; charset=utf-8'}
})
async function publicUrlInaccessible(url:string):Promise<boolean> {
 const fresh=new URL(url)
 fresh.searchParams.set('pazo_verify',crypto.randomUUID())
 for(const candidate of [url,fresh.toString()]){
  const response=await fetch(candidate,{method:'HEAD',cache:'no-store',redirect:'error',
    headers:{'Cache-Control':'no-cache'}})
  if(![403,404,410].includes(response.status)) return false
 }
 return true
}
Deno.serve(async(req:Request)=>{
 if(req.method==='OPTIONS') return new Response(null,{status:204,headers:cors})
 if(req.method!=='POST') return reply(405,{error:'method_not_allowed'})
 if(Deno.env.get('F14_MEDIA_PURGE_ENABLED')!=='true') return reply(503,{error:'cleanup_disabled'})
 const url=Deno.env.get('SUPABASE_URL'),anon=Deno.env.get('SUPABASE_ANON_KEY'),secret=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
 if(!url||!anon||!secret) return reply(503,{error:'cleanup_not_configured'})
 const auth=req.headers.get('Authorization')||''
 if(!/^Bearer [^. ]+\.[^. ]+\.[^. ]+$/.test(auth)) return reply(401,{error:'unauthorized'})
 const body=await req.text()
 if(body.length>512) return reply(413,{error:'request_too_large'})
 let input:Record<string,unknown>
 try {input=JSON.parse(body)} catch {return reply(400,{error:'invalid_json'})}
 if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(k=>!['kind','id'].includes(k))
  ||typeof input.kind!=='string'||typeof input.id!=='string') return reply(400,{error:'invalid_request'})
 try{
  const token=auth.slice(7)
  const userClient=createClient(url,anon,{global:{headers:{Authorization:auth}},
    auth:{persistSession:false,autoRefreshToken:false}})
  // Isolated service client never receives caller-controlled headers.
  const admin=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}})
  const result=await runMediaPurge(url,input.kind,input.id,{
   authorizeModerator:async()=>{
    const {data:{user},error:authError}=await userClient.auth.getUser(token)
    if(authError||!user) return false
    const {data,error}=await userClient.rpc('f14_is_moderator')
    if(error) throw error
    return data===true
   },
   fetchRow:async(kind:PurgeKind,id:string)=>{
    const table=kind==='feed_post'?'posts':'community_posts'
    const fields=kind==='feed_post'?'photo_url':'photo_url,photo_storage_path'
    const {data,error}=await admin.from(table).select(fields).eq('id',id).maybeSingle()
    if(error) throw error
    return data as {photo_url:string|null;photo_storage_path?:string|null}|null
   },
   gate:async(target:PurgeObject,stage:'preflight'|'complete')=>{
    const {data,error}=await admin.rpc('f14_moderation_media_gate',{
      p_kind:target.kind,p_target:target.id,p_bucket:target.bucket,p_path:target.path,
      p_url:target.url,p_stage:stage
    })
    if(error) throw error
    return data===true
   },
   objectExists:async(target:PurgeObject)=>{
    const {data,error}=await admin.storage.from(target.bucket).exists(target.path)
    if(error) throw error
    return data===true
   },
   removeObject:async(target:PurgeObject)=>{
    const {error}=await admin.storage.from(target.bucket).remove([target.path])
    if(error) throw error
   },
   publicUrlInaccessible:async(target:PurgeObject)=>publicUrlInaccessible(target.url),
  })
  return reply(200,result)
 }catch(error){
  if(error instanceof PurgeRejected){
   return reply(error.code==='unauthorized'?403:error.code==='invalid_target'?400:409,{error:error.code})
  }
  // Never expose secret credentials, raw SQL, URLs or paths.
  return reply(503,{error:'cleanup_unavailable'})
 }
})
