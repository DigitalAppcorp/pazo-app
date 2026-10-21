import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
const root=new URL('../../../../',import.meta.url)
const load=path=>readFileSync(new URL(path,root),'utf8').replaceAll('\r\n','\n')
const migration=load('supabase/migrations/20261021012636_pazo_f16_live_service_json_claims_guard.sql')
const original=load('supabase/tests/supporter/fixtures/f16-live-service-hosted-legacy-guards.sql')
const rollback=load('supabase/rollbacks/f16_live_service_json_claims_guard_REVIEW_REQUIRED.sql')
const old="pg_catalog.current_setting('request.jwt.claim.role',true)"
const modern="(NULLIF(pg_catalog.current_setting('request.jwt.claims',true),'')::jsonb ->> 'role')"
function functions(sql){
 return [...sql.matchAll(/CREATE OR REPLACE FUNCTION public\.(pazo_f16_live_service_\w+)\([\s\S]*?AS \$function\$([\s\S]*?)\$function\$;/g)]
}
test('all 17 hosted business bodies differ exclusively in their trusted JWT role expression',()=>{
 const baseline=functions(original),changed=functions(migration)
 assert.equal(baseline.length,17)
 assert.equal(changed.length,17)
 for(let i=0;i<baseline.length;i++){
  assert.equal(changed[i][1],baseline[i][1])
  assert.equal(baseline[i][0].split(old).length,2)
  assert.equal(changed[i][0],baseline[i][0].replace(old,modern))
  const hash=createHash('md5').update(baseline[i][2]).digest('hex')
  assert.ok(migration.includes("'"+hash+"'"),'hosted source drift guard: '+baseline[i][1])
 }
})
test('rollback restores the exact original hosted bodies without changing financial data contracts',()=>{
 const baseline=functions(original),restored=functions(rollback)
 assert.equal(restored.length,17)
 assert.deepEqual(restored.map(x=>x[0]),baseline.map(x=>x[0]))
 assert.match(rollback,/Rollback source drift/)
})
