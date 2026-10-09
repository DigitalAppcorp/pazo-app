// F14 A2: non-destructive real signed-JWT permissions smoke.
// Execute only in a secure runner using TWO distinct pre-existing PAZO test users.
// NEVER commit bearer tokens; this script never prints tokens.
import assert from 'node:assert/strict'
const { PAZO_SUPABASE_URL, PAZO_SUPABASE_PUBLISHABLE_KEY,
  PAZO_MODERATOR_ACCESS_TOKEN, PAZO_NORMAL_USER_ACCESS_TOKEN } = process.env
if (![PAZO_SUPABASE_URL,PAZO_SUPABASE_PUBLISHABLE_KEY,
      PAZO_MODERATOR_ACCESS_TOKEN,PAZO_NORMAL_USER_ACCESS_TOKEN].every(Boolean)) {
  console.error('NOT RUN: requires Supabase URL/key and two securely injected real user JWTs.')
  process.exit(2)
}
const base=new URL(PAZO_SUPABASE_URL)
assert.equal(base.protocol,'https:')
assert.match(base.hostname,/^[a-z0-9-]+\.supabase\.co$/)
function payload(jwt) {
  const parts=jwt.split('.')
  assert.equal(parts.length,3,'JWT must be signed three-part token')
  const claim=JSON.parse(Buffer.from(parts[1],'base64url').toString('utf8'))
  assert.equal(claim.role,'authenticated')
  assert.ok(claim.sub && claim.exp > Date.now()/1000,'JWT subject must be present and unexpired')
  return claim
}
const mod=payload(PAZO_MODERATOR_ACCESS_TOKEN)
const normal=payload(PAZO_NORMAL_USER_ACCESS_TOKEN)
assert.notEqual(mod.sub,normal.sub,'Moderator and normal user must be separate accounts')
async function rpc(functionName, token, body) {
  const res=await fetch(new URL('/rest/v1/rpc/'+functionName,base),{
    method:'POST',headers:{apikey:PAZO_SUPABASE_PUBLISHABLE_KEY,
      Authorization:token?'Bearer '+token:undefined,'Content-Type':'application/json'},
    body:JSON.stringify(body),
    signal:AbortSignal.timeout(10000),
  })
  return {status:res.status,body:await res.text()}
}
function ok(result,context) {
  assert.equal(result.status,200,context+' HTTP failure (response redacted)')
}
function denied(result,context) {
  assert.ok([401,403].includes(result.status),context+' must reject without revealing data')
}
const results=[]
for (const [name,jwt] of [['moderator',PAZO_MODERATOR_ACCESS_TOKEN],
                          ['normal',PAZO_NORMAL_USER_ACCESS_TOKEN]]) {
  const role=await rpc('f14_is_moderator',jwt,{})
  ok(role,name+' role check')
  assert.equal(JSON.parse(role.body),name==='moderator')
  results.push(name+' role validated')
  const queue=await rpc('f14_moderation_queue',jwt,{p_limit:1,p_offset:0})
  if(name==='moderator') { ok(queue,'moderator queue'); assert.ok(Array.isArray(JSON.parse(queue.body))) }
  else denied(queue,'nonmoderator queue')
  const media=await rpc('f14_pending_media',jwt,{p_limit:1})
  if(name==='moderator') { ok(media,'moderator media queue'); assert.ok(Array.isArray(JSON.parse(media.body))) }
  else denied(media,'nonmoderator media queue')
  results.push(name+' moderation permissions validated')
}
const anon=await rpc('f14_moderation_queue',null,{p_limit:1,p_offset:0})
denied(anon,'anonymous moderation queue')
results.push('anonymous queue rejected')
console.log('PASS: '+results.join('; ')+'; no mutation attempted.')
