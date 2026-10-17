import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
 LAB_ONLY, PROJECT_REF, EDGE_SECRET_NAME,
 PG_INSERT_SQL, PG_DELETE_SQL, PG_METADATA_SQL,
 buildOfflinePlan, simulateDualStore, projectSecretNameOnly,
} from '../../../../scripts/f16-p42-private-dual-channel.offline.mjs';

const input = { labOnly: LAB_ONLY, t0Utc: '2027-01-20T12:00:00.000Z' };

test('P42 fake dual-channel plan is gated and strictly synthetic', () => {
 assert.throws(() => buildOfflinePlan(input.t0Utc), /OFFLINE_LAB_ONLY/);
 assert.throws(() => buildOfflinePlan({ ...input, labOnly: 'EXECUTE_LIVE' }), /OFFLINE_LAB_ONLY/);
 assert.throws(() => buildOfflinePlan({ t0Utc: input.t0Utc }), /OFFLINE_LAB_ONLY/);
 assert.equal(buildOfflinePlan(input).laboratory, true);
});
test('P42 strict UTC window is exactly 24 hours and finite', () => {
 const p = buildOfflinePlan(input);
 assert.equal(p.t0Utc, input.t0Utc);
 assert.equal(p.tExpUtc, '2027-01-21T12:00:00.000Z');
 assert.equal(Date.parse(p.tExpUtc) - Date.parse(p.t0Utc), 86400000);
 for (const t0Utc of [null, '', '2027-01-20', '2027-01-20T12:00:00Z',
   '2027-02-30T12:00:00.000Z', '2027-01-20T12:00:00.000+00:00']) {
  assert.throws(() => buildOfflinePlan({ labOnly: LAB_ONLY, t0Utc }), /INVALID_SYNTHETIC_UTC_WINDOW/);
 }
});
test('P42 PostgreSQL descriptor binds bytes instead of interpolating secret into SQL', () => {
 const p = buildOfflinePlan(input);
 assert.equal(p.projectRef, PROJECT_REF);
 assert.equal(p.keyId, 'P42_V1');
 assert.equal(p.pgInsert.text, PG_INSERT_SQL);
 assert.equal(p.pgInsert.values.length, 4);
 assert.equal(p.pgInsert.values[0], 'P42_V1');
 assert.ok(Buffer.isBuffer(p.pgInsert.values[1]));
 assert.equal(p.pgInsert.values[1].length, 32);
 assert.equal(p.pgInsert.values[2], p.t0Utc);
 assert.equal(p.pgInsert.values[3], p.tExpUtc);
 assert.match(p.pgInsert.text, /VALUES \(\$1,\$2::bytea,false,\$3::timestamptz,\$4::timestamptz\)/);
 assert.doesNotMatch(p.pgInsert.text, /a7a7a7|decode\(|encode\(|\\x[a-f0-9]{64}/i);
 assert.doesNotMatch(p.pgInsert.text, /ALTER|GRANT|COMMIT|CREATE ROLE|UPDATE.*gate/i);
 assert.ok(!p.pgInsert.text.includes('enabled=true'));
 assert.ok(!p.pgInsert.text.includes('enabled = true'));
 assert.equal(p.pgDelete.text, PG_DELETE_SQL);
 assert.deepEqual(p.pgDelete.values, ['P42_V1']);
 assert.equal(p.pgMetadata.text, PG_METADATA_SQL);
 assert.doesNotMatch(p.pgMetadata.text, /key_bytes|\*/i);
 assert.doesNotMatch(p.pgDelete.text, /key_bytes|\*/i);
});
test('P42 Edge API body uses one exact project and one synthetic name, no argv or env file', () => {
 const p = buildOfflinePlan(input);
 const url = 'https://api.supabase.com/v1/projects/' + PROJECT_REF + '/secrets';
 assert.equal(p.edgeCreate.url, url);
 assert.equal(p.edgeCreate.method, 'POST');
 assert.equal(p.edgeCreate.headers['Content-Type'], 'application/json');
 const body = JSON.parse(p.edgeCreate.body);
 assert.equal(body.length, 1);
 assert.equal(body[0].name, EDGE_SECRET_NAME);
 assert.match(body[0].value, /^[a-f0-9]{64}$/);
 assert.equal(body[0].value, 'a7'.repeat(32));
 assert.equal(p.edgeDelete.method, 'DELETE');
 assert.deepEqual(JSON.parse(p.edgeDelete.body), [EDGE_SECRET_NAME]);
 assert.equal(p.edgeList.method, 'GET');
 assert.equal(p.edgeList.url, url);
 assert.deepEqual(Object.keys(p.edgeCreate.headers), ['Content-Type']);
});
test('P42 no real provider, network or process side effects exist in offline-only module', () => {
 const text = readFileSync(fileURLToPath(new URL('../../../../scripts/f16-p42-private-dual-channel.offline.mjs', import.meta.url)), 'utf8');
 assert.doesNotMatch(text, /\bfetch\s*\(|https\.request\s*\(|spawnSync\s*\(|execSync\s*\(|process\.env\b|randomBytes\s*\(|\bpg\.Client\b/);
 assert.match(text, /const TEST_BYTES = Buffer\.alloc\(32, 0xa7\)/);
 assert.match(text, /OFFLINE_LAB_ONLY_NO_REAL_KEY_OR_PROVIDER/);
});
test('P42 compensated failed PostgreSQL insert with simulated Edge removal', () => {
 assert.deepEqual(simulateDualStore({ labOnly: LAB_ONLY, fail: 'DB_INSERT' }),
  { status: 'BLOCKED_COMPENSATED', edge: false, db: false, compensated: true });
});
test('P42 unknown or unsuccessful compensations fail closed', () => {
 assert.deepEqual(simulateDualStore({ labOnly: LAB_ONLY, fail: 'EDGE_CREATE' }),
  { status: 'BLOCKED_EDGE', edge: false, db: false, compensated: false });
 assert.deepEqual(simulateDualStore({ labOnly: LAB_ONLY, fail: 'EDGE_COMPENSATE' }),
  { status: 'BLOCKED_UNCERTAIN_EDGE', edge: true, db: false, compensated: false });
 assert.deepEqual(simulateDualStore({ labOnly: LAB_ONLY, fail: 'DB_REVOKE' }),
  { status: 'BLOCKED_UNCERTAIN_DB', edge: true, db: true, compensated: false });
 assert.throws(() => simulateDualStore({ labOnly: LAB_ONLY, fail: 'RETRY' }), /UNKNOWN_FAILURE_SCENARIO/);
 assert.throws(() => simulateDualStore({ fail: 'NONE' }), /OFFLINE_LAB_ONLY/);
});
test('P42 synthetic two-store revocation cannot be described as a hosted PASS', () => {
 const p = simulateDualStore({ labOnly: LAB_ONLY });
 assert.deepEqual(p, { status: 'SYNTHETIC_REVOCATION_CANDIDATE_ONLY', edge: false, db: false, compensated: false });
 assert.doesNotMatch(JSON.stringify(p), /PROVIDER_PASS|HOSTED_PASS|MAY_PAY/);
});
test('P42 Edge inventory only exposes presence of exact name, never values', () => {
 const result = projectSecretNameOnly({
  labOnly: LAB_ONLY,
  providerResponse: [{ name: EDGE_SECRET_NAME, value: 'PRIVATE_VALUE_NOT_TO_LOG' },
   { name: 'PAYPAL_SECRET', value: 'ANOTHER_PRIVATE_VALUE_NOT_TO_LOG' }],
 });
 assert.deepEqual(result, { name: EDGE_SECRET_NAME, present: true, actualProviderAccess: false });
 assert.doesNotMatch(JSON.stringify(result), /PRIVATE_VALUE|PAYPAL_SECRET/);
 assert.equal(projectSecretNameOnly({ labOnly: LAB_ONLY, providerResponse: [] }).present, false);
 assert.throws(() => projectSecretNameOnly({ labOnly: LAB_ONLY, providerResponse: {} }), /UNRECOGNIZED_PRIVATE_RESPONSE/);
});
