import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { LAB_ONLY } from '../../../../scripts/f16-p42-private-dual-channel.offline.mjs';
import { runP42PrivateTransportLab } from '../../../../scripts/f16-p42-private-transport-lab.mjs';

const base={labOnly:LAB_ONLY,t0Utc:'2027-02-10T00:00:00.000Z'};
const run=(extra={})=>runP42PrivateTransportLab({...base,...extra});
function clean(result) {
  assert.equal(result.laboratory,true);
  assert.doesNotMatch(JSON.stringify(result),
    /a7a7a7|DO_NOT_LEAK|Bearer|Authorization|PRIVATE_PROVIDER_ERROR|key_bytes|PGPASSWORD|PGHOST/i);
  assert.ok(result.events.every(name=>
    /^(EDGE_(POST|GET|DELETE)|PG_(INSERT_BIND|METADATA_ONLY|DELETE_BIND))$/.test(name)));
}
test('P42 rejects real or malformed execution modes',async()=>{
  for(const args of [{},{labOnly:'REAL'},
    {...base,fault:'REAL'},{...base,operation:'PRODUCTION'},
    {...base,t0Utc:'wrong-date'}])
    await assert.rejects(runP42PrivateTransportLab(args),
      /OFFLINE_LAB_ONLY|INVALID_SYNTHETIC|INVALID_SYNTHETIC_UTC/);
});
test('P42 nominal preparation stores only inert synthetic metadata',async()=>{
  const r=await run(); clean(r);
  assert.equal(r.status,'SYNTHETIC_INERT_PREPARED_ONLY');
  assert.deepEqual(r.events,['EDGE_POST','PG_INSERT_BIND','EDGE_GET','PG_METADATA_ONLY']);
  assert.equal(r.edgePresent,true);assert.equal(r.dbRows,1);assert.equal(r.enabled,false);
});
test('P42 manual cleanup verifies absence in both mocks',async()=>{
  const r=await run({operation:'PREPARE_AND_MANUALLY_REVOKE'});clean(r);
  assert.equal(r.status,'SYNTHETIC_MANUAL_REVOCATION_REHEARSED');
  assert.deepEqual(r.events,['EDGE_POST','PG_INSERT_BIND','EDGE_GET','PG_METADATA_ONLY',
    'EDGE_DELETE','PG_DELETE_BIND','EDGE_GET','PG_METADATA_ONLY']);
  assert.equal(r.edgePresent,false);assert.equal(r.dbRows,0);assert.equal(r.enabled,false);
});
test('P42 rejected PG INSERT compensates Edge exactly once',async()=>{
  const r=await run({fault:'DB_INSERT_REJECT'});clean(r);
  assert.equal(r.status,'BLOCKED_DB_INSERT_EDGE_COMPENSATED');
  assert.deepEqual(r.events,['EDGE_POST','PG_INSERT_BIND','EDGE_DELETE','EDGE_GET']);
  assert.equal(r.edgePresent,false);assert.equal(r.dbRows,0);
});
test('P42 Edge timeout after write never blindly retries or writes DB',async()=>{
  const r=await run({fault:'EDGE_CREATE_TIMEOUT_AFTER_WRITE'});clean(r);
  assert.equal(r.status,'BLOCKED_EDGE_OUTCOME_UNCERTAIN');
  assert.deepEqual(r.events,['EDGE_POST']);assert.equal(r.edgePresent,true);
});
test('P42 DB timeout after write never blindly compensates or retries',async()=>{
  const r=await run({fault:'DB_INSERT_TIMEOUT_AFTER_WRITE'});clean(r);
  assert.equal(r.status,'BLOCKED_DB_OUTCOME_UNCERTAIN');
  assert.deepEqual(r.events,['EDGE_POST','PG_INSERT_BIND']);
  assert.equal(r.dbRows,1);
});
test('P42 POST rejection returns sanitized uncertain state',async()=>{
  const r=await run({fault:'EDGE_CREATE_REJECT'});clean(r);
  assert.equal(r.status,'BLOCKED_EDGE_OUTCOME_UNCERTAIN');
  assert.deepEqual(r.events,['EDGE_POST']);
});
test('P42 rejected compensation leaves uncertainty visible',async()=>{
  const r=await run({fault:'DB_REJECT_COMPENSATION_REJECT'});clean(r);
  assert.equal(r.status,'BLOCKED_EDGE_COMPENSATION_UNCERTAIN');
  assert.deepEqual(r.events,['EDGE_POST','PG_INSERT_BIND','EDGE_DELETE']);
  assert.equal(r.edgePresent,true);
});
test('P42 uncertain Edge revoke does not claim DB removal',async()=>{
  const r=await run({operation:'PREPARE_AND_MANUALLY_REVOKE',
    fault:'EDGE_DELETE_TIMEOUT_AFTER_WRITE'});clean(r);
  assert.equal(r.status,'BLOCKED_EDGE_REVOCATION_UNCERTAIN');
  assert.equal(r.dbRows,1);assert.ok(!r.events.includes('PG_DELETE_BIND'));
});
test('P42 uncertain DB revoke never claims full revocation',async()=>{
  const r=await run({operation:'PREPARE_AND_MANUALLY_REVOKE',
    fault:'DB_DELETE_TIMEOUT_AFTER_WRITE'});clean(r);
  assert.equal(r.status,'BLOCKED_DB_REVOCATION_UNCERTAIN');assert.equal(r.dbRows,0);
});
test('P42 list failure blocks downstream revocation',async()=>{
  const r=await run({operation:'PREPARE_AND_MANUALLY_REVOKE',fault:'EDGE_LIST_REJECT'});
  clean(r);
  assert.equal(r.status,'BLOCKED_POSTFLIGHT_UNCERTAIN');
  assert.ok(!r.events.includes('EDGE_DELETE'));
});
test('P42 harness contains no network, real credentials, CLI, or output logging',()=>{
  const src=readFileSync(fileURLToPath(
    new URL('../../../../scripts/f16-p42-private-transport-lab.mjs',import.meta.url)),'utf8');
  assert.doesNotMatch(src,
    /\bfetch\s*\(|https\.request\s*\(|spawn\s*\(|execSync\s*\(|process\.env\b|randomBytes\s*\(|console\.(log|error|warn)\s*\(|\bpg\.Client\b/);
  assert.match(src,/P42_OFFLINE_LAB_ONLY_NO_PROVIDER/);
});
