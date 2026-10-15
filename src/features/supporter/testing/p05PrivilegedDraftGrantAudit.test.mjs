import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {auditP05PrivilegedSqlDraft as audit} from './p05PrivilegedDraftGrantAudit.mjs'

const FILES=[
 'f16_p05_private_prospective_evidence_v1_DO_NOT_APPLY.sql',
 'f16_p05_inbox_claim_v1_DO_NOT_APPLY.sql',
 'f16_p05_claimed_subscription_inverse_lookup_DO_NOT_APPLY.sql',
 'f16_p05_dispute_event_rpc_DO_NOT_APPLY.sql',
 'f16_p05_dispute_private_ledger_read_DO_NOT_APPLY.sql',
]
function load(name){
 return readFileSync(new URL('../../../../supabase/drafts/'+name,import.meta.url),
  'utf8')
}
function safe(r){
 assert.equal(r.mayApplyHostedSql,false)
 assert.equal(r.mayDeployWorker,false)
 assert.equal(r.mayGrantBenefits,false)
 return r
}
test('all checked-in P05 drafts guarded, never deployment authorization',()=>{
 for(const name of FILES){
  const r=safe(audit(load(name)))
  assert.equal(r.phase,'PASS',name+': '+r.reason)
 }
})
test('remove privileged function revoke -> hard block',()=>{
 for(const name of FILES.slice(1)){
  const original=load(name)
  const updated=original.replace(
   /REVOKE\s+ALL\s+ON\s+FUNCTION[\s\S]*?FROM\s+PUBLIC\s*,\s*anon\s*,\s*authenticated\s*;/i,'')
  assert.notEqual(updated,original,name)
  const r=safe(audit(updated))
  assert.equal(r.phase,'BLOCK',name)
  assert.equal(r.reason,'privileged_function_revoke_missing')
 }
})
test('remove service_role grant -> hard block',()=>{
 for(const name of FILES.slice(1)){
  const original=load(name)
  const updated=original.replace(
   /GRANT\s+EXECUTE\s+ON\s+FUNCTION[\s\S]*?\bTO\s+service_role\s*;/i,'')
  assert.notEqual(updated,original)
  const r=safe(audit(updated))
  assert.equal(r.phase,'BLOCK',name)
  assert.equal(r.reason,'privileged_function_service_grant_missing')
 }
})
test('explicit anon, authenticated or PUBLIC grants are blocked',()=>{
 const original=load(FILES[2])
 for(const audience of ['anon','authenticated','PUBLIC']){
  const mutated=original.replace(/\bCOMMIT\s*;/i,
   'GRANT EXECUTE ON FUNCTION public.f16_p05_draft_resolve_claimed_subscription(text,uuid,text,text) TO '+audience+'; COMMIT;')
  const r=safe(audit(mutated))
  assert.equal(r.phase,'BLOCK')
  assert.equal(r.reason,'client_execute_grant_detected')
 }
})
test('a new public function without its own revoke and grant is denied',()=>{
 const original=load(FILES[3])
 const extra="CREATE FUNCTION public.f16_p05_unsafe_test() "+
  "RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path='' "+
  "AS 'SELECT true';\n"
 const r=safe(audit(original.replace(/\bCOMMIT\s*;/i,extra+'COMMIT;')))
 assert.equal(r.phase,'BLOCK')
 assert.equal(r.reason,'privileged_function_revoke_missing')
})
test('the disposable-only guards cannot be removed',()=>{
 const original=load(FILES[2])
 for(const s of [
  original.replace("'f14_synthetic'","'hosted_database'"),
  original.replace("'f14_admin'","'service_role'"),
  original.replace('BEGIN;',''),
  original.replace('COMMIT;',''),
  original.replace('\\set ON_ERROR_STOP on',''),
 ]){
  const r=safe(audit(s))
  assert.equal(r.phase,'BLOCK')
  assert.equal(r.reason,'disposable_only_guard_missing')
 }
})
test('search_path / security definer hardened; wide ACL changes forbidden',()=>{
 const original=load(FILES[2])
 for(const source of [
  original.replace('SECURITY DEFINER','SECURITY INVOKER'),
  original.replace("SET search_path = ''","SET search_path = public"),
 ]){
  const r=safe(audit(source))
  assert.equal(r.phase,'BLOCK')
  assert.equal(r.reason,'privileged_function_search_path_or_definer_missing')
 }
 const mutated=original.replace('COMMIT;',
  'ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO anon; COMMIT;')
 assert.equal(safe(audit(mutated)).phase,'BLOCK')
})
test('invalid SQL text or unexpected function schema fails closed',()=>{
 for(const source of [undefined,null,'',42,'x'.repeat(250001),
  "BEGIN; CREATE FUNCTION evil.fn() RETURNS void; COMMIT;"]){
  assert.equal(safe(audit(source)).phase,'BLOCK')
 }
})
