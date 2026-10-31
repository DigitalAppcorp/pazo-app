// Imports reset only the explicitly fenced, disposable laboratory, never hosted.
import './admin-visual-pg17.mjs'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {sql,sqlAsync,file,runMockCron} from './marketing-sql-lab.mjs'
const migration=fs.readdirSync('supabase/migrations').find(p=>p.endsWith('_pazo_ads2_campaign_contract.sql'))
const before=sql('SELECT row_to_json(g) FROM marketing_private.collection_gate g')
const history=sql('SELECT coalesce(jsonb_agg(to_jsonb(a) ORDER BY owner_id),\'[]\') FROM marketing_private.acquisition a')
file('supabase/migrations/'+migration)
assert.equal(sql('SELECT row_to_json(g) FROM marketing_private.collection_gate g'),before)
assert.equal(sql('SELECT coalesce(jsonb_agg(to_jsonb(a) ORDER BY owner_id),\'[]\') FROM marketing_private.acquisition a'),history)
for(const report of ['behavior','intelligence'])assert.doesNotThrow(()=>sql(`SET ROLE authenticated;SET "request.jwt.claim.sub"='96000000-0000-4000-8000-000000000031';SET "request.jwt.claims"='{"aal":"aal1"}';SELECT public.pazo_admin_${report}_summary_v1()`))
runMockCron()
const codes=['qr_v2_en','cuidados_v2_en','app_v2_en']
for(const [i,c] of codes.entries()){
 const owner=`16800000-0000-4000-8000-00000000000${i+1}`
 sql(`INSERT INTO auth.users(id,created_at,email_confirmed_at) VALUES('${owner}',now()-interval '1 minute',now());INSERT INTO public.profiles(id) VALUES('${owner}')`)
 assert.equal(sql(`SET ROLE service_role;SELECT public.pazo_marketing_record_landing_v1('${c}')`),'t')
 assert.equal(sql(`SET ROLE service_role;SELECT public.pazo_marketing_prereg_signal_v1('${c}','signup_requested')`),'t')
 const results=await Promise.all(Array.from({length:8},()=>sqlAsync(`SET ROLE service_role;SELECT public.pazo_marketing_record_verified_v1('${owner}','${c}',now()-interval '2 minutes')`)))
 assert.equal(results.filter(v=>v==='t').length,1)
 assert.equal(sql(`SELECT campaign FROM marketing_private.acquisition WHERE owner_id='${owner}'`),'pazo_la_en_202611')
 sql(`INSERT INTO public.pets(id,owner_id,created_at) VALUES('16800000-0000-4000-9000-00000000000${i+1}','${owner}',now());INSERT INTO public.care_items(id,pet_id,title) VALUES(gen_random_uuid(),'16800000-0000-4000-9000-00000000000${i+1}','synthetic')`)
 assert.equal(sql(`SELECT care_created_at IS NOT NULL FROM marketing_private.utility_outcomes WHERE owner_id='${owner}'`),'t')
 sql(`UPDATE auth.users SET raw_app_meta_data='{"pazo_marketing_qa":true}' WHERE id='${owner}'`)
 assert.equal(sql(`SELECT count(*) FROM marketing_private.cohort_snapshot() WHERE creative='${c}'`),'0')
 assert.throws(()=>sql(`UPDATE marketing_private.acquisition SET campaign='pazo_beta_local_202610' WHERE owner_id='${owner}'`))
}
for(const role of ['anon','authenticated','service_role'])assert.throws(()=>sql(`SET ROLE ${role};SELECT * FROM marketing_private.acquisition`))
assert.equal(sql("SELECT bool_and(relrowsecurity AND relforcerowsecurity) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='marketing_private' AND c.relkind='r'"),'t')
console.log(JSON.stringify({status:'PASS',environment:'disposable PG17',campaigns:2,ads2Creatives:3,concurrentDedup:true,historyAndGatesPreserved:true,qaExcluded:true,utility:true,hostedWrites:0}))
