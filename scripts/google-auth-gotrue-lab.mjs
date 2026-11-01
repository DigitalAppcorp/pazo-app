// #172 Real local GoTrue with a fake OIDC provider, in a disposable CLI stack.
// GoTrue links identities the same way for each provider, so Keycloak's generic
// endpoints stand in for Google, which cannot be pointed at a local issuer.
// This proves Supabase's linking rules. It does NOT prove Google works.
import assert from 'node:assert/strict'
import http from 'node:http'
import fs from 'node:fs'
import {randomUUID} from 'node:crypto'
import {requiresAdultAttestation,isNewGoogleAccount} from '../src/features/auth/googleAuth.ts'

const status=JSON.parse(fs.readFileSync(process.argv[2],'utf8'))
const API=status.API_URL,ANON=status.ANON_KEY,SERVICE=status.SERVICE_ROLE_KEY
const OIDC_PORT=Number(process.env.PAZO_FAKE_OIDC_PORT||54399)
const RETURN='http://127.0.0.1:5398/?auth=google'
assert.ok(/^http:\/\/(127\.0\.0\.1|localhost):54321$/.test(API),'loopback Auth only')
const observations={}
const codes=new Map()
const server=http.createServer((req,res)=>{
 const url=new URL(req.url,'http://oidc.local')
 const send=(body,code=200)=>{res.writeHead(code,{'content-type':'application/json'});res.end(JSON.stringify(body))}
 if(url.pathname.endsWith('/token')){
  let raw='';req.on('data',c=>raw+=c).on('end',()=>send({access_token:new URLSearchParams(raw).get('code'),token_type:'bearer',expires_in:3600}))
  return
 }
 if(url.pathname.endsWith('/userinfo')){
  const token=(req.headers.authorization||'').replace(/^Bearer /i,'')
  return codes.has(token)?send(codes.get(token)):send({error:'invalid'},401)
 }
 send({error:'not_found'},404)
})
await new Promise(ok=>server.listen(OIDC_PORT,'0.0.0.0',ok))
const authorize=async redirectTo=>{
 const res=await fetch(`${API}/auth/v1/authorize?provider=keycloak&redirect_to=${encodeURIComponent(redirectTo)}`,{redirect:'manual'})
 assert.equal(res.status,302,'authorize must redirect to the provider')
 const location=new URL(res.headers.get('location'))
 return {state:location.searchParams.get('state'),callback:location.searchParams.get('redirect_uri')}
}
const follow=async(callbackUrl)=>{
 const res=await fetch(callbackUrl,{redirect:'manual'})
 const target=res.headers.get('location')
 assert.ok(target,'callback must redirect back, status '+res.status)
 return new URL(target)
}
const providerLogin=async(profile,redirectTo=RETURN)=>{
 const {state,callback}=await authorize(redirectTo)
 const code='code-'+randomUUID()
 codes.set(code,{sub:profile.sub,email:profile.email,email_verified:profile.verified,name:'Synthetic'})
 const url=new URL(callback);url.searchParams.set('code',code);url.searchParams.set('state',state)
 const back=await follow(url.href)
 const hash=new URLSearchParams(back.hash.slice(1))
 const query=back.searchParams
 const token=hash.get('access_token')
 return {back,token,error:hash.get('error')??query.get('error')}
}
const auth=async(path,{method='GET',token,body,key=ANON}={})=>{
 const res=await fetch(API+path,{method,headers:{apikey:key,authorization:'Bearer '+(token||key),'content-type':'application/json'},
  ...(body?{body:JSON.stringify(body)}:{})})
 let data=null;try{data=await res.json()}catch{}
 return {status:res.status,data}
}
const me=async token=>{const r=await auth('/auth/v1/user',{token});assert.equal(r.status,200);return r.data}
const email=name=>`pazo-${name}-${randomUUID().slice(0,8)}@example.invalid`
const asGoogle=user=>({...user,app_metadata:{...user.app_metadata,
 providers:(user.app_metadata.providers||[]).map(p=>p==='keycloak'?'google':p)}})
const providers=user=>[...user.app_metadata.providers].sort()
const passwordLogin=(address,password)=>auth('/auth/v1/token?grant_type=password',{method:'POST',body:{email:address,password}})
const PASSWORD='PazoLab!4'+randomUUID().replaceAll('-','')
const step=(name,value)=>{observations[name]=value;console.log('GOOGLE_GOTRUE_PASS '+name)}

try{
 assert.equal((await auth('/auth/v1/settings')).data.mailer_autoconfirm,false,'attribution requires confirmation enabled')

 // New account.
 const addressA=email('new'),subA='sub-'+randomUUID()
 const first=await providerLogin({sub:subA,email:addressA,verified:true})
 assert.ok(first.token,'new login returns a session')
 assert.equal(first.back.origin+first.back.pathname+first.back.search,RETURN,'returns to the allow-listed URL')
 const created=await me(first.token)
 assert.deepEqual(providers(created),['keycloak'])
 assert.ok(created.email_confirmed_at,'verified provider email confirms the account')
 assert.ok(Date.parse(created.email_confirmed_at)>=Date.parse(created.created_at),'passes the attribution ordering rule')
 assert.equal(requiresAdultAttestation(asGoogle(created)),true,'provider data never includes 18+')
 assert.equal(isNewGoogleAccount(asGoogle(created),Date.now()),true)
 step('new_account_confirmed_requires_18_and_counts_as_new',{providers:providers(created)})

 // Repeat login and durable attestation.
 const saved=await auth('/auth/v1/user',{method:'PUT',token:first.token,body:{data:{pazo_adult_attested_at:new Date().toISOString()}}})
 assert.equal(saved.status,200)
 const again=await providerLogin({sub:subA,email:addressA,verified:true})
 const repeated=await me(again.token)
 assert.equal(repeated.id,created.id,'same provider subject must not duplicate the account')
 assert.equal(requiresAdultAttestation(asGoogle(repeated)),false,'18+ survives a new provider login')
 step('repeat_login_same_account_and_18_persists',{sameId:true})

 // Existing confirmed email account: same account and id, password keeps working.
 const addressB=email('existing')
 const existing=await auth('/auth/v1/admin/users',{method:'POST',key:SERVICE,token:SERVICE,body:{email:addressB,password:PASSWORD,email_confirm:true}})
 assert.ok([200,201].includes(existing.status))
 const linked=await providerLogin({sub:'sub-'+randomUUID(),email:addressB,verified:true})
 const linkedUser=await me(linked.token)
 assert.equal(linkedUser.id,existing.data.id,'verified same email keeps the same account, so its pets and pagos remain')
 assert.deepEqual(providers(linkedUser),['email','keycloak'])
 assert.equal(linkedUser.created_at,existing.data.created_at,'link must not look like a new account')
 assert.equal(requiresAdultAttestation(asGoogle(linkedUser)),false)
 assert.equal(isNewGoogleAccount(asGoogle({...linkedUser,created_at:'2026-01-01T00:00:00Z'}),Date.now()),false)
 assert.equal((await passwordLogin(addressB,PASSWORD)).status,200,'email and password still work')
 step('verified_same_email_links_without_data_loss',{sameId:true,providers:providers(linkedUser)})

 // Pre-account takeover: an unconfirmed password account must not keep access.
 const addressC=email('unconfirmed')
 const squatter=await auth('/auth/v1/signup',{method:'POST',body:{email:addressC,password:PASSWORD}})
 assert.ok([200,201].includes(squatter.status))
 const victim=await providerLogin({sub:'sub-'+randomUUID(),email:addressC,verified:true})
 assert.ok(victim.token,'the verified provider owner gets in')
 const victimUser=await me(victim.token)
 assert.equal((await passwordLogin(addressC,PASSWORD)).status>=400,true,'unconfirmed password must not reach the account')
 step('unconfirmed_password_account_cannot_take_over',{sameId:victimUser.id===(squatter.data.user?.id??squatter.data.id),providers:providers(victimUser)})

 // An unverified provider email must not reach an existing confirmed account.
 const addressD=email('unverified')
 const owner=await auth('/auth/v1/admin/users',{method:'POST',key:SERVICE,token:SERVICE,body:{email:addressD,password:PASSWORD,email_confirm:true}})
 const spoof=await providerLogin({sub:'sub-'+randomUUID(),email:addressD,verified:false})
 if(spoof.token){
  const spoofUser=await me(spoof.token)
  assert.notEqual(spoofUser.id,owner.data.id,'unverified provider email must never link')
 }
 const ownerAfter=await auth('/auth/v1/admin/users/'+owner.data.id,{key:SERVICE,token:SERVICE})
 assert.deepEqual(providers(ownerAfter.data),['email'],'the owner keeps only their own identity')
 step('unverified_provider_email_does_not_link',{session:Boolean(spoof.token),error:spoof.error??null})

 // Different Google account: different PAZO account.
 const other=await providerLogin({sub:'sub-'+randomUUID(),email:email('other'),verified:true})
 assert.notEqual((await me(other.token)).id,created.id)
 step('different_account_stays_separate',{separate:true})

 // Abort at the provider.
 {const {state,callback}=await authorize(RETURN)
  const url=new URL(callback)
  url.searchParams.set('error','access_denied');url.searchParams.set('error_description','synthetic');url.searchParams.set('state',state)
  const back=await follow(url.href)
  const raw=back.search+back.hash
  assert.ok(raw.includes('error'),'cancelling returns an error')
  assert.equal(raw.includes('access_token'),false,'cancelling creates no session')
  assert.equal(back.origin+back.pathname,'http://127.0.0.1:5398/')
  assert.equal(back.searchParams.get('auth'),'google','the app recognizes its own return')
  step('provider_cancel_returns_error_without_session',{inHash:back.hash.includes('error'),inQuery:back.searchParams.has('error')})}

 // A URL outside the allow list falls back to the site, never to the attacker.
 const foreign=await providerLogin({sub:'sub-'+randomUUID(),email:email('foreign'),verified:true},'https://attacker.invalid/steal')
 assert.notEqual(foreign.back.hostname,'attacker.invalid','tokens must not reach a foreign URL')
 step('foreign_redirect_rejected',{host:foreign.back.hostname})

 fs.mkdirSync('artifacts/google-auth',{recursive:true})
 fs.writeFileSync('artifacts/google-auth/GOTRUE_OBSERVATIONS.json',JSON.stringify({status:'PASS',realGoTrue:true,realGoogle:false,
  provider:'keycloak endpoints served by a local fake',observations},null,1))
 console.log('GOOGLE_GOTRUE_LAB_PASS '+Object.keys(observations).length)
}catch(error){
 const message=String(error?.message||error)
 console.error('GOOGLE_GOTRUE_LAB_FAIL '+(/@|eyJ/.test(message)?'redacted':message.slice(0,300)))
 console.error('GOOGLE_GOTRUE_LAB_SO_FAR '+JSON.stringify(Object.keys(observations)))
 process.exitCode=1
}finally{
 server.close();server.closeAllConnections?.()
}
