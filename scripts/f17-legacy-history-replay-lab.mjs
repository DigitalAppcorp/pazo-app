// PAZO F17 - isolated, throwaway PostgreSQL 17 forensic replay of eight historical local-only migrations.
// This intentionally DOES NOT contact Supabase and DOES NOT certify 130-migration full restoration.
import assert from 'node:assert/strict'
import {execFileSync} from 'node:child_process'
import {readFileSync} from 'node:fs'

const expected={
  CI:'true',
  PAZO_F17_SYNTHETIC_REPLAY:'yes',
  PGHOST:'127.0.0.1',
  PGPORT:'55441',
  PGDATABASE:'f14_synthetic',
  PGUSER:'f14_admin',
}
for(const [k,v] of Object.entries(expected)){
  assert.equal(process.env[k],v,'FAIL CLOSED: non-isolated connection environment '+k)
}
const names=[
  '20261005101300_feed_like_save_integrity',
  '20261005110000_post_comments_source_of_truth',
  '20261005114500_pet_registration_editing',
  '20261005123000_security_stabilization',
  '20261005134000_prevent_same_owner_follows',
  '20261005150000_rescue_passport_alerts',
  '20261005154500_sighting_contact_details',
  '20261005165500_feed_scroll_pagination',
]
const psql=(args)=>execFileSync('psql',[
  '-X','-h','127.0.0.1','-p','55441','-U','f14_admin','-d','f14_synthetic',
  '-v','ON_ERROR_STOP=1',...args
],{encoding:'utf8',timeout:90_000,maxBuffer:12*1024*1024,stdio:['ignore','pipe','pipe']})
// Verify destination server metadata before a single SQL file is executed.
const meta=psql(['-Atq','-c',"select current_database()||'|'||session_user||'|'||(current_setting('server_version_num')::int between 170000 and 179999)"])
assert.equal(meta.trim(),'f14_synthetic|f14_admin|true','FAIL CLOSED: server identity mismatch')
for(const name of names){
  const file=new URL('../supabase/migrations/'+name+'.sql',import.meta.url)
  const source=readFileSync(file,'utf8')
  assert.match(source,/^BEGIN;\s/,'historical source transaction required: '+name)
  assert.match(source,/\bCOMMIT;\s*$/,'historical source commit required: '+name)
  // Guard against potential external extension calls from a historical revision.
  assert.doesNotMatch(source,/\b(?:dblink|http_get|http_post|net\.http_|cron\.schedule|copy\s+.*\bprogram)\b/i,
    'network/host side-effect pattern in '+name)
  try{
    psql(['-c','SET ROLE postgres;','-f',new URL(file).pathname])
    console.log('F17_LEGACY_LOCAL_SQL_ISOLATED_REPLAY_PASS '+name)
  }catch(error){
    console.error('F17_LEGACY_LOCAL_SQL_ISOLATED_REPLAY_BLOCKED '+name)
    if(error.stderr)console.error(String(error.stderr).slice(-2500))
    process.exitCode=1
    break
  }
}
if(!process.exitCode){
  const checks=psql(['-Atq','-c',[
    "select",
    "(to_regclass('public.post_comments') is not null),",
    "(to_regclass('public.pet_private_details') is not null),",
    "(to_regclass('public.lost_pet_alerts') is not null),",
    "(to_regprocedure('public.register_interaction_signal(uuid,uuid,text)') is not null or exists(select 1 from pg_proc where proname='register_interaction_signal'))"
  ].join(' ')])
  assert.equal(checks.trim(),'t|t|t|t','key catalog objects missing after isolated replay')
  console.log('F17_EIGHT_LEGACY_SQL_DISPOSABLE_PG17_PASS_NOT_FULL_REPLAY_NOT_PRODUCTION')
}
