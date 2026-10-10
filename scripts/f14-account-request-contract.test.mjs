import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const sql=readFileSync(new URL('../supabase/drafts/20261010_f14_account_request_intake_NOT_APPLIED.sql',import.meta.url),'utf8')
const svc=readFileSync(new URL('../src/features/account/deletionRequestService.ts',import.meta.url),'utf8')
const ui=readFileSync(new URL('../src/features/account/DeletionRequestDialog.tsx',import.meta.url),'utf8')
test('private schema, authenticated-only RPCs, no user-supplied target identifiers',()=>{
 assert.match(sql,/CREATE SCHEMA IF NOT EXISTS account_requests_private/)
 assert.match(sql,/ENABLE ROW LEVEL SECURITY/)
 assert.match(sql,/REVOKE ALL ON SCHEMA account_requests_private FROM PUBLIC, anon, authenticated/)
 assert.match(sql,/subject_user_id uuid PRIMARY KEY/)
 assert.match(sql,/auth.uid\(\)/)
 for(const name of ['pazo_deletion_request','pazo_deletion_status','pazo_deletion_cancel']){
  assert.match(sql,new RegExp('CREATE OR REPLACE FUNCTION public\\.'+name+'\\(\\)'))
  assert.match(sql,new RegExp('GRANT EXECUTE ON FUNCTION public\\.'+name+'\\(\\) TO authenticated'))
  assert.match(svc,new RegExp("'"+name+"'"))
 }
 assert.doesNotMatch(sql,/\\b(?:DELETE FROM|TRUNCATE|DROP TABLE|CASCADE|auth\\.admin\\.deleteUser)\\b/i)
})
test('idempotent request with cancellation only before processing, UI never claims deletion',()=>{
 assert.match(sql,/ON CONFLICT\(subject_user_id\) DO UPDATE/)
 assert.match(sql,/WHERE account_requests_private\.deletion_requests\.status='cancelled'/)
 assert.match(sql,/WHERE subject_user_id=v_uid AND status='requested'/)
 assert.match(ui,/NO borra todavía tu cuenta/)
 assert.match(ui,/Tu cuenta sigue activa hasta que termine el proceso/)
 assert.doesNotMatch(ui,/borrada correctamente|cuenta eliminada con éxito/i)
})
