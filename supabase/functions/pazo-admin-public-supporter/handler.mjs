// Only a fresh GoTrue/admin/TOTP proof can reach the service-only CAS controller.
export const PUBLIC_SUPPORTER_CONFIRMATIONS=Object.freeze({pause_checkouts:'PAUSAR NUEVAS COMPRAS',open_checkouts:'AUTORIZO PUBLICAR CHECKOUT LIVE',pause_invitations:'PAUSAR INVITACIONES',resume_invitations:'REANUDAR INVITACIONES',resolve_incidents:'CONFIRMO REVISAR INCIDENCIAS'})
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i
const safeCodes=new Set(['updated','already_recorded','request_conflict','revision_changed','hosted_gate_required','legacy_intent_requires_reconciliation','health_requires_review','campaign_already_started','invalid_transition','public_go_not_ready','invalid_request','merchant_requires_review'])
async function boundedJson(req){
 const reader=req.body?.getReader();if(!reader)throw Error('body')
 const chunks=[];let count=0
 try{for(;;){const {done,value}=await reader.read();if(done)break;count+=value.byteLength;if(count>2048){await reader.cancel();throw Error('body')}chunks.push(value)}}finally{reader.releaseLock()}
 const all=new Uint8Array(count);let offset=0;for(const chunk of chunks){all.set(chunk,offset);offset+=chunk.length}
 return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(all))
}
export function createPublicSupporterAdminHandler({authenticateAdmin,change}={}){
 return async req=>{
  const origin=req.headers.get('origin'),allowed=origin==='https://pazo-app.vercel.app'||origin==='https://pazo-app-t83r.vercel.app'
  const headers={'content-type':'application/json','cache-control':'no-store','x-content-type-options':'nosniff',...(allowed?{'access-control-allow-origin':origin,vary:'Origin','access-control-allow-methods':'POST, OPTIONS','access-control-allow-headers':'authorization,apikey,content-type,x-client-info,x-supabase-api-version'}:{})}
  const reply=(status,code,revision)=>new Response(status===204?null:JSON.stringify({code,mayCharge:false,...(Number.isSafeInteger(revision)?{revision}:{})}),{status,headers})
  const url=new URL(req.url)
  if(!['/pazo-admin-public-supporter','/functions/v1/pazo-admin-public-supporter'].includes(url.pathname)||url.search)return reply(404,'not_found')
  if(!allowed)return reply(403,'untrusted_origin')
  if(req.method==='OPTIONS')return reply(204,'preflight')
  if(req.method!=='POST')return reply(405,'post_required')
  if(!/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(req.headers.get('content-type')||''))return reply(415,'json_required')
  if(typeof authenticateAdmin!=='function'||typeof change!=='function')return reply(503,'backend_unavailable')
  let actor;try{actor=await authenticateAdmin(req)}catch{return reply(403,'fresh_admin_mfa_required')}
  if(!uuid.test(actor?.id||'')||actor.isAdmin!==true||actor.freshSession!==true)return reply(403,'fresh_admin_mfa_required')
  let input;try{input=await boundedJson(req)}catch{return reply(400,'invalid_request')}
  if(!input||Array.isArray(input)||Object.keys(input).sort().join(',')!=='action,confirmation,expectedRevision,requestId'||!Object.hasOwn(PUBLIC_SUPPORTER_CONFIRMATIONS,input.action)||input.confirmation!==PUBLIC_SUPPORTER_CONFIRMATIONS[input.action]||!Number.isSafeInteger(input.expectedRevision)||input.expectedRevision<0||!uuid.test(input.requestId||''))return reply(400,'explicit_confirmation_required')
  let result;try{result=await change({actorId:actor.id,action:input.action,revision:input.expectedRevision,requestId:input.requestId})}catch{return reply(503,'outcome_unknown')}
  if(!safeCodes.has(result?.code))return reply(503,'outcome_unknown')
  return reply(['updated','already_recorded'].includes(result.code)?200:409,result.code,result.revision)
 }
}

