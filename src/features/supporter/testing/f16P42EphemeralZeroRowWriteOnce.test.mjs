import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {
 acceptedOperatorArguments,staticOnlySqlContract,
} from '../../../../scripts/f16-p42-ephemeral-zero-row-write-once.mjs';

const scriptPath=new URL('../../../../scripts/f16-p42-ephemeral-zero-row-write-once.mjs',import.meta.url);
const sqlPath=new URL('../../../../supabase/queries/f16_p42_ephemeral_zero_row_write_probe_ONCE.sql',import.meta.url);
const src=readFileSync(fileURLToPath(scriptPath),'utf8');
const sql=readFileSync(fileURLToPath(sqlPath),'utf8');

test('P42 write probe requires exact NEW attempt ID and authorization flag',()=>{
 const args=['--execute-approved-write-check','--attempt-id',
   'P42-WRITE-EPHEMERAL-20261017-01','--ca','C:\\local-only\\trusted-ca.crt'];
 assert.equal(acceptedOperatorArguments(args),true);
 for(const bad of [[],['--help'],[...args.slice(0,2),'P43B-EPHEMERAL-20261017-01',...args.slice(3)],
   [...args.slice(0,4),''],['--execute-approved-readonly',...args.slice(1)]])
  assert.equal(acceptedOperatorArguments(bad),false);
});
test('P42 no material, strict role identity, zero-row DML and ROLLBACK',()=>{
 assert.equal(staticOnlySqlContract(sql),true);
 assert.match(sql,/session_user NOT IN \('cli_login_postgres','cli_login_postgres\.mrybvqdebbgcayuvgkkr'\)/);
 assert.match(sql,/current_user <> 'postgres'/);
 assert.match(sql,/current_setting\('transaction_read_only'\) <> 'off'/);
 assert.match(sql,/INSERT INTO supporter_private\.p42_activation_signing_keys/);
 assert.match(sql,/WHERE false[\s\S]+RETURNING key_id/);
 assert.match(sql,/ROLLBACK;[\s\S]+BEGIN TRANSACTION READ ONLY;/);
 assert.match(sql,/count\(\*\) FROM supporter_private\.paypal_payment_entries/);
 assert.doesNotMatch(sql,/gen_random_bytes|random_bytes|decode\(|DELETE FROM|UPDATE supporter_private|RETURNING \*/i);
});
test('P42 rejects adversarial SQL mutation contract',()=>{
 for(const change of [
   sql.replace('WHERE false','WHERE true'),
   sql.replace('ROLLBACK;','COMMIT;'),
   sql.replace('BEGIN TRANSACTION READ ONLY;','BEGIN;'),
   sql+'\nGRANT ALL ON supporter_private.p42_activation_signing_keys TO service_role;',
 ]) assert.equal(staticOnlySqlContract(change),false);
});
test('P42 tool execution is one-shot, isolated, sanitized, and TLS verify-full',()=>{
 assert.match(src,/p42-write-ephemeral-20261017-01\.lock/);
 assert.match(src,/flag:'wx'/);
 assert.match(src,/PGSSLMODE='verify-full'/);
 assert.match(src,/PGGSSENCMODE='disable'/);
 assert.match(src,/PGSSLROOTCERT=ca/);
 assert.match(src,/PGOPTIONS='-c role=postgres -c statement_timeout=15000'/);
 assert.match(src,/--dry-run','--agent','no'/);
 assert.match(src,/SQL_BLOB = 'cdd7bc9033671fea01263d55e05510d7e82a6cdc'/);
 assert.match(src,/P42_EPHEMERAL_ZERO_ROW_WRITE_PASS/);
 assert.match(src,/P42_EDGE_SECRET_WRITE_UNVERIFIED_NO_PROVISIONING_NO_PAYMENT/);
 assert.doesNotMatch(src, /console\.log\(.*(?:login\.stdout|probe\.stderr|PGPASSWORD|parsed\.fields)/);
 assert.doesNotMatch(src,/secrets set|secrets unset|POST \/v1\/projects/i);
});
test('P42 script is inert on test import and never accepts duplicate execution',()=>{
 assert.match(src,/resolve\(process\.argv\[1\]\)===fileURLToPath\(import\.meta\.url\)/);
 assert.match(src,/process\.platform !== 'win32'/);
 assert.match(src,/P42_WRITE_EPHEMERAL_BLOCKED_LOCK_ALREADY_CLAIMED/);
 assert.match(src,/P42_WRITE_EPHEMERAL_BLOCKED_PSQL_OR_POSTFLIGHT/);
});
