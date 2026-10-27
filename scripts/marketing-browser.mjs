// Browser -> actual client/Auth/onboarding -> actual Edge adapters -> PG17 ->
// actual AdminDashboard. Auth email and challenge provider are isolated doubles.
// Every external request is intercepted BEFORE network, never hosted users.
import assert from 'node:assert/strict'
import {createServer} from 'node:http'
import {createRequire} from 'node:module'
import {randomUUID} from 'node:crypto'
import {mkdirSync} from 'node:fs'
import {sql,runMockCron} from './marketing-sql-lab.mjs'
import {createMarketingLandingHandler} from '../supabase/functions/pazo-marketing-landing/landingCore.mjs'
import {createMarketingLandingSubmit,createMarketingChallengeClaim} from '../supabase/functions/pazo-marketing-landing/landingAdapter.mjs'
import {createMarketingChallengeVerifier} from '../supabase/functions/pazo-marketing-landing/challengeVerifier.mjs'
import {createMarketingSingleUseVerifier} from '../supabase/functions/pazo-marketing-landing/singleUseVerifier.mjs'
import {createMarketingIntakeHandler} from '../supabase/functions/pazo-marketing-attribution/intakeCore.mjs'
import {createMarketingProvider} from '../supabase/functions/pazo-marketing-attribution/intakeAdapter.mjs'
const {chromium}=createRequire(import.meta.url)(process.env.PAZO_PLAYWRIGHT_MODULE||'playwright')
const origin=process.env.PAZO_MARKETING_LOCAL_ORIGIN||'http://127.0.0.1:5185',project='https://mrybvqdebbgcayuvgkkr.supabase.co'
assert.match(origin,/^http:\/\/127\.0\.0\.1:\d+$/)
const q=value=>"'"+String(value).replaceAll("'","''")+"'",jsonQuery=s=>JSON.parse(sql(s)||'null')
let owner,pet,user,adminId=randomUUID(),intakes=0,arrivals=0,reports=0,failReport=false,delayReport=false
const sessions=new Map()
const admin={id:adminId,email:'admin@synthetic.invalid',aud:'authenticated',role:'authenticated',created_at:new Date(Date.now()-864000000).toISOString(),email_confirmed_at:new Date(Date.now()-864000000).toISOString()}
sql(`INSERT INTO auth.users(id,created_at,email_confirmed_at) VALUES(${q(adminId)},now()-interval '10 days',now()-interval '10 days');INSERT INTO public.profiles VALUES(${q(adminId)},false);INSERT INTO admin_private.admin_grants VALUES(${q(adminId)})`)
const session=value=>{const token=[Buffer.from('{"alg":"HS256"}').toString('base64url'),Buffer.from(JSON.stringify({sub:value.id,exp:Math.floor(Date.now()/1000)+3600,role:'authenticated'})).toString('base64url'),'SYNTHETIC'].join('.');sessions.set(token,value);return {access_token:token,refresh_token:'SYNTHETIC_ONLY',expires_in:3600,token_type:'bearer',user:value}}
async function providerFetch(url,options={}){
 const path=new URL(url).pathname
 if(path==='/auth/v1/settings')return Response.json({mailer_autoconfirm:false})
 if(path==='/auth/v1/user')return Response.json(sessions.get(options.headers.authorization?.slice(7))||null)
 const body=JSON.parse(options.body)
 if(path.endsWith('/pazo_marketing_claim_challenge_v1'))return Response.json(sql(`SET ROLE service_role;SELECT public.pazo_marketing_claim_challenge_v1(${q(body.p_digest)})`)==='t')
 if(path.endsWith('/pazo_marketing_record_verified_v1')){
  intakes++;return Response.json(sql(`SET ROLE service_role;SELECT public.pazo_marketing_record_verified_v1(${q(body.p_owner)},${q(body.p_creative)},${q(body.p_first_touch_at)}::timestamptz)`)==='t')
 }
 if(path.endsWith('/pazo_marketing_record_landing_v1')){arrivals++;return Response.json(sql(`SET ROLE service_role;SELECT public.pazo_marketing_record_landing_v1(${q(body.p_creative)})`)==='t')}
 throw Error('Unexpected provider route')
}
const verifyProvider=createMarketingChallengeVerifier({secret:'SYNTHETIC_ONLY_CHALLENGE_SECRET',fetchImpl:async(_,options)=>{
 const token=new URLSearchParams(options.body).get('response'),accepted=token?.startsWith('SYNTHETIC_')
 return Response.json({success:accepted,hostname:'pazo-app.vercel.app',action:'pazo_marketing_landing',challenge_ts:new Date().toISOString()})
}})
const verifyChallenge=createMarketingSingleUseVerifier({verifyProvider,claimDigest:createMarketingChallengeClaim({url:project,serviceKey:'SYNTHETIC_ONLY_SERVICE_KEY',fetchImpl:providerFetch})})
const landing=createMarketingLandingHandler({released:true,verifyChallenge,submit:createMarketingLandingSubmit({url:project,serviceKey:'SYNTHETIC_ONLY_SERVICE_KEY',fetchImpl:providerFetch})})
const intake=createMarketingIntakeHandler({released:true,...createMarketingProvider({url:project,anonKey:'SYNTHETIC_ONLY_PUBLIC_KEY',serviceKey:'SYNTHETIC_ONLY_SERVICE_KEY',fetchImpl:providerFetch})})
async function remote(path,method,headers,body){
 const value=body?JSON.parse(body):{},actor=sessions.get(headers.authorization?.slice(7))
 if(path.startsWith('/functions/v1/')){
  const handler=path.endsWith('pazo-marketing-landing')?landing:path.endsWith('pazo-marketing-attribution')?intake:null
  if(!handler)throw Error('Unexpected Edge call')
  return handler(new Request(project+path,{method,headers:{...headers,origin:'https://pazo-app.vercel.app'},body}))
 }
 if(path.startsWith('/auth/v1/signup')){
  user={id:owner,email:'fixture@synthetic.invalid',created_at:new Date().toISOString(),email_confirmed_at:null,aud:'authenticated',role:'authenticated'}
  sql(`INSERT INTO auth.users(id,created_at) VALUES(${q(owner)},${q(user.created_at)});INSERT INTO public.profiles VALUES(${q(owner)},false)`)
  return Response.json({user,session:null})
 }
 if(path.startsWith('/auth/v1/verify')){user={...user,email_confirmed_at:new Date().toISOString()};sql(`UPDATE auth.users SET email_confirmed_at=${q(user.email_confirmed_at)} WHERE id=${q(owner)}`);return Response.json(session(user))}
 if(path.startsWith('/auth/v1/token'))return Response.json(session(admin))
 if(path.startsWith('/auth/v1/user'))return Response.json(actor||null,{status:actor?200:401})
 if(path.includes('/rpc/pazo_ensure_my_profile'))return Response.json(null)
 if(path.includes('/rpc/create_pet_profile')){
  assert.equal(actor?.id,owner);pet={id:randomUUID(),owner_id:owner,name:value.p_name,species:value.p_species,created_at:new Date().toISOString()}
  sql(`INSERT INTO public.pets VALUES(${q(pet.id)},${q(owner)},${q(pet.created_at)})`);return Response.json(pet.id)
 }
 if(path.startsWith('/rest/v1/pets?'))return Response.json(pet)
 if(path.startsWith('/rest/v1/pet_private_details?'))return Response.json([])
 if(path.includes('/rpc/pazo_is_admin'))return Response.json(actor?.id===adminId)
 if(path.includes('/rpc/pazo_admin_marketing_summary')){
  reports++
  if(delayReport)await new Promise(r=>setTimeout(r,1000))
  if(failReport)return Response.json({code:'SYNTHETIC_NETWORK_FAILURE'},{status:503})
  try{return Response.json(jsonQuery(`BEGIN;SET LOCAL ROLE authenticated;SET LOCAL "request.jwt.claim.sub"=${q(actor?.id||'')};SELECT public.pazo_admin_marketing_summary(${Number(value.p_days)});ROLLBACK;`))}catch{return Response.json({code:'42501'},{status:403})}
 }
 // Summary intentionally fails, proving that Campaigns remains usable.
 if(path.includes('/rpc/pazo_admin_overview'))return Response.json({code:'SYNTHETIC_OVERVIEW_FAILURE'},{status:503})
 if(path.includes('/rpc/pazo_admin_users')||path.includes('/rpc/pazo_admin_experiments'))return Response.json([])
 throw Error('Unexpected synthetic route '+path)
}
// A local-only HTTP bridge lets browser requests use the true service code and
// SQL. Local fixture CORS is distinct from the tested canonical Edge CORS.
const server=createServer(async(req,res)=>{
 try{const chunks=[];for await(const c of req)chunks.push(c);const data=JSON.parse(Buffer.concat(chunks).toString());const response=await remote(data.path,data.method,data.headers,data.body)
  res.writeHead(200,{'content-type':'application/json'});res.end(JSON.stringify({status:response.status,body:await response.text()}))
 }catch(error){res.writeHead(500);res.end(String(error.message))}
})
await new Promise(r=>server.listen(0,'127.0.0.1',r));const bridge='http://127.0.0.1:'+server.address().port
const browser=await chromium.launch({headless:true,args:['--no-sandbox'],...(process.env.PAZO_CHROMIUM_PATH?{executablePath:process.env.PAZO_CHROMIUM_PATH}:{})})
const out=process.env.PAZO_MARKETING_SCREENSHOTS||'/tmp/pazo-marketing-ui';mkdirSync(out,{recursive:true})
let checks=0;const check=(v,m)=>{assert.ok(v,m);checks++}
try{
 const cases=[{width:390,lang:'es',enabled:false},...[390,1440].flatMap(width=>['es','en'].map(lang=>({width,lang,enabled:true})))]
 for(const {width,lang,enabled} of cases){
  owner=randomUUID();pet=null;user=null;failReport=false;delayReport=false;const beforeArrivals=arrivals,beforeIntakes=intakes
  const context=await browser.newContext({viewport:{width,height:844},serviceWorkers:'block',reducedMotion:'reduce'}),errors=[]
  let forbidden=0
  await context.route('**/*',async route=>{
   const request=route.request(),url=new URL(request.url())
   if(url.origin===origin){
    if(enabled&&(url.pathname==='/src/features/marketing/marketingRuntime.ts'||url.pathname==='/src/features/admin/components/AdminMarketingPanel.tsx')){
     // Fetch only the already-validated loopback origin. Node's transport also
     // works on Windows hosts where APIRequestContext resets local requests.
     const response=await fetch(request.url());assert.equal(response.status,200);let source=await response.text()
     for(const flag of url.pathname.includes('marketingRuntime')?['PAZO_MARKETING_COLLECTION_ENABLED','PAZO_MARKETING_LANDING_ENABLED']:['PAZO_MARKETING_ADMIN_REPORT_ENABLED']){
      const pattern=new RegExp('const '+flag+' ?= ?false');assert.ok(pattern.test(source));source=source.replace(pattern,'const '+flag+' = true')
     }
     return route.fulfill({status:200,contentType:'application/javascript',body:source})
    }
    return route.continue()
   }
   if(url.hostname==='challenges.cloudflare.com')return route.fulfill({contentType:'application/javascript',body:`window.turnstile={render:(e,o)=>{window.fixtureShield=o;return 'synthetic'},execute:()=>queueMicrotask(()=>window.fixtureShield.callback('SYNTHETIC_'+crypto.randomUUID())),remove:()=>{}}`})
   if(url.origin===project){
    if(request.method()==='OPTIONS')return route.fulfill({status:204,headers:{'access-control-allow-origin':origin,'access-control-allow-methods':'POST,GET,OPTIONS','access-control-allow-headers':request.headers()['access-control-request-headers']||'*'}})
    const response=await fetch(bridge,{method:'POST',body:JSON.stringify({path:url.pathname+url.search,method:request.method(),headers:request.headers(),body:request.postData()})})
    if(!response.ok)throw Error(await response.text());const data=await response.json()
    return route.fulfill({status:data.status,contentType:'application/json',headers:{'access-control-allow-origin':origin},body:data.body})
   }
   if(request.resourceType()!=='image'&&request.resourceType()!=='font')forbidden++
   return route.abort()
  })
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message))
  const utm='&utm_source=meta&utm_medium=paid_social&utm_campaign=pazo_beta_local_202610&utm_content=perfil_es&fbclid=NEVER_STORE'
  await page.goto(origin+`/supabase/tests/marketing/browser-harness.html?lang=${lang}`+utm)
  if(!enabled){
   const reportCount=reports
   await page.getByRole('button',{name:'Fixture open admin'}).click();await page.getByRole('button',{name:'Campañas',exact:true}).click({timeout:10000}).catch(async error=>{await page.screenshot({path:out+'/failure.png'});console.error({errors,body:(await page.locator('body').innerText()).slice(0,1800)});throw error})
   await page.getByText('En preparación · no hay recopilación activa',{exact:true}).waitFor()
   check(arrivals===beforeArrivals&&intakes===beforeIntakes&&reports===reportCount,'Default OFF performs zero marketing calls')
   check(await page.evaluate(()=>localStorage.getItem('pazo_marketing_firstparty_v1')===null&&sessionStorage.getItem('pazo_marketing_landing_daily_v1')===null),'Default OFF stores no campaign')
   await context.close();continue
  }
  await page.getByPlaceholder(lang==='es'?'tu@correo.com':'you@example.com').fill('fixture@synthetic.invalid')
  await page.getByPlaceholder('••••••••••••').fill('SyntheticOnly123!');await page.getByRole('checkbox').check()
  await page.getByRole('button',{name:lang==='es'?'Crear cuenta':'Create account',exact:true}).click()
  await page.getByText(lang==='es'?'Revisa tu correo':'Check your email',{exact:false}).waitFor()
  check(intakes===beforeIntakes,'Signup requested never counts as verified')
  await page.waitForFunction(()=>sessionStorage.getItem('pazo_marketing_landing_daily_v1')!==null)
  await page.getByRole('button',{name:'Fixture confirm email'}).click()
  await page.getByPlaceholder(lang==='es'?'Ej: Luna, Bruno, Nube...':'E.g. Luna, Bruno, Cloud...').fill('Synthetic pet')
  await page.getByRole('button',{name:lang==='es'?'Continuar':'Continue',exact:true}).click()
  await page.getByRole('button',{name:lang==='es'?'Crear perfil y entrar':'Create profile and enter',exact:true}).click()
  await page.getByText('Fixture pet saved',{exact:true}).waitFor()
  await page.waitForFunction(()=>localStorage.getItem('pazo_marketing_firstparty_v1')===null)
  check(sql(`SELECT count(*) FROM marketing_private.acquisition WHERE owner_id=${q(owner)}`)==='1','Auth verified exactly once in real SQL')
  check(sql(`SELECT count(*) FROM marketing_private.cohort_snapshot() WHERE first_pet_within_7d>0`)!=='0','First pet derived server-side')
  check(arrivals===beforeArrivals+1&&intakes===beforeIntakes+1,'One challenged landing / verified conversion')
  check(!(await page.evaluate(()=>JSON.stringify({...localStorage,...sessionStorage}))).includes('NEVER_STORE'),'No fbclid or raw URL retained')
  await page.getByRole('button',{name:'Fixture open admin'}).click()
  await page.getByRole('button',{name:lang==='es'?'Campañas':'Campaigns',exact:true}).click()
  await page.getByRole('table').waitFor()
  check(intakes===beforeIntakes+1,'Switching to admin cannot reuse prior account attribution')
  check(await page.getByText(lang==='es'?'No son visitantes únicos':'Not unique visitors',{exact:true}).isVisible(),'Honest arrival semantics')
  check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Page fits mobile viewport')
  await page.screenshot({path:`${out}/${width}-${lang}-marketing.png`,fullPage:true})
  failReport=true;await page.getByRole('button',{name:lang==='es'?'Actualizar métricas':'Refresh metrics'}).click();await page.getByRole('alert').waitFor()
  check(await page.getByRole('button',{name:lang==='es'?'Campañas':'Campaigns',exact:true}).isEnabled(),'Campaign error isolated from navigation')
  failReport=false;delayReport=true;await page.getByRole('button',{name:lang==='es'?'Actualizar métricas':'Refresh metrics'}).click()
  await page.waitForFunction(()=>[...document.querySelectorAll('button')].some(b=>/Actualizar métricas|Refresh metrics/.test(b.textContent)&&b.disabled))
  check(await page.getByRole('button',{name:lang==='es'?'Actualizar métricas':'Refresh metrics'}).isDisabled(),'Loading has disabled refresh')
  await page.getByRole('table').waitFor();await page.getByRole('button',{name:lang==='es'?'Actualizar métricas':'Refresh metrics'}).focus()
  check(await page.evaluate(()=>document.activeElement?.tagName)==='BUTTON','Keyboard focus supported')
  check(errors.length===0,errors.join(','));check(forbidden===0,'No unmocked external transport')
  await context.close()
 }
 console.log(`PASS ${checks} marketing browser E2E checks: actual Auth/onboarding/Edge/PG17/admin, ES/EN mobile/desktop; synthetic email and challenge only; zero hosted writes`)
}finally{await browser.close();await new Promise(r=>server.close(r))}
