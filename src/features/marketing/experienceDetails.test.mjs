import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {createMarketingLandingHandler} from '../../../supabase/functions/pazo-marketing-landing/landingCore.mjs'
import {createExperienceDetailSubmit} from '../../../supabase/functions/pazo-marketing-landing/landingAdapter.mjs'
import {EXPERIENCE_DETAILS,classifyArrival,signupFailureFromCode,validExperienceDetail} from '../../../supabase/functions/_shared/experienceDetails.mjs'

const tag={utm_source:'meta',utm_medium:'paid_social',utm_campaign:'pazo_la_en_202611',utm_content:'qr_v2_en'}
const request=(body,extra={})=>new Request('https://isolated.invalid',{method:'POST',headers:{origin:'https://pazo-app.vercel.app','content-type':'application/json','x-pazo-challenge':'single-use',...extra},body:JSON.stringify(body)})
const handler=(over={})=>{const calls=[];return {calls,h:createMarketingLandingHandler({released:true,submit:async()=>true,verifyChallenge:async()=>true,experienceDetailsReleased:true,submitExperienceDetail:async(...a)=>{calls.push(a);return true},...over})}}

test('notice and Edge are released; build flag and SQL gate stay independent',()=>{
 assert.match(fs.readFileSync('supabase/functions/pazo-marketing-landing/index.ts','utf8'),/INTELLIGENCE_EXPERIENCE_DETAILS_RELEASED=true/)
 assert.match(fs.readFileSync('src/features/legal/legalCopy.ts','utf8'),/EXPERIENCE_DETAILS_NOTICE_RELEASED=true/)
 assert.match(fs.readFileSync('src/features/marketing/experienceDetails.ts','utf8'),/VITE_PAZO_EXPERIENCE_DETAILS_ENABLED==='true'/)
 assert.match(fs.readFileSync('supabase/migrations/20261102130000_pazo_experience_details.sql','utf8'),/experience_details_enabled boolean NOT NULL DEFAULT false/)
})
test('browser and database share the same closed vocabulary',()=>{
 const sql=fs.readFileSync('supabase/migrations/20261106120000_pazo_signup_funnel.sql','utf8')
 for(const [kind,values]of Object.entries(EXPERIENCE_DETAILS))assert.ok(sql.includes(`WHEN '${kind}' THEN p_value=ANY(ARRAY[${values.map(v=>`'${v}'`).join(',')}])`),kind)
})
test('referrer is reduced to a category and never leaves as text',()=>{
 const own='pazo-app.vercel.app'
 assert.equal(classifyArrival('https://www.google.com/search?q=mi+perro',own),'search')
 assert.equal(classifyArrival('https://l.instagram.com/?u=x',own),'social')
 assert.equal(classifyArrival('https://t.co/abc',own),'social')
 assert.equal(classifyArrival('',own),'direct')
 assert.equal(classifyArrival('https://blog.example.com/nota',own),'other')
 assert.equal(classifyArrival('not a url',own),'other')
 assert.equal(classifyArrival('https://pazo-app.vercel.app/x',own),null)
 assert.equal(classifyArrival('https://www.google.com',own,true),'installed')
 assert.equal(classifyArrival('https://fakegoogle.com',own),'other')
 const source=fs.readFileSync('src/features/marketing/experienceDetails.ts','utf8')
 assert.doesNotMatch(source,/randomUUID|cookie|fbclid|userAgent|localStorage/)
 assert.doesNotMatch(source,/detail_value:document\.referrer|email|password/)
})
test('provider codes map to closed reasons, never raw text',()=>{
 assert.equal(signupFailureFromCode('user_already_exists'),'email_taken')
 assert.equal(signupFailureFromCode('weak_password'),'weak_password')
 assert.equal(signupFailureFromCode('over_email_send_rate_limit'),'rate_limited')
 assert.equal(signupFailureFromCode('anything else'),'other')
 assert.equal(signupFailureFromCode(null),'other')
 assert.ok(validExperienceDetail('signup_failure',signupFailureFromCode('x')))
})
test('edge OFF refuses details and contacts nothing',async()=>{
 const {h,calls}=handler({experienceDetailsReleased:false})
 assert.equal((await h(request({detail_kind:'signup_failure',detail_value:'age_required'}))).status,503)
 assert.deepEqual(calls,[])
})
test('edge ON accepts closed categories, with or without a validated ad',async()=>{
 const {h,calls}=handler()
 assert.equal((await h(request({detail_kind:'signup_failure',detail_value:'unconfirmed_login'}))).status,202)
 assert.equal((await h(request({detail_kind:'demo_last_screen',detail_value:'pet',...tag}))).status,202)
 assert.deepEqual(calls,[['signup_failure','unconfirmed_login',''],['demo_last_screen','pet','qr_v2_en']])
})
for(const [name,body]of Object.entries({
 'free text value':{detail_kind:'signup_failure',detail_value:'mi correo es a@b.c'},
 'value of another kind':{detail_kind:'arrival_source',detail_value:'pet'},
 'unknown kind':{detail_kind:'email',detail_value:'other'},
 'extra field':{detail_kind:'arrival_source',detail_value:'search',referrer:'https://x'},
 'forged ad':{detail_kind:'demo_last_screen',detail_value:'pet',...tag,utm_content:'hack'},
 'partial ad':{detail_kind:'demo_last_screen',detail_value:'pet',utm_content:'qr_v2_en'},
}))test('edge rejects '+name,async()=>{const {h,calls}=handler();assert.equal((await h(request(body))).status,400);assert.deepEqual(calls,[])})
test('GPC and a failed challenge block details',async()=>{
 const {h,calls}=handler();assert.equal((await h(request({detail_kind:'arrival_source',detail_value:'search'},{'sec-gpc':'1'}))).status,400)
 const denied=handler({verifyChallenge:async()=>false});assert.equal((await denied.h(request({detail_kind:'arrival_source',detail_value:'search'}))).status,403)
 assert.deepEqual([...calls,...denied.calls],[])
})
test('server bridge fixes project and exact RPC contract',async()=>{
 const url='https://mrybvqdebbgcayuvgkkr.supabase.co',calls=[]
 assert.throws(()=>createExperienceDetailSubmit({url:'https://wrong.invalid',serviceKey:'synthetic_service_only'}))
 const send=createExperienceDetailSubmit({url,serviceKey:'synthetic_service_only',fetchImpl:async(...a)=>{calls.push(a);return new Response('true',{status:200})}})
 assert.equal(await send('demo_last_screen','pet',''),true)
 assert.equal(calls[0][0],url+'/rest/v1/rpc/pazo_experience_detail_v1')
 assert.deepEqual(JSON.parse(calls[0][1].body),{p_kind:'demo_last_screen',p_value:'pet',p_creative:''})
})
