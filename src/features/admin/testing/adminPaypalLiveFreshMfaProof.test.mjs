import test from 'node:test'
import assert from 'node:assert/strict'
import {createPazoFreshMfaProof}
 from '../../../../supabase/functions/pazo-admin-paypal-provision/liveFreshMfaProof.mjs'
import {createPazoLiveVerifiedAdmin}
 from '../../../../supabase/functions/pazo-admin-paypal-provision/liveVerifiedAdmin.mjs'

const project='https://mrybvqdebbgcayuvgkkr.supabase.co'
const actor='12345678-1234-4234-8234-123456789abc'
const session='12345678-1234-4234-8234-123456789abd'
const now=1792468800
const header=Buffer.from('{"alg":"HS256","typ":"JWT"}').toString('base64url')
const signature=Buffer.from('SYNTHETIC_ONLY_NOT_A_VALID_SIGNATURE').toString('base64url')
const claims=Object.freeze({
 iss:project+'/auth/v1',aud:'authenticated',role:'authenticated',
 sub:actor,session_id:session,aal:'aal2',iat:now-20,exp:now+300,
 amr:[{method:'totp',timestamp:now-40},{method:'password',timestamp:now-3600}],
 is_anonymous:false
})
const token=(x=claims)=>[
 header,Buffer.from(JSON.stringify(x)).toString('base64url'),signature
].join('.')
const request=(value)=>new Request(project+'/functions/v1/pazo-admin-paypal-provision',{
 method:'POST',headers:{authorization:'Bearer '+value}
})
const proof=createPazoFreshMfaProof({nowSeconds:()=>now})
test('recent real second-factor claim is accepted ONLY as post-GoTrue proof',async()=>{
 assert.equal(await proof({actorId:actor,request:request(token())}),true)
})
test('old MFA cannot be laundered by a new refresh JWT or recent iat',async()=>{
 for(const x of [
  {...claims,amr:[{method:'totp',timestamp:now-301}]},
  {...claims,amr:[{method:'token_refresh',timestamp:now-1},
   {method:'totp',timestamp:now-3600}]},
  {...claims,amr:[{method:'password',timestamp:now-5}]},
  {...claims,amr:[{method:'otp',timestamp:now-5}]},
  {...claims,aal:'aal1'},
  {...claims,amr:[]}
 ]){
  assert.equal(await proof({actorId:actor,request:request(token(x))}),false)
 }
})
test('issuer, session, actor, unsigned role claim and token chronology must match',async()=>{
 const bad=[
  {sub:'33333333-3333-4333-8333-333333333333'},
  {iss:'https://attacker.invalid/auth/v1'},
  {aud:'anon'},{role:'service_role'},{session_id:'fake'},
  {exp:now},{iat:now+500},{iat:now-800,amr:[{method:'totp',timestamp:now-40}]},
  {amr:[{method:'totp',timestamp:now+60}]},
  {amr:[{method:'totp',timestamp:1.3}]},
  {is_anonymous:true}
 ]
 for(const change of bad){
  const result=await proof({actorId:actor,request:request(token({...claims,...change}))})
  assert.equal(result,false,JSON.stringify(change))
 }
 assert.equal(await proof({actorId:'invalid',request:request(token())}),false)
 assert.equal(await proof({actorId:actor,request:request('header.payload.signature')}),false)
})
test('reauth window is fixed to 300 seconds and cannot be enlarged by caller',()=>{
 assert.throws(()=>createPazoFreshMfaProof({windowSeconds:86400}),
  /fresh_mfa_contract_not_configured/)
})
const json=(body,status=200)=>new Response(JSON.stringify(body),{
 status,headers:{'content-type':'application/json'}})
function integration({providerAccepts=true,adminAllows=true,mfaClaims=claims}={}){
 const calls=[]
 const verify=createPazoLiveVerifiedAdmin({
  supabaseUrl:project,publishableKey:'ANON_PUBLIC_TEST_KEY_123456789',
  proveFreshReauthentication:proof,
  fetchImpl:async(url,opts)=>{
   calls.push({url,auth:opts.headers.Authorization})
   if(url.endsWith('/auth/v1/user')){
    if(!providerAccepts)return json({error:'not_authorized'},401)
    return json({id:actor,aud:'authenticated'})
   }
   if(url.endsWith('/rest/v1/rpc/pazo_is_admin'))
    return json(adminAllows)
   throw Error('unexpected endpoint')
  }
 })
 return {verify,calls,req:request(token(mfaClaims))}
}
test('GoTrue and DB permissions precede claim parsing; forged signed-looking MFA denied',async()=>{
 const spoofed=integration({providerAccepts:false})
 assert.equal(await spoofed.verify(spoofed.req),null)
 assert.equal(spoofed.calls.length,1)
 const nonadmin=integration({adminAllows:false})
 assert.equal(await nonadmin.verify(nonadmin.req),null)
 assert.equal(nonadmin.calls.length,2)
 const old=integration({mfaClaims:{...claims,amr:[{method:'totp',timestamp:now-500}]}})
 assert.equal(await old.verify(old.req),null)
 const positive=integration()
 const allowed=await positive.verify(positive.req)
 assert.deepEqual(allowed,{id:actor,isAdmin:true,freshSession:true})
 assert.equal(positive.calls.length,2)
})
