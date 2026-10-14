// Static guard only: ensures the lab SQL cannot silently drift from F16 privacy
// and event-type contracts. NOT a PostgreSQL execution or ACL certification.
import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {spawnSync} from 'node:child_process'
import {PAZO_REQUIRED_PAYPAL_EVENTS} from './paypalSandboxWebhookContract.mjs'
const sql=readFileSync('supabase/tests/supporter/f16-payment-inbox-lab-draft.sql','utf8')
const metadata=readFileSync('supabase/tests/supporter/f16-payment-inbox-metadata.sql','utf8')
const scenarios=readFileSync('supabase/tests/supporter/f16-payment-inbox-synthetic.sql','utf8')

test('F16 SQL draft refuses hosted databases and is not a migration',()=>{
 assert.match(sql,/current_database\(\) <> 'f14_synthetic'/)
 assert.match(sql,/session_user <> 'f14_admin'/)
 assert.match(sql,/NOT A DEPLOYABLE MIGRATION/)
 assert.match(sql,/BEGIN;[\s\S]+COMMIT;/)
 assert.equal(sql.includes('supabase.com'),false)
})
test('F16 minimal inbox has strict RLS and no payment/PII columns or grants',()=>{
 assert.match(sql,/CREATE TABLE supporter_private\.paypal_verified_event_inbox/)
 assert.match(sql,/FORCE ROW LEVEL SECURITY/)
 assert.match(sql,/REVOKE ALL ON TABLE supporter_private\.paypal_verified_event_inbox/)
 assert.match(sql,/FROM PUBLIC, anon, authenticated, service_role/)
 assert.doesNotMatch(sql,/\b(?:payer_email|card_number|client_secret|access_token)\s+(?:text|varchar|json|jsonb)/i)
 assert.doesNotMatch(sql,/\b(?:INSERT|UPDATE)\s+(?:INTO\s+)?public\.profiles\b/i)
})
test('F16 service-role RPC is a restricted definer and never credits membership',()=>{
 assert.match(sql,/CREATE FUNCTION public\.f16_paypal_record_verified_event/)
 assert.match(sql,/SECURITY DEFINER[\s\S]*SET search_path = ''/)
 assert.match(sql,/OWNER TO postgres/)
 assert.match(sql,/GRANT EXECUTE ON FUNCTION public\.f16_paypal_record_verified_event\(text,text\)\s+TO service_role;/)
 assert.match(sql,/ON CONFLICT \(provider_event_id\) DO NOTHING/)
 assert.match(sql,/v_existing_type IS DISTINCT FROM p_event_type/)
 assert.doesNotMatch(sql,/UPDATE\s+public\.profiles|ALTER\s+FUNCTION\s+supporter_private\.wall_has_verified_entitlement/i)
})
test('SQL and app webhook core share exactly the required PayPal event types',()=>{
 for(const event of PAZO_REQUIRED_PAYPAL_EVENTS){
  assert.ok(sql.includes("'"+event+"'"),event)
 }
 const types=new Set(Array.from(sql.matchAll(/'(?:PAYMENT\.SALE|BILLING\.SUBSCRIPTION)\.[A-Z.]+?'/g),v=>v[0].slice(1,-1)))
 assert.deepEqual([...types].sort(),[...PAZO_REQUIRED_PAYPAL_EVENTS].sort())
})
test('PG lab-only authorization and stateful-retry tests exist',()=>{
 assert.match(metadata,/FORCE RLS|relforcerowsecurity/)
 assert.match(metadata,/has_function_privilege\('anon'/)
 assert.match(metadata,/has_function_privilege\('service_role'/)
 assert.match(scenarios,/SET LOCAL ROLE anon;/)
 assert.match(scenarios,/SET LOCAL ROLE authenticated;/)
 assert.match(scenarios,/SET LOCAL ROLE service_role;/)
 assert.match(scenarios,/processing_state='quarantined'/)
 assert.match(scenarios,/WH-F16-VALID-001/)
 assert.match(scenarios,/ROLLBACK;/)
})

test('isolated F16 SQL runner fails before invoking psql without CI consent',()=>{
  const runner=readFileSync('scripts/f16-postgres-inbox-lab.sh','utf8')
  assert.match(runner,/GITHUB_ACTIONS/)
  assert.match(runner,/PGPASSWORD/)
  assert.match(runner,/f14_synthetic/)
  assert.match(runner,/127\.0\.0\.1/)
  assert.match(runner,/f16-postgres-inbox-concurrency\.mjs/)
  assert.doesNotMatch(runner,/supabase db push|apply_migration|SUPABASE_ACCESS_TOKEN/i)
  if(process.platform==='win32')return
  const syntax=spawnSync('bash',['-n','scripts/f16-postgres-inbox-lab.sh'],{
    encoding:'utf8',timeout:5000,
  })
  assert.equal(syntax.status,0,syntax.stderr)
  const rejection=spawnSync('bash',['scripts/f16-postgres-inbox-lab.sh'],{
    encoding:'utf8',timeout:5000,
    env:{PATH:process.env.PATH},
  })
  assert.equal(rejection.status,2,rejection.stderr)
  assert.match(rejection.stderr,/BLOCKED/)
})

test('CLI-generated migration keeps exact audited lab DDL and cannot alter supporter entitlement',()=>{
  const migration=readFileSync(
    'supabase/migrations/20261014032018_f16_private_verified_event_inbox.sql','utf8')
  const ddlStart='CREATE TABLE supporter_private.paypal_verified_event_inbox'
  const labBody=sql.slice(sql.indexOf(ddlStart),sql.lastIndexOf('COMMIT;')).trim()
  const migrationBody=migration.slice(migration.indexOf(ddlStart),migration.lastIndexOf('COMMIT;')).trim()
  assert.ok(migration.includes('PREPARED MIGRATION'))
  assert.equal(migrationBody,labBody,'versioned DDL must match PostgreSQL-tested lab DDL')
  assert.doesNotMatch(migration,/\\set ON_ERROR_STOP|f14_synthetic|CURRENT_DATABASE\(\)/i)
  assert.doesNotMatch(migration,/\b(?:UPDATE|INSERT\s+INTO|DELETE\s+FROM)\s+public\.profiles\b/i)
  assert.doesNotMatch(migration,/CREATE\s+TABLE\s+supporter_private\.coverage_periods/i)
  assert.doesNotMatch(migration,/ALTER\s+FUNCTION\s+supporter_private\.wall_has_verified_entitlement/i)
})
