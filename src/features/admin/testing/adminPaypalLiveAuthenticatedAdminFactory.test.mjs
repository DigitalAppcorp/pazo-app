import test from 'node:test'
import assert from 'node:assert/strict'
import {createPazoLivePrivilegedAdmin}
 from '../../../../supabase/functions/pazo-admin-paypal-provision/liveAuthenticatedAdminFactory.mjs'
const project='https://mrybvqdebbgcayuvgkkr.supabase.co'
const actor='12345678-1234-4234-8234-123456789abc'
const session='12345678-1234-4234-8234-123456789abd'
const key='PUBLIC_PROJECT_ANON_KEY_TEST_1234567890'
const json=(data,status=200)=>new Response(JSON.stringify(data),{
 status,headers:{'content-type':'application/json'}})
function build({oldMfa=false,denyAdmin=false,invalidToken=false}={}){
 const now=Math.floor(Date.now()/1000)
 const claims={iss:project+'/auth/v1',aud:'authenticated',role:'authenticated',
  sub:actor,session_id:session,aal:'aal2',iat:now-1,exp:now+3600,
  amr:[{method:'totp',timestamp:now-(oldMfa?3600:1)}]}
 const token=['e30',Buffer.from(JSON.stringify(claims)).toString('base64url'),'c2ln'].join('.')
 const request=new Request(project+'/functions/v1/pazo-admin-paypal-provision',{
  method:'POST',headers:{authorization:'Bearer '+token}
 })
 const calls=[]
 const verifier=createPazoLivePrivilegedAdmin({
  supabaseUrl:project,publishableKey:key,fetchImpl:async(url,opts)=>{
   calls.push({url,token:opts.headers.Authorization})
   if(url.endsWith('/auth/v1/user'))return invalidToken?
    json({message:'jwt expired'},401):json({id:actor,aud:'authenticated'})
   if(url.endsWith('/rest/v1/rpc/pazo_is_admin'))return json(!denyAdmin)
   throw Error('unexpected endpoint')
  }
 })
 return {verifier,request,calls}
}
test('factory requires live GoTrue token, real admin grant and MFA within five minutes',async()=>{
 const {verifier,request,calls}=build()
 assert.deepEqual(await verifier(request),{id:actor,isAdmin:true,freshSession:true})
 assert.deepEqual(calls.map(c=>c.url),[
  project+'/auth/v1/user',project+'/rest/v1/rpc/pazo_is_admin'
 ])
})
test('admin grant revoked, invalid JWT, and stale TOTP all deny financial credentials',async()=>{
 for(const options of [{oldMfa:true},{denyAdmin:true},{invalidToken:true}]){
  const {verifier,request}=build(options)
  assert.equal(await verifier(request),null)
 }
})
